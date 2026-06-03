require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const TOKENS_FILE          = path.join(__dirname, 'tokens.json');
const WITHINGS_TOKENS_FILE = path.join(__dirname, 'withings_tokens.json');
const AI_CACHE_FILE        = path.join(__dirname, 'ai_cache.json');
const APPLE_HEALTH_FILE    = path.join(__dirname, 'apple_health.json');
const ACTIVITIES_FILE      = path.join(__dirname, 'activities.json');
const GOALS_FILE           = path.join(__dirname, 'goals.json');
const STRAVA_API_BASE      = 'https://www.strava.com/api/v3'; // Nota: Cambiar a 'https://www.api-v3.strava.com' antes del 1 de junio de 2027


// ---------------------------
// CONSTANTES GLOBALES DE RENDIMIENTO (PMC)
// Calculadas una sola vez al arranque en lugar de en cada petición
// ---------------------------
const CTL_DECAY = Math.exp(-1 / 42);
const ATL_DECAY = Math.exp(-1 / 7);

// ---------------------------
// UTILIDADES DE CONVERSIÓN
// ---------------------------
const metersToKm = (meters) => (meters / 1000).toFixed(2);
const secondsToHhMmSs = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
const getDailyWithingsActivities = (activities) => {
    if (!activities || !Array.isArray(activities)) return [];
    const grouped = {};
    for (const act of activities) {
        const date = act.date;
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(act);
    }
    const dailyList = [];
    for (const date of Object.keys(grouped)) {
        const group = grouped[date];
        group.sort((a, b) => {
            const aIsTracker = a.is_tracker === true || a.is_tracker === 1 || !!a.is_tracker;
            const bIsTracker = b.is_tracker === true || b.is_tracker === 1 || !!b.is_tracker;
            if (aIsTracker && !bIsTracker) return -1;
            if (!aIsTracker && bIsTracker) return 1;
            return (b.steps || 0) - (a.steps || 0);
        });
        dailyList.push(group[0]);
    }
    return dailyList;
};
const formatPace = (speedMs) => {
    if (!speedMs || speedMs === 0) return '0:00';
    const paceSecondsPerKm = 1000 / speedMs;
    const mins = Math.floor(paceSecondsPerKm / 60);
    const secs = Math.floor(paceSecondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
const formatSpeed = (speedMs) => (speedMs * 3.6).toFixed(1);

// ---------------------------
// MAPA DE TIPOS DE ACTIVIDAD (Fuente de verdad única)
// ---------------------------
const ACTIVITY_TYPE_MAP = {
    // Ciclismo exterior
    'Ride':             'Ciclismo',
    'GravelRide':       'Ciclismo',
    'MountainBikeRide': 'Ciclismo',
    'EBikeRide':        'Ciclismo',
    // Ciclo Indoor
    'VirtualRide':      'Ciclo Indoor',
    'IndoorCycling':    'Ciclo Indoor',
    // Running
    'Run':              'Running',
    'TrailRun':         'Running',
    'VirtualRun':       'Running',
    // Andar
    'Walk':             'Andar',
    'Hike':             'Andar',
    // Pesas / Gym
    'WeightTraining':   'Pesas',
    'Weights':          'Pesas',
    'weight_training':  'Pesas',
    'Crossfit':         'Pesas',
    'StairStepper':     'Pesas',
    'Elliptical':       'Pesas',
    'RockClimbing':     'Pesas',
    // Estiramientos
    'Workout':          'Estiramientos',
    'Yoga':             'Estiramientos',
    'Pilates':          'Estiramientos',
    'Stretching':       'Estiramientos',
    // Natación
    'Swim':             'Natación',
    'OpenWaterSwim':    'Natación',
};

const CYCLING_TYPES  = new Set(['Ride','VirtualRide','GravelRide','MountainBikeRide','EBikeRide','IndoorCycling']);
const RUNNING_TYPES  = new Set(['Run','TrailRun','VirtualRun']);

const TRACKED_ACTIVITIES = ['Ciclismo','Ciclo Indoor','Running','Andar','Pesas','Estiramientos','Natación'];

// Helpers de tipo unificados (fuente de verdad única, eliminan las redefiniciones locales)
const isCyclingActivity   = (act) => CYCLING_TYPES.has(act.sport_type || act.type || '');
const isRunningActivity   = (act) => RUNNING_TYPES.has(act.sport_type || act.type || '');
const isIndoorCyclingAct  = (act) => {
    const t = act.sport_type || act.type || '';
    const name = (act.name || '').toLowerCase();
    return t === 'VirtualRide' || t === 'IndoorCycling' || act.trainer === true || act.indoor === true ||
           name.includes('indoor') || name.includes('cicloindoor') || name.includes('rodillo');
};

// ---------------------------
// GESTIÓN DE TOKENS EN MEMORIA
// Cargamos una sola vez al arranque; no volvemos a leer el disco por request
// ---------------------------
let _stravaTokens   = null;
let _withingsTokens = null;

try { _stravaTokens   = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')); } catch {}
try { _withingsTokens = JSON.parse(fs.readFileSync(WITHINGS_TOKENS_FILE, 'utf8')); } catch {}

function getTokens() { return _stravaTokens; }
function saveTokens(tokens) {
    _stravaTokens = tokens;
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}
function getWithingsTokens() { return _withingsTokens; }
function saveWithingsTokens(tokens) {
    _withingsTokens = tokens;
    fs.writeFileSync(WITHINGS_TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

async function getValidAccessToken() {
    let tokens = getTokens();
    if (!tokens || !tokens.refresh_token) throw new Error('NO_TOKEN');
    const now = Math.floor(Date.now() / 1000);
    if (now >= tokens.expires_at - 300) {
        try {
            const response = await axios.post('https://www.strava.com/oauth/token', null, {
                params: {
                    client_id:     process.env.STRAVA_CLIENT_ID,
                    client_secret: process.env.STRAVA_CLIENT_SECRET,
                    grant_type:    'refresh_token',
                    refresh_token: tokens.refresh_token
                }
            });
            tokens = {
                access_token:  response.data.access_token,
                refresh_token: response.data.refresh_token,
                expires_at:    response.data.expires_at
            };
            saveTokens(tokens);
        } catch {
            throw new Error('TOKEN_REFRESH_FAILED');
        }
    }
    return tokens.access_token;
}

async function getWithingsValidAccessToken() {
    let tokens = getWithingsTokens();
    if (!tokens || !tokens.refresh_token) throw new Error('NO_WITHINGS_TOKEN');
    const now = Math.floor(Date.now() / 1000);
    if (now >= tokens.expires_at - 300) {
        try {
            console.log('[Withings] Refreshing access token...');
            const response = await axios.post(
                'https://wbsapi.withings.net/v2/oauth2',
                new URLSearchParams({
                    action:        'requesttoken',
                    grant_type:    'refresh_token',
                    client_id:     process.env.WITHINGS_CLIENT_ID,
                    client_secret: process.env.WITHINGS_CLIENT_SECRET,
                    refresh_token: tokens.refresh_token
                }).toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            if (response.data && response.data.status === 0 && response.data.body) {
                const body = response.data.body;
                tokens = {
                    access_token:  body.access_token,
                    refresh_token: body.refresh_token,
                    expires_at:    Math.floor(Date.now() / 1000) + body.expires_in,
                    userid:        body.userid
                };
                saveWithingsTokens(tokens);
            } else {
                throw new Error(response.data?.error || 'WITHINGS_REFRESH_API_ERROR');
            }
        } catch (error) {
            console.error('[Withings] Error refreshing token:', error.response?.data || error.message);
            throw new Error('WITHINGS_TOKEN_REFRESH_FAILED');
        }
    }
    return tokens.access_token;
}

// ---------------------------
// CACHÉ DE WITHINGS EN MEMORIA
// Evita peticiones duplicadas cuando /api/fitness y /api/recovery se llaman casi simultáneamente
// ---------------------------
const WITHINGS_CACHE     = new Map();
const WITHINGS_CACHE_TTL = 30 * 60 * 1000; // 30 min

async function getCachedWithingsSleep(token, startdateymd, enddateymd) {
    const key = `sleep_${startdateymd}_${enddateymd}`;
    const cached = WITHINGS_CACHE.get(key);
    if (cached && Date.now() - cached.ts < WITHINGS_CACHE_TTL) return cached.data;
    const response = await axios.post(
        'https://wbsapi.withings.net/v2/sleep',
        new URLSearchParams({ action: 'getsummary', startdateymd, enddateymd }).toString(),
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const data = (response.data && response.data.status === 0 && response.data.body)
        ? response.data.body.series || []
        : [];
    WITHINGS_CACHE.set(key, { data, ts: Date.now() });
    return data;
}

async function getCachedWithingsActivity(token, startdateymd, enddateymd) {
    const key = `activity_${startdateymd}_${enddateymd}`;
    const cached = WITHINGS_CACHE.get(key);
    if (cached && Date.now() - cached.ts < WITHINGS_CACHE_TTL) return cached.data;
    const data = await fetchWithingsActivity(token, startdateymd, enddateymd);
    WITHINGS_CACHE.set(key, { data, ts: Date.now() });
    return data;
}

async function getCachedWithingsMeasures(token, startdate, enddate) {
    const key = `measures_${startdate}_${enddate}`;
    const cached = WITHINGS_CACHE.get(key);
    if (cached && Date.now() - cached.ts < WITHINGS_CACHE_TTL) return cached.data;
    const response = await axios.post(
        'https://wbsapi.withings.net/measure',
        new URLSearchParams({ action: 'getmeas', startdate, enddate }).toString(),
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const data = (response.data && response.data.status === 0 && response.data.body)
        ? response.data.body.measuregrps || []
        : [];
    WITHINGS_CACHE.set(key, { data, ts: Date.now() });
    return data;
}

async function fetchWithingsActivity(accessToken, startdateymd, enddateymd) {
    try {
        console.log(`[Withings] Fetching activity from ${startdateymd} to ${enddateymd}...`);
        const response = await axios.post(
            'https://wbsapi.withings.net/v2/measure',
            new URLSearchParams({ action: 'getactivity', startdateymd, enddateymd }).toString(),
            { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        if (response.data && response.data.status === 0 && response.data.body) {
            return response.data.body.activities || [];
        }
        console.warn('[Withings] Activity API non-zero status or empty body:', response.data);
        return [];
    } catch (e) {
        console.error('[Withings] Error fetching activity:', e.response?.data || e.message);
        return [];
    }
}

// ---------------------------
// GESTIÓN DE APPLE HEALTH (Persistencia local e historial con forward-fill)
// ---------------------------
function getAppleHealthHistory(daysBack = 30) {
    let appleData = {};
    try { appleData = JSON.parse(fs.readFileSync(APPLE_HEALTH_FILE, 'utf8')); } catch {}
    
    const history = [];
    const today = new Date();
    for (let i = daysBack - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const entry = appleData[dateStr] || {};
        history.push({
            date: dateStr,
            weight: entry.weight !== undefined && entry.weight !== null ? Number(entry.weight) : null,
            bodyFat: entry.bodyFat !== undefined && entry.bodyFat !== null ? Number(entry.bodyFat) : null,
            restingHeartRate: entry.restingHeartRate !== undefined && entry.restingHeartRate !== null ? Number(entry.restingHeartRate) : null,
            hrv: entry.hrv !== undefined && entry.hrv !== null ? Number(entry.hrv) : null,
            sleepDurationHours: entry.sleepDurationHours !== undefined && entry.sleepDurationHours !== null ? Number(entry.sleepDurationHours) : null,
            sleepScore: entry.sleepScore !== undefined && entry.sleepScore !== null ? Number(entry.sleepScore) : null,
            steps: entry.steps !== undefined && entry.steps !== null ? Number(entry.steps) : null,
            activeCalories: entry.activeCalories !== undefined && entry.activeCalories !== null ? Number(entry.activeCalories) : null,
            vo2max: entry.vo2max !== undefined && entry.vo2max !== null ? Number(entry.vo2max) : null,
            systolic: entry.systolic !== undefined && entry.systolic !== null ? Number(entry.systolic) : null,
            diastolic: entry.diastolic !== undefined && entry.diastolic !== null ? Number(entry.diastolic) : null,
            waterMetricLiters: entry.waterMetricLiters !== undefined && entry.waterMetricLiters !== null ? Number(entry.waterMetricLiters) : null
        });
    }
    return history;
}

function getFilledAppleHistory(daysBack = 30) {
    const history = getAppleHealthHistory(daysBack);
    
    const keys = [
        'weight', 'bodyFat', 'restingHeartRate', 'hrv', 'sleepDurationHours', 
        'sleepScore', 'steps', 'activeCalories', 'vo2max', 'systolic', 'diastolic', 'waterMetricLiters'
    ];
    
    const defaults = {
        weight: 75.2, bodyFat: 15.5, restingHeartRate: 55, hrv: 58, sleepDurationHours: 7.2, sleepScore: 75,
        steps: 8000, activeCalories: 300, vo2max: 48.0, systolic: 115, diastolic: 75, waterMetricLiters: 2.0
    };
    
    let lastSeen = { ...defaults };
    
    // Inicializar backward-fill con el primer elemento no nulo disponible para cada clave
    for (const key of keys) {
        const firstNonNull = history.find(h => h[key] !== null);
        if (firstNonNull) {
            lastSeen[key] = firstNonNull[key];
        }
    }
    
    // Forward-fill a lo largo del historial
    return history.map(h => {
        const row = { date: h.date };
        for (const key of keys) {
            if (h[key] !== null) {
                lastSeen[key] = h[key];
            }
            row[key] = lastSeen[key];
        }
        return row;
    });
}


// ---------------------------
// CACHÉ DE IA EN MEMORIA
// Cargamos el JSON una sola vez al arranque; guardamos de forma asíncrona
// ---------------------------
let aiCacheInMemory = {};
try { aiCacheInMemory = JSON.parse(fs.readFileSync(AI_CACHE_FILE, 'utf8')); } catch {}

function getAiCached(key) {
    const entry = aiCacheInMemory[key];
    if (entry && Date.now() - entry.ts < 30 * 24 * 60 * 60 * 1000) return entry.data;
    return null;
}

async function setAiCached(key, data) {
    aiCacheInMemory[key] = { data, ts: Date.now() };
    try {
        await fs.promises.writeFile(AI_CACHE_FILE, JSON.stringify(aiCacheInMemory));
    } catch (e) {
        console.error('Error writing ai_cache.json', e);
    }
}

async function callGeminiWithFallback(contents, modelOverride = null) {
    const models = [];
    if (modelOverride) models.push(modelOverride);
    else if (process.env.GEMINI_MODEL) models.push(process.env.GEMINI_MODEL);

    models.push('gemini-2.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro');

    const formattedContents = typeof contents === 'string'
        ? [{ role: 'user', parts: [{ text: contents }] }]
        : contents;

    let lastError = null;
    for (const model of models) {
        try {
            console.log(`[Gemini-Resilient] Intentando llamada con modelo: ${model}...`);
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
                { contents: formattedContents },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
            );
            if (response.data && response.data.candidates && response.data.candidates[0].content) {
                const text = response.data.candidates[0].content.parts[0].text;
                console.log(`[Gemini-Resilient] Éxito con el modelo: ${model}`);
                return { text, model };
            }
        } catch (err) {
            lastError = err;
            const status  = err.response?.status;
            const errMsg  = err.response?.data?.error?.message || err.message;
            console.warn(`[Gemini-Resilient] El modelo ${model} falló (Status ${status}): ${errMsg}`);
            if (status === 400 && errMsg.includes('API key')) break;
        }
    }
    throw lastError || new Error('Todos los modelos de Gemini fallaron');
}

// ---------------------------
// AUTENTICACIÓN — STRAVA
// ---------------------------
app.get('/api/auth/login', (req, res) => {
    const scope   = 'activity:read_all';
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${process.env.STRAVA_REDIRECT_URI}&approval_prompt=force&scope=${scope}`;
    res.redirect(authUrl);
});

app.get('/api/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('No se proporcionó código');
    try {
        const response = await axios.post('https://www.strava.com/oauth/token', null, {
            params: {
                client_id:     process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code'
            }
        });
        saveTokens({
            access_token:  response.data.access_token,
            refresh_token: response.data.refresh_token,
            expires_at:    response.data.expires_at
        });
        res.redirect(process.env.FRONTEND_URL || '/');
    } catch {
        res.status(500).send('Error durante la autenticación con Strava');
    }
});

app.get('/api/auth/status', async (req, res) => {
    try { await getValidAccessToken(); res.json({ authenticated: true }); }
    catch { res.json({ authenticated: false }); }
});

// ---------------------------
// AUTENTICACIÓN — WITHINGS
// ---------------------------
app.get('/api/withings/auth/login', (req, res) => {
    if (!process.env.WITHINGS_CLIENT_ID) {
        return res.status(400).send('Withings API no está configurada en este servidor. Por favor, define WITHINGS_CLIENT_ID en el archivo .env.');
    }
    const state   = Math.random().toString(36).substring(2, 15);
    const scope   = 'user.metrics,user.activity';
    const authUrl = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${process.env.WITHINGS_CLIENT_ID}&state=${state}&scope=${scope}&redirect_uri=${process.env.WITHINGS_REDIRECT_URI}`;
    res.redirect(authUrl);
});

app.get('/api/withings/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('No se proporcionó código de Withings');
    try {
        console.log('[Withings] Requesting token with authorization code...');
        const response = await axios.post(
            'https://wbsapi.withings.net/v2/oauth2',
            new URLSearchParams({
                action:        'requesttoken',
                grant_type:    'authorization_code',
                client_id:     process.env.WITHINGS_CLIENT_ID,
                client_secret: process.env.WITHINGS_CLIENT_SECRET,
                code,
                redirect_uri:  process.env.WITHINGS_REDIRECT_URI
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        if (response.data && response.data.status === 0 && response.data.body) {
            const body = response.data.body;
            saveWithingsTokens({
                access_token:  body.access_token,
                refresh_token: body.refresh_token,
                expires_at:    Math.floor(Date.now() / 1000) + body.expires_in,
                userid:        body.userid
            });
            res.redirect(process.env.FRONTEND_URL || '/');
        } else {
            console.error('[Withings] Auth API failed:', response.data);
            res.status(500).send('Error de Withings API: ' + (response.data?.error || 'status no cero'));
        }
    } catch (error) {
        console.error('[Withings] Error during authentication callback:', error.response?.data || error.message);
        res.status(500).send('Error durante la autenticación con Withings');
    }
});

app.get('/api/withings/auth/status', async (req, res) => {
    try { await getWithingsValidAccessToken(); res.json({ authenticated: true }); }
    catch { res.json({ authenticated: false }); }
});

// ---------------------------
// HELPER: Resolver tipo de actividad (fuente de verdad única)
// ---------------------------
function resolveTypeForMap(act) {
    const baseType = act.sport_type || act.type || '';
    const name     = (act.name || '').toLowerCase();
    const isIndoor = baseType === 'VirtualRide' || baseType === 'IndoorCycling' ||
                     act.trainer === true || act.indoor === true ||
                     name.includes('indoor') || name.includes('cicloindoor') || name.includes('rodillo');

    if (isIndoor && (baseType === 'Ride' || baseType === 'EBikeRide' || baseType === 'VirtualRide' || baseType === 'IndoorCycling')) {
        return 'Ciclo Indoor';
    }
    return ACTIVITY_TYPE_MAP[act.sport_type] || ACTIVITY_TYPE_MAP[act.type] || null;
}

function isPassiveRecoveryActivity(act) {
    const actLabel  = resolveTypeForMap(act);
    const nameLower = (act.name || '').toLowerCase();
    return actLabel === 'Estiramientos' ||
           nameLower.includes('sauna')             ||
           nameLower.includes('estiramiento')      ||
           nameLower.includes('yoga')              ||
           nameLower.includes('pilates')           ||
           nameLower.includes('stretching')        ||
           nameLower.includes('recuperacion pasiva') ||
           nameLower.includes('recuperación pasiva');
}

function categorizeActivity(act) {
    const label = resolveTypeForMap(act);
    if (['Running', 'Ciclismo', 'Andar'].includes(label)) return 'Endurance';
    if (['Ciclo Indoor', 'Pesas', 'Estiramientos'].includes(label)) return 'Indoor/Gym';
    if (label === 'Natación') return 'Natación';
    return 'Otras';
}

function processActivity(act) {
    const category = categorizeActivity(act);
    const label    = resolveTypeForMap(act);
    let extraMetrics = {};
    if (category === 'Endurance') {
        extraMetrics = {
            distanceKm:      metersToKm(act.distance),
            durationFormated: secondsToHhMmSs(act.moving_time),
            paceOrSpeed:     label === 'Ciclismo' || label === 'Ciclo Indoor'
                ? `${formatSpeed(act.average_speed)} km/h`
                : `${formatPace(act.average_speed)} /km`
        };
    } else if (category === 'Indoor/Gym') {  // CORREGIDO: era 'Indoor', nunca matcheaba
        extraMetrics = {
            durationFormated: secondsToHhMmSs(act.moving_time),
            avgHr: act.has_heartrate ? act.average_heartrate : 0,
            maxHr: act.has_heartrate ? act.max_heartrate : 0
        };
    } else if (category === 'Natación') {
        extraMetrics = {
            totalMeters:     act.distance,
            durationFormated: secondsToHhMmSs(act.moving_time),
            timePer100m:     formatPace(act.average_speed)
        };
    }
    return {
        ...act,
        category,
        extraMetrics,
        suffer_score: act.suffer_score || (act.has_heartrate ? (act.average_heartrate > 140 ? 50 : 20) : 15)
    };
}

// ---------------------------
// CACHÉ EN MEMORIA (evita superar el rate limit de Strava: 100 req/15min)
// ---------------------------
const CACHE        = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

function getCached(key) {
    const e = CACHE[key];
    if (e && Date.now() - e.ts < CACHE_TTL_MS) return e.data;
    return null;
}
function setCache(key, data) { CACHE[key] = { data, ts: Date.now() }; }

// ---------------------------
// GESTIÓN DE ACTIVIDADES (persistencia en archivo)
// ---------------------------
function loadActivitiesFromFile() {
    try { return JSON.parse(fs.readFileSync(ACTIVITIES_FILE, 'utf8')); } catch { return []; }
}
function saveActivitiesToFile(acts) {
    try { fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(acts, null, 2)); }
    catch (e) { console.error('Error writing activities.json', e); }
}

function findCachedActivity(id) {
    const numId     = Number(id);
    const cachedActs = loadActivitiesFromFile();
    const found     = cachedActs.find(a => Number(a.id) === numId);
    if (found) return found;

    for (const key in CACHE) {
        if (key.startsWith('acts_') && Array.isArray(CACHE[key].data)) {
            const foundInMem = CACHE[key].data.find(a => Number(a.id) === numId);
            if (foundInMem) return foundInMem;
        }
    }
    return null;
}

let activeSyncPromise = null;

async function syncActivities(token, forceFull = false) {
    const cachedActs = loadActivitiesFromFile();
    const cachedIds  = new Set(cachedActs.map(a => Number(a.id)));
    const newActs    = [];
    let rateLimited  = false;
    const maxPages   = forceFull ? 60 : (cachedActs.length === 0 ? 30 : 5);

    console.log(`[Sync] Iniciando sincronización. Modo completo: ${forceFull}. Actividades en caché: ${cachedActs.length}`);

    for (let i = 1; i <= maxPages; i++) {
        try {
            console.log(`[Sync] Solicitando página ${i} de actividades a Strava...`);
            const r    = await axios.get(`${STRAVA_API_BASE}/athlete/activities?per_page=50&page=${i}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = r.data || [];
            if (data.length === 0) break;

            let foundExisting = false;
            for (const act of data) {
                if (cachedIds.has(Number(act.id))) foundExisting = true;
                else newActs.push(act);
            }
            if (foundExisting && !forceFull) {
                console.log(`[Sync] Se detectaron actividades existentes en la página ${i}. Parando sincronización incremental.`);
                break;
            }
            if (data.length < 50) break;
        } catch (e) {
            if (e.response?.status === 429) {
                console.warn(`[Sync] Rate limit alcanzado en la página ${i} de Strava.`);
                rateLimited = true;
                break;
            }
            throw e;
        }
    }

    let combined = [...cachedActs];
    if (newActs.length > 0) combined = [...newActs, ...cachedActs];

    if (forceFull) {
        const seenIds    = new Set();
        const uniqueActs = [];
        for (const act of [...newActs, ...cachedActs]) {
            const numId = Number(act.id);
            if (!seenIds.has(numId)) { seenIds.add(numId); uniqueActs.push(act); }
        }
        combined = uniqueActs;
    }

    combined.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    if (newActs.length > 0 || forceFull) {
        saveActivitiesToFile(combined);
        console.log(`[Sync] Finalizada. Nuevas: ${newActs.length}. Total: ${combined.length}`);
        return combined;
    }
    console.log(`[Sync] Al día. Sin novedades. Total: ${cachedActs.length}`);
    return cachedActs;
}

async function fetchAllActivities(token, pages = 8, afterTimestamp = null, forceFull = false) {
    if (!activeSyncPromise) {
        activeSyncPromise = syncActivities(token, forceFull).finally(() => { activeSyncPromise = null; });
    }
    let all = [];
    try {
        all = await activeSyncPromise;
    } catch (e) {
        console.error('[fetchAllActivities] Error durante la sincronización, usando caché local:', e.message);
        all = loadActivitiesFromFile();
    }
    if (afterTimestamp) {
        return all.filter(act => Math.floor(new Date(act.start_date).getTime() / 1000) >= afterTimestamp);
    }
    return all;
}

async function fetchRecentActivities(token, afterTimestamp) {
    const hourlyTimestamp = Math.floor(afterTimestamp / 3600) * 3600;
    const cacheKey        = `recent_${hourlyTimestamp}`;
    const cached          = getCached(cacheKey);
    if (cached) { console.log(`[cache hit] ${cacheKey}`); return cached; }
    try {
        const r    = await axios.get(`${STRAVA_API_BASE}/athlete/activities?per_page=50&after=${afterTimestamp}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = r.data || [];
        setCache(cacheKey, data);
        return data;
    } catch (e) {
        if (e.response?.status === 429) { console.warn('Rate limit en actividades recientes'); return []; }
        throw e;
    }
}

// ---------------------------
// FUNCIONES PURAS DE PMC (deduplicadas, reutilizables)
// ---------------------------

/**
 * Construye un mapa fecha→carga diaria a partir de actividades.
 * Aplica ajuste opcional de peso con weightMap.
 */
function buildLoadByDay(activities, weightMap = {}) {
    const loadByDay = {};
    for (const act of activities) {
        if (isPassiveRecoveryActivity(act)) continue;
        const dateStr = new Date(act.start_date).toISOString().split('T')[0];
        
        let load = act.suffer_score || 0;
        
        // Detección de fallos en el sensor de pulso (Glitch)
        // Si es carrera o ciclismo y el pulso medio registrado es anormalmente bajo (< 100 ppm)
        // pero la actividad tiene una duración relevante (> 10 mins) y tiene suffer_score bajo.
        const actLabel = resolveTypeForMap(act);
        const isCardio = actLabel === 'Running' || actLabel === 'Ciclismo' || actLabel === 'Ciclo Indoor';
        const hasGlitchedHeartRate = act.has_heartrate && act.average_heartrate > 0 && act.average_heartrate < 100;
        
        if (isCardio && hasGlitchedHeartRate && act.moving_time > 600) {
            // Ignoramos el suffer_score erróneo y estimamos la carga en base a duración
            load = Math.round((act.moving_time / 60) * 0.7 * 0.5);
        } else if (!load && act.moving_time) {
            const hrFactor = act.has_heartrate ? act.average_heartrate / 150 : 0.7;
            load = Math.round((act.moving_time / 60) * hrFactor * 0.5);
        }
        
        // Ajuste por peso corporal real (Withings) para actividades peso-sensitivas
        if (Object.keys(weightMap).length > 0) {
            const isWeightSensitive = ['Run','Walk','Ride','VirtualRide'].includes(act.type);
            const dailyWeight       = weightMap[dateStr];
            if (isWeightSensitive && dailyWeight) {
                load = Math.round(load * (dailyWeight / 74.0));
            }
        }
        loadByDay[dateStr] = (loadByDay[dateStr] || 0) + load;
    }
    return loadByDay;
}

/**
 * Calcula el Performance Management Chart (CTL, ATL, TSB) para los últimos `daysBack` días.
 * Retorna un array ordenado del más antiguo al más reciente.
 */
function computePMC(loadByDay, daysBack = 180) {
    const days  = [];
    let ctl = 0, atl = 0;
    for (let i = daysBack - 1; i >= 0; i--) {
        const d       = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const load    = loadByDay[dateStr] || 0;
        ctl = ctl * CTL_DECAY + load * (1 - CTL_DECAY);
        atl = atl * ATL_DECAY + load * (1 - ATL_DECAY);
        days.push({ dateStr, load, ctl, atl, tsb: ctl - atl });
    }
    return days;
}

// ---------------------------
// ENDPOINT: DEBUG — Tipos de actividad
// ---------------------------
app.get('/api/debug/types', async (req, res) => {
    try {
        const token    = await getValidAccessToken();
        const r        = await axios.get(`${STRAVA_API_BASE}/athlete/activities?per_page=100`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const summary  = r.data.map(a => ({
            name: a.name, type: a.type, sport_type: a.sport_type,
            resolved: resolveTypeForMap(a) || '(no mapeado)'
        }));
        const freq = {};
        r.data.forEach(a => {
            const key = `type="${a.type}" | sport_type="${a.sport_type}"`;
            freq[key] = (freq[key] || 0) + 1;
        });
        res.json({ activities: summary, typeFrequencies: freq });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------
// ENDPOINT: ACTIVIDADES (últimas 50)
// ---------------------------
app.get('/api/activities', async (req, res) => {
    try {
        const token   = await getValidAccessToken();
        const allActs = await fetchAllActivities(token);
        res.json(allActs.slice(0, 50).map(processActivity));
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') {
            res.status(401).json({ error: 'No autenticado con Strava' });
        } else {
            res.status(500).json({ error: 'Error obteniendo datos de Strava' });
        }
    }
});

// ---------------------------
// ENDPOINT: ANÁLISIS IA POR ACTIVIDAD
// ---------------------------
app.post('/api/activities/:id/ai-analyze', async (req, res) => {
    try {
        const { id }      = req.params;
        const force       = req.query.force === 'true';
        const cacheKey    = `ai_analyze_${id}`;

        if (!force) {
            const cached = getAiCached(cacheKey);
            if (cached) { console.log(`[cache hit] ai-analyze (persistent) for activity ${id}`); return res.json(cached); }
        }

        const token = await getValidAccessToken();
        let act = null;
        try {
            const stravaRes = await axios.get(`${STRAVA_API_BASE}/activities/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            act = stravaRes.data;
        } catch (stravaErr) {
            console.warn(`[AI-Activity] Strava API detailed fetch failed for ${id}:`, stravaErr.message);
            act = findCachedActivity(id);
            if (!act) throw stravaErr;
        }

        let aiReport  = '';
        let isSimulated = true;

        if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('tu_gemini_api_key')) {
            const prompt = `Eres un preparador físico y fisiólogo deportivo de élite. Escribe un análisis exhaustivo y motivador sobre la siguiente sesión de entrenamiento realizada por Miguel:\nActividad: "${act.name}"\nTipo: ${act.sport_type || act.type}\nDistancia: ${(act.distance / 1000).toFixed(2)} km\nDuración: ${(act.moving_time / 60).toFixed(1)} minutos\nPulso medio: ${act.average_heartrate || 'N/A'} ppm\nPulso máximo: ${act.max_heartrate || 'N/A'} ppm\nEsfuerzo relativo de Strava: ${act.suffer_score || 'N/A'}\nDesnivel positivo acumulado: ${act.total_elevation_gain || 0} metros\nCalorías quemadas: ${act.calories || 'N/A'} kcal\n\nEscribe un informe diagnóstico en formato Markdown estructurado con los siguientes apartados:\n### 🔍 Fisiología del Esfuerzo\nAnaliza las zonas de pulso implicadas (si hay cardio), el impacto metabólico de las calorías y la asimilación del desnivel.\n### 📈 Supercompensación y Carga (PMC)\nExplica cómo influyen estos ${act.suffer_score || 20} puntos de esfuerzo en su Fitness crónico (CTL) y cuánta fatiga (ATL) le añaden.\n### 🧘 Pautas de Recuperación Específicas\nDi qué comer (nutrición), beber (hidratación) y cuántas horas de sueño profundo necesita exactamente para asimilar esta sesión hoy.\n\nMantén un tono riguroso, científico, alentador y personalizado para Miguel.`;
            try {
                const result = await callGeminiWithFallback(prompt);
                aiReport    = result.text;
                isSimulated = false;
            } catch (err) {
                console.error('[AI-Activity] Resilient Gemini calls failed. Falling back to local report.', err.message);
            }
        }

        if (!aiReport) {
            aiReport = `### 🔍 Fisiología del Esfuerzo (${act.sport_type || act.type})\n* **Zonas de Pulso:** Tu pulso medio de **${act.average_heartrate || 130} ppm** indica un trabajo predominantemente aeróbico, excelente para construir resistencia cardiovascular y optimizar el metabolismo lipídico.\n* **Metabolismo:** Las calorías quemadas representan una depleción parcial de glucógeno. Buen trabajo de asimilación general.\n* **Desnivel:** Se han acumulado **${act.total_elevation_gain || 0} metros** de ascenso positivo, estimulando la fuerza-resistencia en tus cuádriceps e isquiotibiales.\n\n### 📈 Supercompensación y Carga (PMC)\n* Esta sesión suma **${act.suffer_score || 15} puntos de Esfuerzo Relativo**. \n* Tu fatiga aguda (**ATL**) se elevará ligeramente de forma temporal, pero sirve como estímulo perfecto para provocar adaptaciones positivas a medio plazo, elevando tu línea base de Fitness (**CTL**).\n\n### 🧘 Pautas de Recuperación Específicas\n* **Hidratación:** Repón el peso perdido en sudor. Se sugieren 500-750 ml de agua con electrolitos (sodio, magnesio) en las próximas 2 horas.\n* **Nutrición:** Ventana de recuperación de 45 minutos activa: consume hidratos de carbono complejos combinados con 20g de proteína de alta calidad para reparar fibras musculares.\n* **Descanso:** Prioriza el sueño de calidad de al menos 7.5 horas con foco en fases de sueño profundo (recuperación muscular/hormonal).`;
        }

        const responseData = { analysis: aiReport };
        if (!isSimulated) await setAiCached(cacheKey, responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Error en /api/activities/ai-analyze:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------
// ENDPOINT: PROGRESO ANUAL
// ---------------------------
app.get('/api/annual-progress', async (req, res) => {
    try {
        const token          = await getValidAccessToken();
        const year           = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        const MONTHS_ES      = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const yearActivities = await fetchAllActivities(token, 8, afterTimestamp);

        const months = Array.from({ length: 12 }, (_, m) => ({
            month: MONTHS_ES[m], monthIdx: m, cycling: 0, cicloIndoor: 0, running: 0, totalCycling: 0
        }));

        let totalCycling = 0, totalCicloIndoor = 0, totalRunning = 0;
        let totalCyclingElevation = 0, totalRunningElevation = 0;

        for (const act of yearActivities) {
            const m    = new Date(act.start_date).getMonth();
            const km   = parseFloat((act.distance / 1000).toFixed(2));
            const elev = act.total_elevation_gain || 0;

            if (isCyclingActivity(act)) {
                if (isIndoorCyclingAct(act)) {
                    months[m].cicloIndoor += km;
                    totalCicloIndoor     += km;
                } else {
                    months[m].cycling    += km;
                    totalCycling         += km;
                    totalCyclingElevation += elev;
                }
            } else if (isRunningActivity(act)) {
                months[m].running   += km;
                totalRunning        += km;
                totalRunningElevation += elev;
            }
        }

        months.forEach(m => {
            m.cycling      = parseFloat(m.cycling.toFixed(1));
            m.cicloIndoor  = parseFloat(m.cicloIndoor.toFixed(1));
            m.running      = parseFloat(m.running.toFixed(1));
            m.totalCycling = parseFloat((m.cycling + m.cicloIndoor).toFixed(1));
        });

        const currentMonth    = new Date().getMonth();
        const monthsElapsed   = currentMonth + 1;
        const totalCyclingAll = parseFloat((totalCycling + totalCicloIndoor).toFixed(1));
        const avgCycling      = totalCyclingAll / monthsElapsed;
        const avgRunning      = totalRunning / monthsElapsed;
        const avgCyclingElev  = totalCyclingElevation / monthsElapsed;
        const avgRunningElev  = totalRunningElevation / monthsElapsed;

        res.json({
            year,
            goals: { cycling: 4000, running: 700, cyclingElevation: 30000, runningElevation: 10000 },
            totals: {
                cycling:          totalCyclingAll,
                cyclingOutdoor:   parseFloat(totalCycling.toFixed(1)),
                cyclingIndoor:    parseFloat(totalCicloIndoor.toFixed(1)),
                running:          parseFloat(totalRunning.toFixed(1)),
                cyclingElevation: Math.round(totalCyclingElevation),
                runningElevation: Math.round(totalRunningElevation),
                totalElevation:   Math.round(totalCyclingElevation + totalRunningElevation)
            },
            projected: {
                cycling:          parseFloat((avgCycling * 12).toFixed(0)),
                running:          parseFloat((avgRunning * 12).toFixed(0)),
                cyclingElevation: parseFloat((avgCyclingElev * 12).toFixed(0)),
                runningElevation: parseFloat((avgRunningElev * 12).toFixed(0))
            },
            kmNeeded: {
                cycling:          parseFloat(Math.max(0, 4000 - totalCyclingAll).toFixed(1)),
                running:          parseFloat(Math.max(0, 700 - totalRunning).toFixed(1)),
                cyclingElevation: Math.max(0, 30000 - totalCyclingElevation),
                runningElevation: Math.max(0, 10000 - totalRunningElevation)
            },
            monthsRemaining: 12 - monthsElapsed,
            monthly: months.slice(0, monthsElapsed + 1)
        });
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') {
            res.status(401).json({ error: 'No autenticado' });
        } else {
            console.error(error.message);
            res.status(500).json({ error: 'Error calculando progreso anual' });
        }
    }
});

// ---------------------------
// ENDPOINT: HISTÓRICO POR AÑOS
// ---------------------------
app.get('/api/history', async (req, res) => {
    try {
        const token       = await getValidAccessToken();
        const forceFull   = req.query.sync === 'full';
        const cacheKey    = 'history_all_years';

        if (!forceFull) {
            const cached = getCached(cacheKey);
            if (cached) return res.json(cached);
        }

        const allActivities = await fetchAllActivities(token, 60, null, forceFull);
        const history       = {};

        for (const act of allActivities) {
            const d    = new Date(act.start_date);
            const year = d.getFullYear();
            if (!history[year]) history[year] = { year, cycling: 0, running: 0 };
            const km = parseFloat((act.distance / 1000).toFixed(2));
            if (isCyclingActivity(act))      history[year].cycling += km;
            else if (isRunningActivity(act)) history[year].running += km;
        }

        const result = Object.values(history).map(h => ({
            year:    h.year,
            cycling: parseFloat(h.cycling.toFixed(1)),
            running: parseFloat(h.running.toFixed(1)),
            total:   parseFloat((h.cycling + h.running).toFixed(1))
        })).sort((a, b) => b.year - a.year);

        setCache(cacheKey, result);
        res.json(result);
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') {
            res.status(401).json({ error: 'No autenticado' });
        } else {
            console.error('Error en /api/history:', error.message);
            res.status(500).json({ error: 'Error obteniendo histórico' });
        }
    }
});

// ---------------------------
// ENDPOINT: ESTADÍSTICAS (Diario / Mensual / Anual)
// ---------------------------
app.get('/api/stats', async (req, res) => {
    try {
        const token          = await getValidAccessToken();
        const year           = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        const allActivities  = await fetchAllActivities(token, 8, afterTimestamp);

        const daily   = {};
        const monthly = {};
        const annual  = {};
        const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

        const emptyRow = (key, sortVal) => {
            const row = { label: key, _sort: sortVal, count: 0, durationMin: 0, distanceKm: 0, elevationGain: 0 };
            TRACKED_ACTIVITIES.forEach(a => row[a] = 0);
            return row;
        };

        const addToGroup = (group, key, sortVal, actLabel, durationMin, distanceKm, elevationGain) => {
            if (!group[key]) group[key] = emptyRow(key, sortVal);
            group[key].count        += 1;
            group[key].durationMin   = parseFloat((group[key].durationMin + durationMin).toFixed(1));
            group[key].distanceKm    = parseFloat((group[key].distanceKm + distanceKm).toFixed(2));
            group[key].elevationGain = Math.round(group[key].elevationGain + elevationGain);
            group[key][actLabel]     = (group[key][actLabel] || 0) + 1;
        };

        for (const act of allActivities) {
            const actLabel = resolveTypeForMap(act);
            if (!actLabel) continue;

            const date        = new Date(act.start_date);
            const dayKey      = `${date.getDate().toString().padStart(2,'0')} ${MONTHS_ES[date.getMonth()]}`;
            const monthKey    = `${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`;
            const yearKey     = `${date.getFullYear()}`;
            const sortDay     = date.getFullYear() * 10000 + (date.getMonth()+1) * 100 + date.getDate();
            const sortMonth   = date.getFullYear() * 100 + (date.getMonth()+1);
            const sortYear    = date.getFullYear();
            const durationMin = parseFloat((act.moving_time / 60).toFixed(1));
            const distanceKm  = parseFloat((act.distance / 1000).toFixed(2));
            const elevGain    = act.total_elevation_gain || 0;

            addToGroup(daily,   dayKey,   sortDay,   actLabel, durationMin, distanceKm, elevGain);
            addToGroup(monthly, monthKey, sortMonth, actLabel, durationMin, distanceKm, elevGain);
            addToGroup(annual,  yearKey,  sortYear,  actLabel, durationMin, distanceKm, elevGain);
        }

        const sortedByDate = (obj) => Object.values(obj).sort((a, b) => a._sort - b._sort);
        res.json({
            daily:   sortedByDate(daily).slice(-30),
            monthly: sortedByDate(monthly).slice(-12),
            annual:  sortedByDate(annual)
        });
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') {
            res.status(401).json({ error: 'No autenticado' });
        } else {
            console.error('Error en /api/stats:', error.response?.data || error.message);
            res.status(500).json({ error: 'Error obteniendo estadísticas' });
        }
    }
});

// ---------------------------
// ENDPOINT: RECEPCIÓN DE DATOS APPLE HEALTH (Atajos de iOS)
// ---------------------------
app.post('/api/health/apple', (req, res) => {
    try {
        const payload = req.body;
        const dateStr = payload.date || new Date().toISOString().split('T')[0];
        
        let appleData = {};
        try { appleData = JSON.parse(fs.readFileSync(APPLE_HEALTH_FILE, 'utf8')); } catch {}
        
        // Limpiar y validar tipos de datos antes de guardar
        const cleanEntry = {};
        const fields = [
            'weight', 'bodyFat', 'restingHeartRate', 'hrv', 'sleepDurationHours',
            'sleepScore', 'steps', 'activeCalories', 'vo2max', 'systolic', 'diastolic', 'waterMetricLiters'
        ];
        
        for (const f of fields) {
            if (payload[f] !== undefined && payload[f] !== null && payload[f] !== '') {
                cleanEntry[f] = Number(payload[f]);
            }
        }
        
        // Hacer merge con los datos que ya tuviéramos para ese mismo día (si existiera alguna métrica previa)
        appleData[dateStr] = {
            ...appleData[dateStr],
            ...cleanEntry,
            date: dateStr
        };
        
        fs.writeFileSync(APPLE_HEALTH_FILE, JSON.stringify(appleData, null, 2));
        console.log(`[Apple Health] Datos sincronizados y guardados para la fecha ${dateStr}:`, cleanEntry);
        
        res.json({ ok: true, message: `Apple Health data saved successfully for ${dateStr}` });
    } catch (e) {
        console.error('[Apple Health] Error al procesar la carga:', e.message);
        res.status(500).json({ error: 'Error al procesar los datos de Apple Health' });
    }
});

// ---------------------------
// ENDPOINT: SALUD (Withings)
// ---------------------------
app.get('/api/health', async (req, res) => {
    const defaultHydration = { dailyGoal: 3.0, currentLiters: 2.2, previousLiters: 1.8, history: [2.0, 2.5, 1.8, 3.1, 2.2] };

    let appleData = {};
    try { appleData = JSON.parse(fs.readFileSync(APPLE_HEALTH_FILE, 'utf8')); } catch {}
    const appleHealthConnected = Object.keys(appleData).length > 0;

    if (appleHealthConnected) {
        console.log('[Apple Health] Generando métricas de salud utilizando base de datos local...');
        const filled = getFilledAppleHistory(30);
        const latest = filled[filled.length - 1];
        const previous = filled[filled.length - 2] || latest;
        
        const weightHistory = filled.slice(-10).map(h => h.weight);
        const currentWeight = latest.weight;
        const prevWeight = previous.weight;
        
        const currentFat = latest.bodyFat;
        const prevFat = previous.bodyFat;
        
        const currentSys = latest.systolic;
        const prevSys = previous.systolic;
        const sysHistory = filled.slice(-10).map(h => h.systolic);
        
        const currentDia = latest.diastolic;
        const prevDia = previous.diastolic;
        const diaHistory = filled.slice(-10).map(h => h.diastolic);
        
        const waterPct = parseFloat(((latest.waterMetricLiters / currentWeight) * 100).toFixed(1));
        
        const composition = { 
            muscleMass: parseFloat((currentWeight * 0.8).toFixed(1)), // Estimación basada en peso si no hay báscula segmentada
            boneMass: parseFloat((currentWeight * 0.04).toFixed(1)),
            waterPct: waterPct || 56.4 
        };
        
        const cardio = { 
            pwv: 6.2, 
            vascularAge: 28,
            vo2max: latest.vo2max // Métrica real de Apple Watch
        };
        
        const bloodPressure = {
            systolic:  { current: currentSys,  previous: prevSys,  history: sysHistory },
            diastolic: { current: currentDia,  previous: prevDia,  history: diaHistory }
        };
        
        const stepsHistory = filled.slice(-7).map(h => h.steps);
        const activityData = {
            currentSteps: latest.steps,
            stepsGoal: 10000,
            previousSteps: previous.steps,
            history: stepsHistory,
            activeCalories: latest.activeCalories,
            activeDurationFormated: '01:15:00' // Valor representativo
        };
        
        const hydrationData = {
            dailyGoal: 3.0,
            currentLiters: latest.waterMetricLiters,
            previousLiters: previous.waterMetricLiters,
            history: filled.slice(-5).map(h => h.waterMetricLiters)
        };
        
        return res.json({
            weight: { current: currentWeight, goal: 74.0, previous: prevWeight, history: weightHistory },
            bodyFat: { current: currentFat, goal: 14.0, previous: prevFat },
            composition, cardio, bloodPressure,
            hydration: hydrationData, activity: activityData,
            withingsConnected: false, appleHealthConnected: true
        });
    }

    try {
        const withingsToken = await getWithingsValidAccessToken();
        console.log('[Withings] Fetching weight/body fat/composition/cardio biometrics from API...');
        const response = await axios.post(
            'https://wbsapi.withings.net/measure',
            new URLSearchParams({ action: 'getmeas', meastypes: '1,6,9,10,76,77,88,91,155' }).toString(),
            { headers: { Authorization: `Bearer ${withingsToken}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (response.data && response.data.status === 0 && response.data.body && response.data.body.measuregrps) {
            const grps           = response.data.body.measuregrps;
            const weights        = [], fats = [], muscleMasses = [], hydrationMasses = [];
            const boneMasses     = [], pwvs = [], vascularAges = [], diastolics = [], systolics = [];

            for (const grp of grps) {
                for (const m of grp.measures) {
                    const v = m.value * Math.pow(10, m.unit);
                    if      (m.type === 1)   weights.push(parseFloat(v.toFixed(1)));
                    else if (m.type === 6)   fats.push(parseFloat(v.toFixed(1)));
                    else if (m.type === 9)   diastolics.push(Math.round(v));
                    else if (m.type === 10)  systolics.push(Math.round(v));
                    else if (m.type === 76)  muscleMasses.push(parseFloat(v.toFixed(1)));
                    else if (m.type === 77)  hydrationMasses.push(parseFloat(v.toFixed(1)));
                    else if (m.type === 88)  boneMasses.push(parseFloat(v.toFixed(1)));
                    else if (m.type === 91)  pwvs.push(parseFloat(v.toFixed(2)));
                    else if (m.type === 155) vascularAges.push(Math.round(v));
                }
            }

            const currentWeight  = weights[0] || 75.2;
            const prevWeight     = weights[1] || 76.0;
            const weightHistory  = weights.slice(0, 10).reverse();
            if (weightHistory.length === 0) weightHistory.push(76, 75.8, 75.5, 75.4, 75.2);

            const currentFat     = fats[0] || 15.5;
            const prevFat        = fats[1] || 16.0;
            const currentSys     = systolics[0] || 115;
            const prevSys        = systolics[1] || 116;
            const sysHistory     = systolics.slice(0, 10).reverse();
            if (sysHistory.length === 0) sysHistory.push(118, 117, 116, 115, 115);
            const currentDia     = diastolics[0] || 75;
            const prevDia        = diastolics[1] || 76;
            const diaHistory     = diastolics.slice(0, 10).reverse();
            if (diaHistory.length === 0) diaHistory.push(78, 77, 76, 75, 75);

            const waterMass      = hydrationMasses[0] || 42.4;
            const waterPct       = parseFloat(((waterMass / currentWeight) * 100).toFixed(1));
            const composition    = { muscleMass: muscleMasses[0] || 60.5, boneMass: boneMasses[0] || 3.2, waterPct: hydrationMasses[0] ? waterPct : 56.4 };
            const cardio         = { pwv: pwvs[0] || 6.2, vascularAge: vascularAges[0] || 28 };
            const bloodPressure  = {
                systolic:  { current: currentSys,  previous: prevSys,  history: sysHistory },
                diastolic: { current: currentDia,  previous: prevDia,  history: diaHistory }
            };

            let activityData = { currentSteps: 8450, stepsGoal: 10000, previousSteps: 7800, history: [6200, 11500, 8450, 7800, 9100, 8000, 8450], activeCalories: 350, activeDurationFormated: '01:15:00' };

            try {
                const today             = new Date();
                const sevenDaysAgo      = new Date(); sevenDaysAgo.setDate(today.getDate() - 7);
                const startdateymd      = sevenDaysAgo.toISOString().split('T')[0];
                const enddateymd        = today.toISOString().split('T')[0];
                const rawActsWithings   = await getCachedWithingsActivity(withingsToken, startdateymd, enddateymd);
                const actsWithings      = getDailyWithingsActivities(rawActsWithings);
                if (actsWithings && actsWithings.length > 0) {
                    actsWithings.sort((a, b) => a.date.localeCompare(b.date));
                    const todayStr  = today.toISOString().split('T')[0];
                    const todayAct  = actsWithings.find(a => a.date === todayStr) || actsWithings[actsWithings.length - 1];
                    const prevAct   = actsWithings.length > 1 ? actsWithings[actsWithings.length - 2] : null;
                    activityData = {
                        currentSteps:          todayAct ? (todayAct.steps || 0) : 0,
                        stepsGoal:             10000,
                        previousSteps:         prevAct  ? (prevAct.steps || 0)  : 0,
                        history:               actsWithings.map(a => a.steps || 0).slice(-7),
                        activeCalories:        todayAct ? Math.round(todayAct.calories || 0) : 0,
                        activeDurationFormated: todayAct ? secondsToHhMmSs(todayAct.active || 0) : '00:00:00'
                    };
                }
            } catch (actError) {
                console.error('[Withings] Error resolving activity data inside /api/health:', actError.message);
            }

            return res.json({
                weight: { current: currentWeight, goal: 74.0, previous: prevWeight, history: weightHistory },
                bodyFat: { current: currentFat, goal: 14.0, previous: prevFat },
                composition, cardio, bloodPressure,
                hydration: defaultHydration, activity: activityData, withingsConnected: true
            });
        }
        throw new Error('WITHINGS_API_BAD_STATUS');
    } catch (e) {
        console.log(`[Health] Usando datos simulados (Withings no conectado/error: ${e.message})`);
        res.json({
            weight:      { current: 75.2, goal: 74.0, previous: 76.0, history: [76, 75.8, 75.5, 75.4, 75.2] },
            bodyFat:     { current: 15.5, goal: 14.0, previous: 16.0 },
            composition: { muscleMass: 60.5, boneMass: 3.2, waterPct: 56.4 },
            cardio:      { pwv: 6.2, vascularAge: 28 },
            bloodPressure: {
                systolic:  { current: 115, previous: 118, history: [118, 117, 116, 115, 115] },
                diastolic: { current: 75,  previous: 77,  history: [78, 77, 76, 75, 75] }
            },
            hydration: defaultHydration,
            activity:  { currentSteps: 8450, stepsGoal: 10000, previousSteps: 7800, history: [6200, 11500, 8450, 7800, 9100, 8000, 8450], activeCalories: 350, activeDurationFormated: '01:15:00' },
            withingsConnected: false
        });
    }
});

// ---------------------------
// MÓDULO 1: FITNESS (ATL / CTL / TSB)
// ---------------------------
app.get('/api/fitness', async (req, res) => {
    try {
        const token          = await getValidAccessToken();
        const year           = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        const allActivities  = await fetchAllActivities(token, 8, afterTimestamp);

        // BIOMETRÍA DE WITHINGS (180 DÍAS)
        const sleepMap       = {};
        const weightMap      = {};
        const stepsMap       = {};
        let averageRhr       = 55;
        let withingsConnected = false;

        let appleData = {};
        try { appleData = JSON.parse(fs.readFileSync(APPLE_HEALTH_FILE, 'utf8')); } catch {}
        const appleHealthConnected = Object.keys(appleData).length > 0;

        if (appleHealthConnected) {
            console.log('[Apple Health-PMC] Cargando 180 días de historial de pasos, sueño y peso...');
            const filled180 = getFilledAppleHistory(180);
            
            const allRhrs = filled180.map(h => h.restingHeartRate).filter(hr => hr > 0);
            if (allRhrs.length > 0) averageRhr = Math.round(allRhrs.reduce((a, b) => a + b, 0) / allRhrs.length);
            
            for (const h of filled180) {
                sleepMap[h.date] = { score: h.sleepScore || 75, rhr: h.restingHeartRate || 55, duration: h.sleepDurationHours || 7.2 };
                stepsMap[h.date] = h.steps || 0;
                weightMap[h.date] = h.weight || 75.2;
            }
        } else {
            try {
                const withingsToken       = await getWithingsValidAccessToken();
                const today               = new Date();
                const hundredEightyDaysAgo = new Date(); hundredEightyDaysAgo.setDate(today.getDate() - 180);
                const startdateymd        = hundredEightyDaysAgo.toISOString().split('T')[0];
                const enddateymd          = today.toISOString().split('T')[0];
                const startdate           = Math.floor(hundredEightyDaysAgo.getTime() / 1000);
                const enddate             = Math.floor(today.getTime() / 1000);

                console.log('[Withings-PMC] Fetching 180 days of sleep, activity and weight...');
                const [sleepSeries, rawActsWithings, measureGrps] = await Promise.all([
                    getCachedWithingsSleep(withingsToken, startdateymd, enddateymd),
                    getCachedWithingsActivity(withingsToken, startdateymd, enddateymd),
                    getCachedWithingsMeasures(withingsToken, startdate, enddate)
                ]);
                const actsWithings = getDailyWithingsActivities(rawActsWithings);

                const allRhrs = sleepSeries.map(s => s.data.hr_average).filter(hr => hr > 0);
                if (allRhrs.length > 0) averageRhr = Math.round(allRhrs.reduce((a, b) => a + b, 0) / allRhrs.length);

                for (const s of sleepSeries) {
                    sleepMap[s.date] = { score: s.data.sleep_score || 75, rhr: s.data.hr_average || 55 };
                }
                for (const a of actsWithings) { stepsMap[a.date] = a.steps || 0; }
                for (const grp of measureGrps) {
                    const dateStr = new Date(grp.date * 1000).toISOString().split('T')[0];
                    for (const m of grp.measures) {
                        if (m.type === 1) weightMap[dateStr] = parseFloat((m.value * Math.pow(10, m.unit)).toFixed(1));
                    }
                }
                withingsConnected = sleepSeries.length > 0;
            } catch (e) {
                console.log(`[Withings-PMC] Sincronización biométrica PMC no disponible: ${e.message}`);
            }
        }

        // PMC con ajuste de peso
        const loadByDay = buildLoadByDay(allActivities, weightMap);
        const pmcDays   = computePMC(loadByDay, 180);

        const days = pmcDays.map(({ dateStr, load, ctl, atl, tsb }) => {
            const d         = new Date(dateStr);
            let tsbPhysio   = tsb;
            const sleepInfo = sleepMap[dateStr];
            if (sleepInfo) {
                const sleepScore   = sleepInfo.score;
                const currentRhr   = sleepInfo.rhr;
                const sleepFactor  = (sleepScore - 75) / 100;
                const rhrScore     = currentRhr > 0 ? -(currentRhr - averageRhr) * 2 : 0;
                const daySteps     = stepsMap[dateStr] || 0;
                const stepsFatigue = daySteps > 12000 ? Math.min(10, (daySteps - 12000) / 1500) : 0;
                tsbPhysio = tsb + (sleepFactor * 15) + rhrScore - stepsFatigue;
            }
            const acwr = ctl > 0 ? parseFloat((atl / ctl).toFixed(2)) : 0.0;
            return {
                date:      dateStr,
                label:     d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                ctl:       parseFloat(ctl.toFixed(1)),
                atl:       parseFloat(atl.toFixed(1)),
                tsb:       parseFloat(tsb.toFixed(1)),
                tsbPhysio: parseFloat(tsbPhysio.toFixed(1)),
                load,
                hasPhysio: !!sleepInfo,
                acwr
            };
        });

        res.json(days);
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') {
            res.status(401).json({ error: 'No autenticado' });
        } else {
            console.error(error.message);
            res.status(500).json({ error: 'Error calculando fitness' });
        }
    }
});

// ---------------------------
// MÓDULO 2: METAS SEMANALES
// ---------------------------
const DEFAULT_GOALS = {
    Running:       { unit: 'km',       target: 30,   icon: '🏃' },
    Ciclismo:      { unit: 'km',       target: 100,  icon: '🚴' },
    'Ciclo Indoor':{ unit: 'km',       target: 50,   icon: '🏋️' },
    Natación:      { unit: 'm',        target: 4000, icon: '🏊' },
    Pesas:         { unit: 'sesiones', target: 3,    icon: '💪' },
    Estiramientos: { unit: 'min',      target: 60,   icon: '🧘' },
    Andar:         { unit: 'km',       target: 20,   icon: '🚶' },
};

function loadGoals() {
    try {
        const saved  = JSON.parse(fs.readFileSync(GOALS_FILE, 'utf8'));
        const merged = { ...DEFAULT_GOALS };
        for (const k of Object.keys(saved)) {
            if (merged[k]) merged[k].target = saved[k].target;
        }
        return merged;
    } catch {
        return DEFAULT_GOALS;
    }
}

app.get('/api/goals', async (req, res) => {
    try {
        const token          = await getValidAccessToken();
        const goals          = loadGoals();
        const year           = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        const allYearActs    = await fetchAllActivities(token, 8, afterTimestamp);

        const now      = new Date();
        const day      = now.getDay();
        const diff     = (day === 0 ? 6 : day - 1);
        const monday   = new Date(now); monday.setDate(now.getDate() - diff); monday.setHours(0, 0, 0, 0);
        const weekActs = allYearActs.filter(a => new Date(a.start_date).getTime() >= monday.getTime());

        const progress = {};
        for (const sport of Object.keys(goals)) {
            const g       = goals[sport];
            const matched = weekActs.filter(a => resolveTypeForMap(a) === sport);
            let achieved  = 0;
            if (g.unit === 'km')        achieved = parseFloat((matched.reduce((s, a) => s + a.distance, 0) / 1000).toFixed(1));
            else if (g.unit === 'm')    achieved = parseFloat(matched.reduce((s, a) => s + a.distance, 0).toFixed(0));
            else if (g.unit === 'min')  achieved = parseFloat((matched.reduce((s, a) => s + a.moving_time, 0) / 60).toFixed(0));
            else if (g.unit === 'sesiones') achieved = matched.length;
            const pct    = Math.min(100, parseFloat(((achieved / g.target) * 100).toFixed(1)));
            progress[sport] = { ...g, achieved, pct };
        }
        res.json(progress);
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') {
            res.status(401).json({ error: 'No autenticado' });
        } else {
            console.error(error.message);
            res.status(500).json({ error: 'Error obteniendo metas' });
        }
    }
});

app.post('/api/goals', (req, res) => {
    try {
        const current = loadGoals();
        const updated = { ...current, ...req.body };
        fs.writeFileSync(GOALS_FILE, JSON.stringify(updated, null, 2));
        res.json({ ok: true, goals: updated });
    } catch {
        res.status(500).json({ error: 'Error guardando metas' });
    }
});

// ---------------------------
// MÓDULO 3: EVOLUCIÓN DE RENDIMIENTO
// ---------------------------
app.get('/api/performance', async (req, res) => {
    try {
        const token          = await getValidAccessToken();
        const year           = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        const allActivities  = await fetchAllActivities(token, 8, afterTimestamp);

        const running = [], cycling = [], swim = [];
        for (const act of allActivities) {
            const date = new Date(act.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            const t    = act.sport_type || act.type || '';
            if (t === 'Run' && act.average_speed > 0) {
                running.push({ date, pace: parseFloat((1000 / act.average_speed / 60).toFixed(2)), distanceKm: parseFloat((act.distance/1000).toFixed(1)), name: act.name });
            }
            if ((t === 'Ride' || t === 'VirtualRide') && act.average_speed > 0) {
                cycling.push({ date, speed: parseFloat((act.average_speed * 3.6).toFixed(1)), distanceKm: parseFloat((act.distance/1000).toFixed(1)), name: act.name });
            }
            if (t === 'Swim' && act.average_speed > 0) {
                swim.push({ date, per100: parseFloat((100 / act.average_speed / 60).toFixed(2)), distanceM: act.distance, name: act.name });
            }
        }
        res.json({
            running: running.reverse().slice(-30),
            cycling: cycling.reverse().slice(-30),
            swim:    swim.reverse().slice(-20)
        });
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') {
            res.status(401).json({ error: 'No autenticado' });
        } else {
            res.status(500).json({ error: 'Error obteniendo performance' });
        }
    }
});

// ---------------------------
// MÓDULO 5: RECUPERACIÓN
// Usa computePMC y getCachedWithings* (sin O(n²) de HRV)
// ---------------------------
app.get('/api/recovery', async (req, res) => {
    try {
        const token          = await getValidAccessToken();
        const year           = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        const allYearActs    = await fetchAllActivities(token, 8, afterTimestamp);

        const since28Ms  = Date.now() - 28 * 86400000;
        const acts       = allYearActs.filter(a => new Date(a.start_date).getTime() > since28Ms);
        const activeDays = new Set(acts.map(a => new Date(a.start_date).toISOString().split('T')[0]));
        const restDays   = 28 - activeDays.size;

        let streak = 0;
        for (let i = 0; i < 14; i++) {
            const d = new Date(); d.setDate(d.getDate() - i);
            if (activeDays.has(d.toISOString().split('T')[0])) streak++;
            else break;
        }

        const hrActs = acts.filter(a => a.has_heartrate && a.average_heartrate);
        const zones  = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
        const efficiencyHistory = [];
        for (const a of hrActs) {
            const pct = a.average_heartrate;
            const dur = a.moving_time / 60;
            if      (pct < 114) zones.z1 += dur;
            else if (pct < 126) zones.z2 += dur;
            else if (pct < 137) zones.z3 += dur;
            else if (pct < 151) zones.z4 += dur;
            else                zones.z5 += dur;

            if (a.average_speed) {
                const label = resolveTypeForMap(a);
                if (label === 'Running' || label === 'Ciclismo' || label === 'Ciclo Indoor' || label === 'Andar') {
                    const ef = parseFloat(((a.average_speed * 60) / pct).toFixed(3));
                    efficiencyHistory.push({
                        date: new Date(a.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                        rawDate: a.start_date,
                        name: a.name,
                        type: label,
                        ef
                    });
                }
            }
        }
        efficiencyHistory.sort((a, b) => a.rawDate.localeCompare(b.rawDate));
        const totalZoneMin = Object.values(zones).reduce((s, v) => s + v, 0) || 1;
        const zonePcts     = Object.fromEntries(
            Object.entries(zones).map(([k, v]) => [k, parseFloat(((v/totalZoneMin)*100).toFixed(1))])
        );

        const last28 = Array.from({ length: 28 }, (_, i) => {
            const d   = new Date(); d.setDate(d.getDate() - (27 - i));
            const key = d.toISOString().split('T')[0];
            return { date: key, label: d.getDate(), active: activeDays.has(key) };
        });

        // WITHINGS — caché compartida con /api/fitness
        let sleepData = null, rhrData = null, withingsConnected = false;
        const stepsMap       = {};
        let sleepHistory28   = [], rhrHistory28 = [], sleepScores28 = [];

        let appleData = {};
        try { appleData = JSON.parse(fs.readFileSync(APPLE_HEALTH_FILE, 'utf8')); } catch {}
        const appleHealthConnected = Object.keys(appleData).length > 0;

        if (appleHealthConnected) {
            console.log('[Apple Health-Recovery] Cargando 28 días de historial para recuperación...');
            const filled28 = getFilledAppleHistory(28);
            
            sleepHistory28 = filled28.map(h => h.sleepDurationHours);
            rhrHistory28   = filled28.map(h => h.restingHeartRate);
            sleepScores28  = filled28.map(h => h.sleepScore);
            
            const breathingHistory28 = filled28.map(h => 13.5); // Respuestas por defecto para frecuencia respiratoria
            
            const avgSleep  = parseFloat((sleepHistory28.reduce((a,b) => a+b,0) / 28).toFixed(1));
            const avgRhr    = Math.round(rhrHistory28.reduce((a,b) => a+b,0) / 28);
            const avgBreathing = 13.4;
            
            const latest = filled28[filled28.length - 1];
            
            sleepData = {
                history: [...sleepHistory28].reverse(),
                average: avgSleep,
                currentScore: latest.sleepScore,
                breathingRate: { current: 13.2, average: avgBreathing, history: breathingHistory28 },
                stages: {
                    deep:  parseFloat((latest.sleepDurationHours * 0.25).toFixed(1)) || 1.8,
                    light: parseFloat((latest.sleepDurationHours * 0.58).toFixed(1)) || 4.2,
                    rem:   parseFloat((latest.sleepDurationHours * 0.20).toFixed(1)) || 1.5,
                    awake: parseFloat((latest.sleepDurationHours * 0.05).toFixed(1)) || 0.3
                }
            };
            
            rhrData = { history: [...rhrHistory28].reverse(), average: avgRhr, current: latest.restingHeartRate };
            
            for (const h of filled28) {
                stepsMap[h.date] = h.steps || 0;
            }
        } else {
            try {
                const withingsToken   = await getWithingsValidAccessToken();
                const today           = new Date();
                const twentyEightAgo  = new Date(); twentyEightAgo.setDate(today.getDate() - 28);
                const startdateymd    = twentyEightAgo.toISOString().split('T')[0];
                const enddateymd      = today.toISOString().split('T')[0];

                console.log('[Withings] Fetching 28 days of sleep and activity summaries...');
                const [sleepSeries, rawActsWithings] = await Promise.all([
                    getCachedWithingsSleep(withingsToken, startdateymd, enddateymd),
                    getCachedWithingsActivity(withingsToken, startdateymd, enddateymd)
                ]);
                const actsWithings = getDailyWithingsActivities(rawActsWithings);

                if (sleepSeries.length > 0) {
                    sleepHistory28 = sleepSeries.map(s => parseFloat((s.data.total_sleep_time / 3600).toFixed(1)));
                    rhrHistory28   = sleepSeries.map(s => s.data.hr_average).filter(hr => hr > 0);
                    sleepScores28  = sleepSeries.map(s => s.data.sleep_score || 75);
                    const breathingHistory28 = sleepSeries.map(s => s.data.breathing_rate || 13.5).filter(br => br > 0);
                    const avgSleep  = sleepHistory28.length > 0 ? parseFloat((sleepHistory28.reduce((a,b) => a+b,0) / sleepHistory28.length).toFixed(1)) : 7.2;
                    const avgRhr    = rhrHistory28.length > 0   ? Math.round(rhrHistory28.reduce((a,b) => a+b,0) / rhrHistory28.length) : 56;
                    const avgBreathing = breathingHistory28.length > 0 ? parseFloat((breathingHistory28.reduce((a,b) => a+b,0) / breathingHistory28.length).toFixed(1)) : 13.4;
                    const latestSeries = sleepSeries[0]?.data || {};
                    sleepData = {
                        history: [...sleepHistory28].slice(0, 28).reverse(),
                        average: avgSleep,
                        currentScore: sleepScores28[0] || 75,
                        breathingRate: { current: breathingHistory28[0] || 13.2, average: avgBreathing, history: [...breathingHistory28].slice(0, 28).reverse() },
                        stages: {
                            deep:  parseFloat(((latestSeries.deepsleepduration  || 0) / 3600).toFixed(1)) || 1.8,
                            light: parseFloat(((latestSeries.lightsleepduration || 0) / 3600).toFixed(1)) || 4.2,
                            rem:   parseFloat(((latestSeries.remsleepduration   || 0) / 3600).toFixed(1)) || 1.5,
                            awake: parseFloat(((latestSeries.wakeupduration     || 0) / 3600).toFixed(1)) || 0.3
                        }
                    };
                    rhrData = { history: [...rhrHistory28].slice(0, 28).reverse(), average: avgRhr, current: rhrHistory28[0] || 55 };
                    withingsConnected = true;
                }
                for (const a of actsWithings) stepsMap[a.date] = a.steps || 0;
            } catch (e) {
                console.log(`[Recovery] Withings sleep/activity data not available: ${e.message}`);
            }
        }

        // Fallbacks realistas si no hay Withings
        if (!sleepData) {
            sleepHistory28 = [7.5, 6.8, 8.2, 7.0, 6.5, 7.8, 7.2, 7.4, 6.9, 8.0, 7.1, 6.4, 7.9, 7.3, 7.6, 6.7, 8.1, 7.2, 6.6, 7.8, 7.4, 7.5, 6.8, 8.3, 7.1, 6.5, 7.9, 7.2];
            sleepScores28  = [78, 65, 85, 72, 60, 82, 75, 76, 68, 84, 70, 58, 80, 74, 77, 64, 83, 73, 62, 79, 76, 78, 66, 86, 71, 61, 81, 73];
            sleepData = {
                history: sleepHistory28, average: 7.3, currentScore: 78,
                breathingRate: { current: 13.2, average: 13.4, history: [13.4, 13.6, 13.2, 13.5, 13.8, 13.1, 13.3, 13.5, 13.7, 13.2, 13.4, 13.6, 13.3, 13.5, 13.4, 13.6, 13.2, 13.5, 13.8, 13.1, 13.3, 13.5, 13.7, 13.2, 13.4, 13.6, 13.3, 13.2] },
                stages: { deep: 1.8, light: 4.2, rem: 1.5, awake: 0.3 }
            };
        }
        if (!rhrData) {
            rhrHistory28 = [56, 54, 57, 55, 54, 56, 55, 54, 53, 56, 55, 57, 54, 55, 56, 54, 58, 55, 53, 56, 54, 55, 53, 57, 54, 53, 56, 54];
            rhrData = { history: rhrHistory28, average: 55, current: 54 };
        }

        // TSB para el día de hoy (pase único con computePMC)
        const loadByDay = buildLoadByDay(allYearActs);
        const pmcFull   = computePMC(loadByDay, 180);  // 180 días de warmup para total consistencia
        const todayPmc  = pmcFull[pmcFull.length - 1];
        const currentTsb = todayPmc.tsb;

        // HRV rMSSD — pase único O(n) usando PMC precomputado (preferiendo HRV real si hay Apple Health)
        const filled28ForHrv = getFilledAppleHistory(28);
        const rhrAvg        = rhrData.average;
        const hrvHistory28  = pmcFull.slice(-28).map((pmcDay, i) => {
            const h = filled28ForHrv[i] || {};
            if (h.hrv && h.hrv > 0) {
                return h.hrv;
            }
            const rhr_day       = rhrData.history[i] || 55;
            const sleepScore_day = sleepScores28[i] || 75;
            const rhrContrib    = (rhrAvg - rhr_day) * 1.5;
            const sleepContrib  = (sleepScore_day - 75) * 0.25;
            const fatigueContrib = -Math.min(10, pmcDay.atl * 0.15);
            const sineNoise     = Math.sin(i * 0.5) * 2.5;
            return Math.round(Math.max(25, 58 + rhrContrib + sleepContrib + fatigueContrib + sineNoise));
        });

        const hrvCorridorMin = [], hrvCorridorMax = [];
        for (let i = 0; i < 28; i++) {
            const startIdx = Math.max(0, i - 21);
            const window   = hrvHistory28.slice(startIdx, i + 1);
            const mean     = window.reduce((a, b) => a + b, 0) / window.length;
            const sqDiffs  = window.map(v => Math.pow(v - mean, 2));
            const stdDev   = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / window.length) || 3;
            hrvCorridorMin.push(parseFloat((mean - 0.75 * stdDev).toFixed(1)));
            hrvCorridorMax.push(parseFloat((mean + 0.75 * stdDev).toFixed(1)));
        }
        const currentHrv = hrvHistory28[27];
        const hrvAverage = Math.round(hrvHistory28.reduce((a, b) => a + b, 0) / 28);
        const hrvRolling7 = hrvHistory28.map((_, i) => {
            const startIdx = Math.max(0, i - 6);
            const window   = hrvHistory28.slice(startIdx, i + 1);
            return parseFloat((window.reduce((a, b) => a + b, 0) / window.length).toFixed(1));
        });
        const hrvData = { history: hrvHistory28, corridorMin: hrvCorridorMin, corridorMax: hrvCorridorMax, current: currentHrv, average: hrvAverage, rolling7: hrvRolling7 };

        // GARMIN TRAINING READINESS SCORE
        const sleepScoreWeight = sleepData.currentScore;
        const hrv7Days         = hrvHistory28.slice(21, 28);
        const avgHrv7          = hrv7Days.reduce((a, b) => a + b, 0) / hrv7Days.length;
        const corrMin27        = hrvCorridorMin[27];
        const corrMax27        = hrvCorridorMax[27];
        let hrvScoreWeight = 100;
        if      (avgHrv7 < corrMin27) hrvScoreWeight = Math.max(30, Math.round(100 - (corrMin27 - avgHrv7) * 9));
        else if (avgHrv7 > corrMax27) hrvScoreWeight = 95;

        const rhrDiff = rhrData.current - rhrData.average;
        const rhrScoreWeight = rhrDiff > 0 ? Math.max(35, 100 - rhrDiff * 8) : 100;

        let tsbScoreWeight = 100;
        if      (currentTsb < -30) tsbScoreWeight = 35;
        else if (currentTsb < 0)   tsbScoreWeight = Math.round(100 + currentTsb * 2.2);

        const yesterday      = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr   = yesterday.toISOString().split('T')[0];
        const yesterdaySteps = stepsMap[yesterdayStr] || (withingsConnected ? 0 : 8500);
        const neatFatiguePenalty = yesterdaySteps > 15000 ? Math.min(15, Math.round((yesterdaySteps - 15000) / 1000) * 1.5) : 0;

        let readinessScore = Math.round(
            (sleepScoreWeight * 0.35) + (hrvScoreWeight * 0.25) + (rhrScoreWeight * 0.15) + (tsbScoreWeight * 0.25)
        );
        readinessScore = Math.max(1, Math.min(100, readinessScore - neatFatiguePenalty));

        // WHOOP STRAIN vs RECOVERY HISTORY (7 días) — sin Math.random()
        const strainHistory = [];
        const daysWeek      = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        for (let i = 6; i >= 0; i--) {
            const d       = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayActs = acts.filter(a => new Date(a.start_date).toISOString().split('T')[0] === dateStr);
            const daySuffer   = dayActs.reduce((s, a) => s + (a.suffer_score || 0), 0);
            const daySteps    = stepsMap[dateStr] || (withingsConnected ? 0 : 8000);

            let strain = 1.5;
            if (daySteps > 0) strain += Math.min(6.0, parseFloat((daySteps / 3000).toFixed(1)));

            if (activeDays.has(dateStr)) {
                // Determinista: basado en suffer_score (eliminado Math.random())
                let workoutStrain = 0;
                if      (daySuffer >= 80) workoutStrain = 15.5;
                else if (daySuffer >= 40) workoutStrain = 11.5;
                else if (daySuffer >= 15) workoutStrain = 7.5;
                else                      workoutStrain = 4.0;
                strain = parseFloat(Math.min(21.0, Math.sqrt(strain * strain + workoutStrain * workoutStrain)).toFixed(1));
            } else {
                strain = parseFloat(strain.toFixed(1));
            }

            const dayHrvIdx     = 27 - i;
            const dayRhr        = rhrData.history[dayHrvIdx] || 55;
            const daySleepScore = sleepScores28[dayHrvIdx] || 75;
            const dayHrv        = hrvHistory28[dayHrvIdx]   || 55;
            const rhr_score     = dayRhr <= rhrData.average ? 100 : Math.max(40, 100 - (dayRhr - rhrData.average) * 8);
            const hrv_score     = dayHrv >= hrvAverage      ? 100 : Math.max(40, 100 - (hrvAverage - dayHrv) * 6);
            const recovery      = Math.round((daySleepScore * 0.40) + (rhr_score * 0.30) + (hrv_score * 0.30));

            strainHistory.push({ day: daysWeek[d.getDay()], date: dateStr, strain, recovery });
        }

        const acwrToday = todayPmc.ctl > 0 ? parseFloat((todayPmc.atl / todayPmc.ctl).toFixed(2)) : 0.0;

        res.json({
            activeDays: activeDays.size, restDays, streak,
            zones: zonePcts, hasHrData: hrActs.length > 0, last28,
            sleepData, rhrData, hrvData, readinessScore, recoveryScore: readinessScore,
            strainScore: strainHistory[6].strain, strainHistory, withingsConnected,
            appleHealthConnected,
            acwr: acwrToday,
            efficiencyHistory
        });
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') {
            res.status(401).json({ error: 'No autenticado' });
        } else {
            console.error('Error en /api/recovery:', error.message);
            res.status(500).json({ error: 'Error obteniendo recuperación' });
        }
    }
});

// ---------------------------
// MÓDULO 7: COPILOTO DEPORTIVO IA (GEMINI)
// ---------------------------
app.post('/api/ai/coach', async (req, res) => {
    try {
        const { message, chatHistory } = req.body;
        if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

        const token          = await getValidAccessToken();
        const year           = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        const allYearActs    = await fetchAllActivities(token, 8, afterTimestamp);

        const since28Ms      = Date.now() - 28 * 86400000;
        const acts28         = allYearActs.filter(a => new Date(a.start_date).getTime() > since28Ms);
        const activeDaysCount = new Set(acts28.map(a => new Date(a.start_date).toISOString().split('T')[0])).size;

        let currentSleep = 75, sleepAvg = 7.3, currentRhr = 55, rhrAvg = 55, currentHrv = 60, hrvAvg = 58;
        let sleepHistory28 = [7.5, 6.8, 8.2, 7.0, 6.5, 7.8, 7.2, 7.4, 6.9, 8.0, 7.1, 6.4, 7.9, 7.3, 7.6, 6.7, 8.1, 7.2, 6.6, 7.8, 7.4, 7.5, 6.8, 8.3, 7.1, 6.5, 7.9, 7.2];
        let rhrHistory28   = [56, 54, 57, 55, 54, 56, 55, 54, 53, 56, 55, 57, 54, 55, 56, 54, 58, 55, 53, 56, 54, 55, 53, 57, 54, 53, 56, 54];
        let sleepScores28  = [78, 65, 85, 72, 60, 82, 75, 76, 68, 84, 70, 58, 80, 74, 77, 64, 83, 73, 62, 79, 76, 78, 66, 86, 71, 61, 81, 73];

        let appleData = {};
        try { appleData = JSON.parse(fs.readFileSync(APPLE_HEALTH_FILE, 'utf8')); } catch {}
        const appleHealthConnected = Object.keys(appleData).length > 0;

        if (appleHealthConnected) {
            console.log('[AI-Coach] Alimentando IA con datos de Apple Health...');
            const filled28 = getFilledAppleHistory(28);
            sleepScores28  = filled28.map(h => h.sleepScore);
            rhrHistory28   = filled28.map(h => h.restingHeartRate);
            sleepHistory28 = filled28.map(h => h.sleepDurationHours);
        } else {
            try {
                const withingsToken   = await getWithingsValidAccessToken();
                const today           = new Date();
                const twentyEightAgo  = new Date(); twentyEightAgo.setDate(today.getDate() - 28);
                const startdateymd    = twentyEightAgo.toISOString().split('T')[0];
                const enddateymd      = today.toISOString().split('T')[0];
                const sleepSeries     = await getCachedWithingsSleep(withingsToken, startdateymd, enddateymd);
                if (sleepSeries.length > 0) {
                    sleepScores28  = sleepSeries.map(s => s.data.sleep_score || 75);
                    rhrHistory28   = sleepSeries.map(s => s.data.hr_average).filter(hr => hr > 0);
                    sleepHistory28 = sleepSeries.map(s => parseFloat((s.data.total_sleep_time / 3600).toFixed(1)));
                }
            } catch {
                console.log('[AI-Context] Withings sleep summaries failed, utilizing default baselines.');
            }
        }

        currentSleep = sleepScores28[0] || 78;
        sleepAvg     = parseFloat((sleepHistory28.reduce((a, b) => a + b, 0) / sleepHistory28.length).toFixed(1)) || 7.3;
        currentRhr   = rhrHistory28[0]  || 54;
        rhrAvg       = Math.round(rhrHistory28.reduce((a, b) => a + b, 0) / rhrHistory28.length) || 55;

        // HRV rMSSD — pase único
        const computedHrvHist = rhrHistory28.map((rhr_day, i) => {
            const sleep_day = sleepScores28[i] || 75;
            return Math.round(Math.max(25, 58 + (rhrAvg - rhr_day) * 1.5 + (sleep_day - 75) * 0.25));
        });
        currentHrv = computedHrvHist[0] || 60;
        hrvAvg     = Math.round(computedHrvHist.reduce((a, b) => a + b, 0) / computedHrvHist.length) || 58;

        // TSB usando computePMC (reutilizado, no duplicado)
        const loadByDay  = buildLoadByDay(allYearActs);
        const pmcResult  = computePMC(loadByDay, 180); // 180 días de warmup
        const todayPmc   = pmcResult[pmcResult.length - 1];
        const ctl        = Math.round(todayPmc.ctl);
        const atl        = Math.round(todayPmc.atl);
        const tsb        = Math.round(todayPmc.tsb);

        const hrvScoreWeight  = currentHrv >= hrvAvg ? 100 : Math.max(30, 100 - (hrvAvg - currentHrv) * 9);
        const rhrScoreWeight  = currentRhr <= rhrAvg ? 100 : Math.max(35, 100 - (currentRhr - rhrAvg) * 8);
        const tsbScoreWeight  = tsb >= 0 ? 100 : Math.max(35, 100 + tsb * 2.2);
        const readiness       = Math.round((currentSleep * 0.35) + (hrvScoreWeight * 0.25) + (rhrScoreWeight * 0.15) + (tsbScoreWeight * 0.25));

        const systemPrompt = `Eres un científico deportivo de élite y preparador físico experto (estilo Coach de WHOOP, Garmin Readiness Advisor e Intervals.icu). \nAnalizas los datos de rendimiento deportivo del atleta y respondes siempre de forma profesional, motivadora, rigurosa y concisa.\nEl atleta al que entrenas se llama Miguel.\n\nMétricas reales de Miguel de hoy:\n- CTL (Fitness crónico): ${ctl}\n- ATL (Fatiga aguda): ${atl}\n- TSB (Frescura/Estado Coggan): ${tsb} (Zonas: < -30 sobrecarga extrema, -30 a -10 óptimo/carga, -10 a 5 transición, >5 pico de forma)\n- FCR de hoy: ${currentRhr} ppm (media basal: ${rhrAvg} ppm)\n- HRV rMSSD de hoy: ${currentHrv} ms (media basal: ${hrvAvg} ms)\n- Sueño de anoche: ${currentSleep}/100\n- Predisposición (Garmin Training Readiness): ${readiness}/100\n- Días activos en últimas 4 semanas: ${activeDaysCount} días\n\nResponde a las dudas de Miguel asesorándolo sobre su entrenamiento. Relaciona siempre su HRV, TSB y nivel de sueño en tu respuesta para respaldarla científicamente. \nMantén tu respuesta corta y estructurada en un máximo de 2-3 párrafos breves. Usa viñetas para que sea súper legible en dispositivos móviles.`;

        if (process.env.GEMINI_API_KEY) {
            try {
                const contents = [];
                if (chatHistory && Array.isArray(chatHistory)) {
                    chatHistory.slice(-6).forEach(ch => {
                        contents.push({ role: ch.role === 'user' ? 'user' : 'model', parts: [{ text: ch.text }] });
                    });
                }
                contents.push({ role: 'user', parts: [{ text: `${systemPrompt}\n\nPregunta de Miguel: ${message}` }] });
                const result = await callGeminiWithFallback(contents);
                return res.json({ reply: result.text, mock: false, model: result.model });
            } catch (err) {
                console.error('[AI-Coach] Resilient Gemini calls failed:', err.message);
            }
        }

        // Fallback local
        let localReply = '';
        const m        = message.toLowerCase();
        if (m.includes('entrenar') || m.includes('hoy') || m.includes('hacer') || m.includes('series')) {
            if (readiness >= 75) {
                localReply = `¡Hola Miguel! Analizando tus métricas de hoy, veo que tu **Predisposición (Readiness) es excelente (${readiness}/100)**. Tu HRV está en **${currentHrv} ms** (por encima de tu media de ${hrvAvg}ms), lo que indica que tu sistema parasimpático está listo para asimilar cargas elevadas. Tu FCR de **${currentRhr} ppm** es baja y estable. \n\nHoy es un día ideal para meter una sesión exigente:\n* Puedes meter tus **series a umbral (Z4)** o entrenamientos de intensidad.\n* Tu cuerpo asimilará perfectamente el estrés sin riesgo elevado de lesión.\n* ¡Aprovecha la ventana de supercompensación!`;
            } else if (readiness >= 45) {
                localReply = `Hola Miguel. Tus métricas fisiológicas hoy muestran **fatiga acumulada moderada (Readiness: ${readiness}/100)**. Tu TSB marca **${tsb}** (zona de carga de entrenamiento) y tu sueño de anoche fue de **${currentSleep}/100**. Tu HRV está estable en **${currentHrv} ms**.\n\nPara hoy te sugiero modular la carga:\n* Evita entrenamientos de VO2 Máx o series extremas; tu cuerpo está reparando fibras musculares.\n* Te aconsejo realizar un **rodaje aeróbico cómodo (Zona 2 suave)** o entrenamiento regenerativo por debajo de 135 ppm.\n* Mantendrá tu flujo sanguíneo activo y facilitará que mañana estés en una zona más lista.`;
            } else {
                localReply = `¡Hola Miguel! **Alarma de sobrecarga detectada (Readiness: ${readiness}/100)**. Tu sistema nervioso autónomo está fatigado (HRV bajo de **${currentHrv} ms** frente a tu basal de ${hrvAvg}ms), y tu pulso en reposo está elevado a **${currentRhr} ppm**. Además, tu sueño fue insuficiente (**${currentSleep}/100**).\n\nHoy debes dar prioridad absoluta a la recuperación:\n* **Descanso total** o únicamente una sesión de estiramientos muy suaves / yoga.\n* Salir a entrenar duro hoy deprimiría aún más tu HRV, aumentando drásticamente el riesgo de sobreentrenamiento o lesión.\n* ¡Recuerda que el descanso es la fase donde realmente te vuelves más fuerte!`;
            }
        } else {
            localReply = `¡Hola Miguel! Analizando tus datos, tu **Predisposición es de ${readiness}/100** con un HRV actual de **${currentHrv} ms** y un sueño de **${currentSleep}/100**. Tu forma atlética (TSB) actual es de **${tsb}**.\n\nComo tu preparador físico virtual, te recomiendo:\n* **Entrenamiento**: Mantente constante con metas cómodas. Si tu preparación es mayor de 70, puedes meter intensidad; de lo contrario, céntrate en la base.\n* **Descanso**: Prioriza dormir entre 7.5 y 8.5 horas para restaurar tu pasillo biométrico de HRV.`;
            localReply += (process.env.GEMINI_API_KEY ? '\n\n> *Nota del Coach:* Usando el motor de diagnóstico local debido a una desconexión o saturación temporal en la API de Gemini.' : '\n\n> *Nota:* Añade tu `GEMINI_API_KEY` en el archivo `.env` para recibir respuestas 100% dinámicas.');
        }
        res.json({ reply: localReply, mock: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error procesando el asistente deportivo IA' });
    }
});

// ---------------------------
// MÓDULO: REPORTE SEMANAL IA
// ---------------------------
app.get('/api/ai/weekly-report', async (req, res) => {
    try {
        const force    = req.query.force === 'true';
        const now      = new Date();
        const day      = now.getDay();
        const diff     = (day === 0 ? 6 : day - 1);
        const monday   = new Date(now); monday.setDate(now.getDate() - diff);
        const mondayStr = monday.toISOString().split('T')[0];
        const cacheKey  = `weekly_report_${mondayStr}`;

        if (!force) {
            const cachedReport = getAiCached(cacheKey);
            if (cachedReport) { console.log(`[cache hit] weekly-report for week starting ${mondayStr}`); return res.json(cachedReport); }
        }

        const token          = await getValidAccessToken();
        const year           = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        const allYearActs    = await fetchAllActivities(token, 8, afterTimestamp);

        const since28Ms  = Date.now() - 28 * 86400000;
        const acts28     = allYearActs.filter(a => new Date(a.start_date).getTime() > since28Ms);
        const kmTotal    = parseFloat((acts28.reduce((s, a) => s + a.distance, 0) / 1000).toFixed(1));
        const hoursTotal = parseFloat((acts28.reduce((s, a) => s + a.moving_time, 0) / 3600).toFixed(1));

        // TSB usando computePMC (reutilizado)
        const loadByDay = buildLoadByDay(allYearActs);
        const pmcResult = computePMC(loadByDay, 180); // 180 días de warmup
        const todayPmc  = pmcResult[pmcResult.length - 1];
        const tsb       = Math.round(todayPmc.tsb);

        let reportMarkdown = `### 📊 Diagnóstico Fisiológico Semanal\n*Preparado por tu Asistente Deportivo IA (Análisis Fisiológico Local)*\n\n#### 1. Estado Autonómico & HRV (Homeostasis)\n* Tu pulso en reposo promedio se sitúa estable en los rangos basales de **55 ppm**.\n* Tu pasillo biométrico de **HRV rMSSD** muestra un excelente equilibrio parasimpático. Tu sistema de respuesta al estrés está completamente equilibrado, lo que te permite asimilar de manera óptima las sesiones fraccionadas.\n\n#### 2. Distribución de Carga & PMC\n* Tu fitness crónico (**CTL**) se encuentra consolidado, con una fatiga aguda (**ATL**) controlada.\n* Tu **TSB de ${tsb}** se posiciona en una zona productiva de carga. Estás sumando volumen de forma inteligente y progresiva sin disparar la tasa de rampa de lesión.\n\n#### 3. Prescripción de Entrenamiento\n* **Días de Intensidad (Series)**: Ideal programar trabajos de umbral los días con mayor calidad de sueño.\n* **Recuperación**: Mantener al menos 1 día de descanso completo o regenerativo para restablecer tus reservas de glucógeno y disipar la fatiga del sistema nervioso simpático.\n\n\n\n> *Nota del Coach:* Usando el motor de diagnóstico local debido a una desconexión o saturación temporal en la API de Gemini.`;
        let isSimulated = true;

        if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('tu_gemini_api_key')) {
            try {
                const prompt = `Eres un científico deportivo de élite. Escribe un reporte diagnóstico de entrenamiento deportivo personalizado para Miguel basándote en estos datos de sus últimos 28 días:\n- Volumen de 28 días: ${kmTotal} km, ${hoursTotal} horas.\n- Forma física actual (PMC): CTL ${Math.round(todayPmc.ctl)}, ATL ${Math.round(todayPmc.atl)}, TSB ${tsb}.\n- Biometría: Pulso en reposo estable, HRV equilibrado.\n\nEscribe un reporte de 3 secciones cortas en formato Markdown:\n1. Análisis del Balance de Fatiga (TSB y PMC).\n2. Estado de Recuperación y Sueño.\n3. Recomendación estratégica para la semana que entra.\n\nUsa viñetas, mantén el tono profesional pero motivador, e imprímele rigor científico.`;
                const result  = await callGeminiWithFallback(prompt);
                reportMarkdown = result.text;
                isSimulated   = false;
            } catch (err) {
                console.error('[AI-Report] Resilient Gemini calls failed:', err.message);
            }
        }

        const responseData = { report: reportMarkdown };
        if (!isSimulated) await setAiCached(cacheKey, responseData);
        res.json(responseData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generando reporte deportivo IA' });
    }
});

// Servir archivos estáticos del frontend en producción
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
    console.log(`Serving static files from ${frontendDistPath}`);
    app.use(express.static(frontendDistPath));
    app.get(/.*/, (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
} else {
    console.log('Static frontend directory not found. Running in API-only mode.');
}

app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));
