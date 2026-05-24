require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const TOKENS_FILE = path.join(__dirname, 'tokens.json');

// Utilidades de conversión
const metersToKm = (meters) => (meters / 1000).toFixed(2);
const secondsToHhMmSs = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
// GESTIÓN DE TOKENS
// ---------------------------
function getTokens() {
    if (fs.existsSync(TOKENS_FILE)) return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    return null;
}
function saveTokens(tokens) {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}
async function getValidAccessToken() {
    let tokens = getTokens();
    if (!tokens || !tokens.refresh_token) throw new Error('NO_TOKEN');
    const now = Math.floor(Date.now() / 1000);
    if (now >= tokens.expires_at - 300) {
        try {
            const response = await axios.post('https://www.strava.com/oauth/token', null, {
                params: {
                    client_id: process.env.STRAVA_CLIENT_ID,
                    client_secret: process.env.STRAVA_CLIENT_SECRET,
                    grant_type: 'refresh_token',
                    refresh_token: tokens.refresh_token
                }
            });
            tokens = { access_token: response.data.access_token, refresh_token: response.data.refresh_token, expires_at: response.data.expires_at };
            saveTokens(tokens);
        } catch (error) {
            throw new Error('TOKEN_REFRESH_FAILED');
        }
    }
    return tokens.access_token;
}

const WITHINGS_TOKENS_FILE = path.join(__dirname, 'withings_tokens.json');

function getWithingsTokens() {
    if (fs.existsSync(WITHINGS_TOKENS_FILE)) return JSON.parse(fs.readFileSync(WITHINGS_TOKENS_FILE, 'utf8'));
    return null;
}
function saveWithingsTokens(tokens) {
    fs.writeFileSync(WITHINGS_TOKENS_FILE, JSON.stringify(tokens, null, 2));
}
async function getWithingsValidAccessToken() {
    let tokens = getWithingsTokens();
    if (!tokens || !tokens.refresh_token) throw new Error('NO_WITHINGS_TOKEN');
    const now = Math.floor(Date.now() / 1000);
    if (now >= tokens.expires_at - 300) {
        try {
            console.log("[Withings] Refreshing access token...");
            const response = await axios.post('https://wbsapi.withings.net/v2/oauth2', 
                new URLSearchParams({
                    action: 'requesttoken',
                    grant_type: 'refresh_token',
                    client_id: process.env.WITHINGS_CLIENT_ID,
                    client_secret: process.env.WITHINGS_CLIENT_SECRET,
                    refresh_token: tokens.refresh_token
                }).toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            if (response.data && response.data.status === 0 && response.data.body) {
                const body = response.data.body;
                tokens = {
                    access_token: body.access_token,
                    refresh_token: body.refresh_token,
                    expires_at: Math.floor(Date.now() / 1000) + body.expires_in,
                    userid: body.userid
                };
                saveWithingsTokens(tokens);
            } else {
                throw new Error(response.data?.error || 'WITHINGS_REFRESH_API_ERROR');
            }
        } catch (error) {
            console.error("[Withings] Error refreshing token:", error.response?.data || error.message);
            throw new Error('WITHINGS_TOKEN_REFRESH_FAILED');
        }
    }
    return tokens.access_token;
}

// ---------------------------
// AUTENTICACIÓN
// ---------------------------
app.get('/api/auth/login', (req, res) => {
    const scope = 'activity:read_all';
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${process.env.STRAVA_REDIRECT_URI}&approval_prompt=force&scope=${scope}`;
    res.redirect(authUrl);
});
app.get('/api/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('No se proporcionó código');
    try {
        const response = await axios.post('https://www.strava.com/oauth/token', null, {
            params: { client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, code, grant_type: 'authorization_code' }
        });
        saveTokens({ access_token: response.data.access_token, refresh_token: response.data.refresh_token, expires_at: response.data.expires_at });
        res.redirect(process.env.FRONTEND_URL || '/');
    } catch (error) {
        res.status(500).send('Error durante la autenticación con Strava');
    }
});
app.get('/api/auth/status', async (req, res) => {
    try { await getValidAccessToken(); res.json({ authenticated: true }); }
    catch (e) { res.json({ authenticated: false }); }
});

// ---------------------------
// AUTENTICACIÓN WITHINGS
// ---------------------------
app.get('/api/withings/auth/login', (req, res) => {
    if (!process.env.WITHINGS_CLIENT_ID) {
        return res.status(400).send("Withings API no está configurada en este servidor. Por favor, define WITHINGS_CLIENT_ID en el archivo .env.");
    }
    const state = Math.random().toString(36).substring(2, 15);
    const scope = 'user.metrics,user.activity';
    const authUrl = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${process.env.WITHINGS_CLIENT_ID}&state=${state}&scope=${scope}&redirect_uri=${process.env.WITHINGS_REDIRECT_URI}`;
    res.redirect(authUrl);
});

app.get('/api/withings/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('No se proporcionó código de Withings');
    try {
        console.log("[Withings] Requesting token with authorization code...");
        const response = await axios.post('https://wbsapi.withings.net/v2/oauth2', 
            new URLSearchParams({
                action: 'requesttoken',
                grant_type: 'authorization_code',
                client_id: process.env.WITHINGS_CLIENT_ID,
                client_secret: process.env.WITHINGS_CLIENT_SECRET,
                code,
                redirect_uri: process.env.WITHINGS_REDIRECT_URI
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (response.data && response.data.status === 0 && response.data.body) {
            const body = response.data.body;
            saveWithingsTokens({
                access_token: body.access_token,
                refresh_token: body.refresh_token,
                expires_at: Math.floor(Date.now() / 1000) + body.expires_in,
                userid: body.userid
            });
            res.redirect(process.env.FRONTEND_URL || '/');
        } else {
            console.error("[Withings] Auth API failed:", response.data);
            res.status(500).send('Error de Withings API: ' + (response.data?.error || 'status no cero'));
        }
    } catch (error) {
        console.error("[Withings] Error during authentication callback:", error.response?.data || error.message);
        res.status(500).send('Error durante la autenticación con Withings');
    }
});

app.get('/api/withings/auth/status', async (req, res) => {
    try {
        await getWithingsValidAccessToken();
        res.json({ authenticated: true });
    } catch (e) {
        res.json({ authenticated: false });
    }
});

// ---------------------------
// HELPER: Procesar actividades
// ---------------------------
// Resuelve el tipo real de actividad priorizando sport_type (nuevo) sobre type (deprecado)
function resolveType(act) {
    return act.sport_type || act.type || '';
}

function categorizeActivity(act) {
    const label = resolveTypeForMap(act);
    if (['Running', 'Ciclismo', 'Andar'].includes(label)) return 'Endurance';
    if (['Ciclo Indoor', 'Pesas', 'Estiramientos'].includes(label)) return 'Indoor/Gym';
    if (['Natación'].includes(label)) return 'Natación';
    return 'Otras';
}

function processActivity(act) {
    const category = categorizeActivity(act);
    const label = resolveTypeForMap(act);
    let extraMetrics = {};
    if (category === 'Endurance') {
        extraMetrics = {
            distanceKm: metersToKm(act.distance),
            durationFormated: secondsToHhMmSs(act.moving_time),
            paceOrSpeed: label === 'Ciclismo' || label === 'Ciclo Indoor' ? `${formatSpeed(act.average_speed)} km/h` : `${formatPace(act.average_speed)} /km`
        };
    } else if (category === 'Indoor') {
        extraMetrics = { durationFormated: secondsToHhMmSs(act.moving_time), avgHr: act.has_heartrate ? act.average_heartrate : 0, maxHr: act.has_heartrate ? act.max_heartrate : 0 };
    } else if (category === 'Natación') {
        extraMetrics = { totalMeters: act.distance, durationFormated: secondsToHhMmSs(act.moving_time), timePer100m: formatPace(act.average_speed) };
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
const CACHE = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

function getCached(key) {
    const e = CACHE[key];
    if (e && Date.now() - e.ts < CACHE_TTL_MS) return e.data;
    return null;
}
function setCache(key, data) { CACHE[key] = { data, ts: Date.now() }; }

// Trae actividades paginadas con caché compartida — petición SECUENCIAL
// Trae actividades paginadas con caché compartida — petición SECUENCIAL (MÁS RECIENTES PRIMERO)
async function fetchAllActivities(token, pages = 8, afterTimestamp = null) {
    const cacheKey = `acts_${pages}_${afterTimestamp || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) { console.log(`[cache hit] ${cacheKey}`); return cached; }

    let rateLimited = false;
    const all = [];
    for (let i = 1; i <= pages; i++) {
        // NO usamos 'after' en la URL para que Strava devuelva las más recientes primero (orden por defecto)
        let url = `https://www.strava.com/api/v3/athlete/activities?per_page=50&page=${i}`;
        try {
            const r = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
            const data = r.data || [];
            
            // Si usamos afterTimestamp, filtramos aquí
            if (afterTimestamp) {
                const filtered = data.filter(act => Math.floor(new Date(act.start_date).getTime() / 1000) >= afterTimestamp);
                all.push(...filtered);
                // Si en esta página ya hay actividades anteriores al timestamp, no hace falta pedir más páginas
                if (filtered.length < data.length) break;
            } else {
                all.push(...data);
            }
            
            if (data.length < 50) break; 
        } catch (e) {
            if (e.response?.status === 429) {
                console.warn(`Rate limit en página ${i}, usando ${all.length} actividades (las más recientes)`);
                rateLimited = true;
                break;
            }
            throw e;
        }
    }
    if (all.length > 0 || !rateLimited) {
        setCache(cacheKey, all);
    }
    return all;
}

// Endpoint de actividades recientes (corto, sin caché propia)
async function fetchRecentActivities(token, afterTimestamp) {
    // Redondeamos el timestamp a la hora más cercana para estabilizar la cacheKey
    const hourlyTimestamp = Math.floor(afterTimestamp / 3600) * 3600;
    const cacheKey = `recent_${hourlyTimestamp}`;
    const cached = getCached(cacheKey);
    if (cached) { console.log(`[cache hit] ${cacheKey}`); return cached; }
    try {
        const r = await axios.get(
            `https://www.strava.com/api/v3/athlete/activities?per_page=50&after=${afterTimestamp}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = r.data || [];
        setCache(cacheKey, data);
        return data;
    } catch (e) {
        if (e.response?.status === 429) {
            console.warn(`Rate limit en actividades recientes`);
            return [];
        }
        throw e;
    }
}


// ---------------------------
// ENDPOINT: ACTIVIDADES (últimas 50)
// ---------------------------
// ---------------------------
// DIAGNÓSTICO: Ver tipos reales de actividad en Strava
// ---------------------------
app.get('/api/debug/types', async (req, res) => {
    try {
        const token = await getValidAccessToken();
        const r = await axios.get('https://www.strava.com/api/v3/athlete/activities?per_page=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        // Devolver un resumen de los types y sport_types únicos
        const summary = r.data.map(a => ({
            name: a.name,
            type: a.type,
            sport_type: a.sport_type,
            resolved: resolveTypeForMap(a) || '(no mapeado)'
        }));
        // Agrupar por tipo para ver frecuencias
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

app.get('/api/activities', async (req, res) => {
    try {
        const token = await getValidAccessToken();
        const stravaRes = await axios.get('https://www.strava.com/api/v3/athlete/activities?per_page=50', {
            headers: { Authorization: `Bearer ${token}` }
        });
        res.json(stravaRes.data.map(processActivity));
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') {
            res.status(401).json({ error: 'No autenticado con Strava' });
        } else {
            res.status(500).json({ error: 'Error obteniendo datos de Strava' });
        }
    }

});

// ---------------------------
// ENDPOINT: PROGRESO ANUAL (Ciclismo + Running vs objetivo)
// ---------------------------
app.get('/api/annual-progress', async (req, res) => {
    try {
        const token = await getValidAccessToken();
        const year = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

        // Reutiliza la caché de actividades (comparte con /api/stats y /api/fitness)
        const yearActivities = await fetchAllActivities(token, 8, afterTimestamp);
        console.log(`[annual-progress] Procesando ${yearActivities.length} actividades para el año ${year}`);

        const isCycling = (act) => {
            const t = act.sport_type || act.type || '';
            return ['Ride','VirtualRide','GravelRide','MountainBikeRide','EBikeRide','IndoorCycling'].includes(t);
        };
        const isIndoorCycling = (act) => {
            const t = act.sport_type || act.type || '';
            const name = (act.name || '').toLowerCase();
            return t === 'VirtualRide' || t === 'IndoorCycling' || act.trainer === true || act.indoor === true || 
                   name.includes('indoor') || name.includes('cicloindoor') || name.includes('rodillo');
        };
        const isRunning = (act) => ['Run','TrailRun','VirtualRun'].includes(act.sport_type || act.type || '');

        const months = Array.from({ length: 12 }, (_, m) => ({
            month: MONTHS_ES[m], monthIdx: m, cycling: 0, cicloIndoor: 0, running: 0, totalCycling: 0
        }));

        let totalCycling = 0, totalCicloIndoor = 0, totalRunning = 0;

        yearActivities.forEach(act => {
            const m = new Date(act.start_date).getMonth();
            const km = parseFloat((act.distance / 1000).toFixed(2));
            if (isCycling(act)) {
                if (isIndoorCycling(act)) { months[m].cicloIndoor += km; totalCicloIndoor += km; }
                else { months[m].cycling += km; totalCycling += km; }
            } else if (isRunning(act)) {
                months[m].running += km; totalRunning += km;
            }
        });

        months.forEach(m => {
            m.cycling     = parseFloat(m.cycling.toFixed(1));
            m.cicloIndoor = parseFloat(m.cicloIndoor.toFixed(1));
            m.running     = parseFloat(m.running.toFixed(1));
            m.totalCycling = parseFloat((m.cycling + m.cicloIndoor).toFixed(1));
        });

        const currentMonth = new Date().getMonth();
        const monthsElapsed = currentMonth + 1;
        const totalCyclingAll = parseFloat((totalCycling + totalCicloIndoor).toFixed(1));
        const avgCycling = totalCyclingAll / monthsElapsed;
        const avgRunning = totalRunning / monthsElapsed;

        res.json({
            year,
            goals: { cycling: 4000, running: 700 },
            totals: {
                cycling: totalCyclingAll,
                cyclingOutdoor: parseFloat(totalCycling.toFixed(1)),
                cyclingIndoor: parseFloat(totalCicloIndoor.toFixed(1)),
                running: parseFloat(totalRunning.toFixed(1))
            },
            projected: {
                cycling: parseFloat((avgCycling * 12).toFixed(0)),
                running: parseFloat((avgRunning * 12).toFixed(0))
            },
            kmNeeded: {
                cycling: parseFloat(Math.max(0, 4000 - totalCyclingAll).toFixed(1)),
                running: parseFloat(Math.max(0, 700 - totalRunning).toFixed(1))
            },
            monthsRemaining: 12 - monthsElapsed,
            monthly: months.slice(0, monthsElapsed + 1)
        });
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') res.status(401).json({ error: 'No autenticado' });
        else { console.error(error.message); res.status(500).json({ error: 'Error calculando progreso anual' }); }
    }
});
// ---------------------------
// ENDPOINT: HISTÓRICO POR AÑOS (Ciclismo + Running)
// ---------------------------
app.get('/api/history', async (req, res) => {
    try {
        const token = await getValidAccessToken();
        const cacheKey = 'history_all_years';
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        // Traemos muchísimas páginas para intentar cubrir todo el histórico (60 páginas = 3000 actividades)
        const allActivities = await fetchAllActivities(token, 60);

        const history = {};

        allActivities.forEach(act => {
            const d = new Date(act.start_date);
            const year = d.getFullYear();
            if (!history[year]) {
                history[year] = { year, cycling: 0, running: 0 };
            }

            const km = parseFloat((act.distance / 1000).toFixed(2));
            const t = act.sport_type || act.type || '';

            const isCycling = ['Ride','VirtualRide','GravelRide','MountainBikeRide','EBikeRide','IndoorCycling'].includes(t);
            const isRunning = ['Run','TrailRun','VirtualRun'].includes(t);

            if (isCycling) {
                history[year].cycling += km;
            } else if (isRunning) {
                history[year].running += km;
            }
        });

        const result = Object.values(history).map(h => ({
            year: h.year,
            cycling: parseFloat(h.cycling.toFixed(1)),
            running: parseFloat(h.running.toFixed(1)),
            total: parseFloat((h.cycling + h.running).toFixed(1))
        })).sort((a, b) => b.year - a.year);

        setCache(cacheKey, result);
        res.json(result);
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') res.status(401).json({ error: 'No autenticado' });
        else res.status(500).json({ error: 'Error obteniendo histórico' });
    }
});

// Mapa de tipos Strava → etiquetas amigables (cubre type y sport_type, antiguo y nuevo)
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
    // Pesas / Gym — todas las variantes conocidas de Strava
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
const TRACKED_ACTIVITIES = ['Ciclismo','Ciclo Indoor','Running','Andar','Pesas','Estiramientos','Natación'];

// Helper para resolver tipo de actividad con ambos campos
// CLAVE: Si es un Ride con trainer:true o indoor:true → Ciclo Indoor
// (Strava marca las sesiones de rodillo/cicloindoor con el flag trainer=true aunque el type sea "Ride")
function resolveTypeForMap(act) {
    const baseType = act.sport_type || act.type || '';
    const name = (act.name || '').toLowerCase();
    const isIndoor = baseType === 'VirtualRide' || baseType === 'IndoorCycling' || 
                    act.trainer === true || act.indoor === true ||
                    name.includes('indoor') || name.includes('cicloindoor') || name.includes('rodillo');

    if (isIndoor && (baseType === 'Ride' || baseType === 'EBikeRide' || baseType === 'VirtualRide' || baseType === 'IndoorCycling')) {
        return 'Ciclo Indoor';
    }
    return ACTIVITY_TYPE_MAP[act.sport_type] || ACTIVITY_TYPE_MAP[act.type] || null;
}

// ---------------------------
// ENDPOINT: ESTADÍSTICAS (Diario / Mensual / Anual)
// ---------------------------
app.get('/api/stats', async (req, res) => {
    try {
        const token = await getValidAccessToken();
        const year = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        
        // Unificado: 8 páginas desde el 1 de enero
        const allActivities = await fetchAllActivities(token, 8, afterTimestamp);

        const daily = {};
        const monthly = {};
        const annual = {};
        const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

        allActivities.forEach(act => {
            const actLabel = resolveTypeForMap(act);
            if (!actLabel) return; // ignorar actividades no contempladas

            const date = new Date(act.start_date);
            const dayKey   = `${date.getDate().toString().padStart(2,'0')} ${MONTHS_ES[date.getMonth()]}`;
            const monthKey = `${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`;
            const yearKey  = `${date.getFullYear()}`;
            const sortDay   = date.getFullYear() * 10000 + (date.getMonth()+1) * 100 + date.getDate();
            const sortMonth = date.getFullYear() * 100 + (date.getMonth()+1);
            const sortYear  = date.getFullYear();

            const durationMin = parseFloat((act.moving_time / 60).toFixed(1));
            const distanceKm  = parseFloat((act.distance / 1000).toFixed(2));

            const emptyRow = (key, sortVal) => {
                const row = { label: key, _sort: sortVal, count: 0, durationMin: 0, distanceKm: 0 };
                TRACKED_ACTIVITIES.forEach(a => row[a] = 0);
                return row;
            };

            const addToGroup = (group, key, sortVal) => {
                if (!group[key]) group[key] = emptyRow(key, sortVal);
                group[key].count      += 1;
                group[key].durationMin = parseFloat((group[key].durationMin + durationMin).toFixed(1));
                group[key].distanceKm  = parseFloat((group[key].distanceKm + distanceKm).toFixed(2));
                group[key][actLabel]   = (group[key][actLabel] || 0) + 1;
            };

            addToGroup(daily,   dayKey,   sortDay);
            addToGroup(monthly, monthKey, sortMonth);
            addToGroup(annual,  yearKey,  sortYear);
        });

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
            console.error("Error en /api/stats:", error.response?.data || error.message);
            res.status(500).json({ error: 'Error obteniendo estadísticas' });
        }
    }
});

// ---------------------------
// ENDPOINT: SALUD (mock)
// ---------------------------
app.get('/api/health', async (req, res) => {
    const defaultHydration = { dailyGoal: 3.0, currentLiters: 2.2, previousLiters: 1.8, history: [2.0, 2.5, 1.8, 3.1, 2.2] };
    
    try {
        const withingsToken = await getWithingsValidAccessToken();
        console.log("[Withings] Fetching weight/body fat biometrics from API...");
        const response = await axios.post('https://wbsapi.withings.net/measure', 
            new URLSearchParams({ action: 'getmeas' }).toString(),
            {
                headers: {
                    'Authorization': `Bearer ${withingsToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        if (response.data && response.data.status === 0 && response.data.body && response.data.body.measuregrps) {
            const grps = response.data.body.measuregrps;
            const weights = [];
            const fats = [];
            
            grps.forEach(grp => {
                grp.measures.forEach(m => {
                    const realValue = m.value * Math.pow(10, m.unit);
                    if (m.type === 1) {
                        weights.push(parseFloat(realValue.toFixed(1)));
                    } else if (m.type === 6) {
                        fats.push(parseFloat(realValue.toFixed(1)));
                    }
                });
            });
            
            const currentWeight = weights[0] || 75.2;
            const prevWeight = weights[1] || 76.0;
            const weightHistory = weights.slice(0, 10).reverse();
            if (weightHistory.length === 0) weightHistory.push(76, 75.8, 75.5, 75.4, 75.2);
            
            const currentFat = fats[0] || 15.5;
            const prevFat = fats[1] || 16.0;
            
            res.json({
                weight: {
                    current: currentWeight,
                    goal: 74.0,
                    previous: prevWeight,
                    history: weightHistory
                },
                bodyFat: {
                    current: currentFat,
                    goal: 14.0,
                    previous: prevFat
                },
                hydration: defaultHydration,
                withingsConnected: true
            });
        } else {
            console.warn("[Withings] API status no cero o body vacío:", response.data);
            throw new Error('WITHINGS_API_BAD_STATUS');
        }
    } catch (e) {
        console.log(`[Health] Usando datos simulados (Withings no conectado/error: ${e.message})`);
        res.json({
            weight:    { current: 75.2, goal: 74.0, previous: 76.0, history: [76, 75.8, 75.5, 75.4, 75.2] },
            bodyFat:   { current: 15.5, goal: 14.0, previous: 16.0 },
            hydration: defaultHydration,
            withingsConnected: false
        });
    }
});

// ---------------------------
// MÓDULO 1: FITNESS (ATL / CTL / TSB)
// ---------------------------
// Calcula carga aguda (ATL 7d) y crónica (CTL 42d) usando suffer_score o estimación por HR/duración
app.get('/api/fitness', async (req, res) => {
    try {
        const token = await getValidAccessToken();
        const year = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        
        // Unificado: 8 páginas desde el 1 de enero
        const allActivities = await fetchAllActivities(token, 8, afterTimestamp);

        // ----------------------------------------
        // CONSULTA DE SUEÑO Y PESO DE WITHINGS (180 DÍAS)
        // ----------------------------------------
        const sleepMap = {};
        const weightMap = {};
        let averageRhr = 55;
        let withingsConnected = false;

        try {
            const withingsToken = await getWithingsValidAccessToken();
            const today = new Date();
            const hundredEightyDaysAgo = new Date();
            hundredEightyDaysAgo.setDate(today.getDate() - 180);
            
            const startdateymd = hundredEightyDaysAgo.toISOString().split('T')[0];
            const enddateymd = today.toISOString().split('T')[0];

            console.log("[Withings-PMC] Fetching 180 days of sleep summaries...");
            const sleepResponse = await axios.post('https://wbsapi.withings.net/v2/sleep', 
                new URLSearchParams({ action: 'getsummary', startdateymd, enddateymd }).toString(),
                {
                    headers: {
                        'Authorization': `Bearer ${withingsToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            if (sleepResponse.data && sleepResponse.data.status === 0 && sleepResponse.data.body && sleepResponse.data.body.series) {
                const series = sleepResponse.data.body.series;
                const allRhrs = series.map(s => s.data.hr_average).filter(hr => hr > 0);
                if (allRhrs.length > 0) {
                    averageRhr = Math.round(allRhrs.reduce((a, b) => a + b, 0) / allRhrs.length);
                }

                series.forEach(s => {
                    sleepMap[s.date] = {
                        score: s.data.sleep_score || 75,
                        rhr: s.data.hr_average || 55
                    };
                });
                withingsConnected = true;
            }

            console.log("[Withings-PMC] Fetching 180 days of weight measurements...");
            const startdate = Math.floor(hundredEightyDaysAgo.getTime() / 1000);
            const enddate = Math.floor(today.getTime() / 1000);
            const measureResponse = await axios.post('https://wbsapi.withings.net/measure', 
                new URLSearchParams({ action: 'getmeas', startdate, enddate }).toString(),
                {
                    headers: {
                        'Authorization': `Bearer ${withingsToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            if (measureResponse.data && measureResponse.data.status === 0 && measureResponse.data.body && measureResponse.data.body.measuregrps) {
                measureResponse.data.body.measuregrps.forEach(grp => {
                    const dateStr = new Date(grp.date * 1000).toISOString().split('T')[0];
                    grp.measures.forEach(m => {
                        if (m.type === 1) { // Peso
                            const realValue = m.value * Math.pow(10, m.unit);
                            weightMap[dateStr] = parseFloat(realValue.toFixed(1));
                        }
                    });
                });
            }
        } catch (e) {
            console.log(`[Withings-PMC] Sincronización biométrica PMC no disponible: ${e.message}`);
        }

        // Construir mapa fecha -> carga diaria (TRIMP proxy)
        const loadByDay = {};
        allActivities.forEach(act => {
            const dateStr = new Date(act.start_date).toISOString().split('T')[0];
            let load = act.suffer_score || 0;
            if (!load && act.moving_time) {
                const hrFactor = act.has_heartrate ? (act.average_heartrate / 150) : 0.7;
                load = Math.round((act.moving_time / 60) * hrFactor * 0.5);
            }
            
            // Ajustar TSS según peso corporal real Withings del día
            const isWeightSensitive = act.type === 'Run' || act.type === 'Walk' || act.type === 'Ride' || act.type === 'VirtualRide';
            const dailyWeight = weightMap[dateStr];
            if (isWeightSensitive && dailyWeight) {
                load = Math.round(load * (dailyWeight / 74.0)); // 74kg peso objetivo base
            }

            loadByDay[dateStr] = (loadByDay[dateStr] || 0) + load;
        });

        // Generar array de los últimos 180 días
        const days = [];
        let ctl = 0, atl = 0;
        const ctlDecay = Math.exp(-1/42), atlDecay = Math.exp(-1/7);

        for (let i = 179; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const load = loadByDay[dateStr] || 0;
            ctl = ctl * ctlDecay + load * (1 - ctlDecay);
            atl = atl * atlDecay + load * (1 - atlDecay);
            const tsb = ctl - atl;
            
            // Calcular TSB Fisiológico con biometría Withings
            let tsbPhysio = tsb;
            const sleepInfo = sleepMap[dateStr];
            if (sleepInfo) {
                const sleepScore = sleepInfo.score;
                const currentRhr = sleepInfo.rhr;
                const sleepFactor = (sleepScore - 75) / 100;
                let rhrScore = 0;
                if (currentRhr > 0) {
                    const rhrDiff = currentRhr - averageRhr;
                    rhrScore = -rhrDiff * 2; // Multiplicador de penalización aprobado por el usuario
                }
                tsbPhysio = tsb + (sleepFactor * 15) + rhrScore;
            }

            days.push({
                date: dateStr,
                label: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                ctl: parseFloat(ctl.toFixed(1)),
                atl: parseFloat(atl.toFixed(1)),
                tsb: parseFloat(tsb.toFixed(1)),
                tsbPhysio: parseFloat(tsbPhysio.toFixed(1)),
                load,
                hasPhysio: !!sleepInfo
            });
        }
        res.json(days);
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') res.status(401).json({ error: 'No autenticado' });
        else { console.error(error.message); res.status(500).json({ error: 'Error calculando fitness' }); }
    }
});

// ---------------------------
// MÓDULO 2: METAS SEMANALES
// ---------------------------
const GOALS_FILE = path.join(__dirname, 'goals.json');
const DEFAULT_GOALS = {
    Running:      { unit: 'km',       target: 30,  icon: '🏃' },
    Ciclismo:     { unit: 'km',       target: 100, icon: '🚴' },
    'Ciclo Indoor':{ unit: 'km',       target: 50,  icon: '🏋️' },
    Natación:     { unit: 'm',        target: 4000,icon: '🏊' },
    Pesas:        { unit: 'sesiones', target: 3,   icon: '💪' },
    Estiramientos:{ unit: 'min',      target: 60,  icon: '🧘' },
    Andar:        { unit: 'km',       target: 20,  icon: '🚶' },
};

function loadGoals() {
    if (fs.existsSync(GOALS_FILE)) {
        const saved = JSON.parse(fs.readFileSync(GOALS_FILE, 'utf8'));
        // Fusionar los targets guardados con los tipos/unidades por defecto
        const merged = { ...DEFAULT_GOALS };
        Object.keys(saved).forEach(k => {
            if (merged[k]) merged[k].target = saved[k].target;
        });
        return merged;
    }
    return DEFAULT_GOALS;
}

app.get('/api/goals', async (req, res) => {
    try {
        const token = await getValidAccessToken();
        const goals = loadGoals();

        const year = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        const allYearActs = await fetchAllActivities(token, 8, afterTimestamp);

        // Actividades de la SEMANA ACTUAL (Lunes a Domingo)
        const now = new Date();
        const day = now.getDay(); // 0 (Dom) a 6 (Sab)
        const diff = (day === 0 ? 6 : day - 1); // Diferencia con el lunes anterior
        const monday = new Date(now);
        monday.setDate(now.getDate() - diff);
        monday.setHours(0, 0, 0, 0);
        
        const sinceMondayMs = monday.getTime();
        const weekActs = allYearActs.filter(a => new Date(a.start_date).getTime() >= sinceMondayMs);
        const progress = {};

        Object.keys(goals).forEach(sport => {
            const g = goals[sport];
            let achieved = 0;
            const matched = weekActs.filter(a => resolveTypeForMap(a) === sport);

            if (g.unit === 'km')       achieved = parseFloat((matched.reduce((s, a) => s + a.distance, 0) / 1000).toFixed(1));
            else if (g.unit === 'm')   achieved = parseFloat(matched.reduce((s, a) => s + a.distance, 0).toFixed(0));
            else if (g.unit === 'min') achieved = parseFloat((matched.reduce((s, a) => s + a.moving_time, 0) / 60).toFixed(0));
            else if (g.unit === 'sesiones') achieved = matched.length;

            // Racha: semanas consecutivas cumpliendo (simplificado: si cumples esta semana +1)
            const pct = Math.min(100, parseFloat(((achieved / g.target) * 100).toFixed(1)));
            progress[sport] = { ...g, achieved, pct };
        });

        res.json(progress);
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') res.status(401).json({ error: 'No autenticado' });
        else { console.error(error.message); res.status(500).json({ error: 'Error obteniendo metas' }); }
    }
});

app.post('/api/goals', (req, res) => {
    try {
        const current = loadGoals();
        const updated = { ...current, ...req.body };
        fs.writeFileSync(GOALS_FILE, JSON.stringify(updated, null, 2));
        res.json({ ok: true, goals: updated });
    } catch (e) { res.status(500).json({ error: 'Error guardando metas' }); }
});

// ---------------------------
// MÓDULO 3: EVOLUCIÓN DE RENDIMIENTO
// ---------------------------
app.get('/api/performance', async (req, res) => {
    try {
        const token = await getValidAccessToken();
        const year = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
        
        // Unificado: 8 páginas desde el 1 de enero
        const allActivities = await fetchAllActivities(token, 8, afterTimestamp);

        const running = [], cycling = [], swim = [];
        allActivities.forEach(act => {
            const date = new Date(act.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            if (act.type === 'Run' && act.average_speed > 0) {
                const pace = parseFloat((1000 / act.average_speed / 60).toFixed(2));
                running.push({ date, pace, distanceKm: parseFloat((act.distance/1000).toFixed(1)), name: act.name });
            }
            if ((act.type === 'Ride' || act.type === 'VirtualRide') && act.average_speed > 0) {
                const speed = parseFloat((act.average_speed * 3.6).toFixed(1));
                cycling.push({ date, speed, distanceKm: parseFloat((act.distance/1000).toFixed(1)), name: act.name });
            }
            if (act.type === 'Swim' && act.average_speed > 0) {
                const per100 = parseFloat((100 / act.average_speed / 60).toFixed(2));
                swim.push({ date, per100, distanceM: act.distance, name: act.name });
            }
        });

        res.json({ running: running.reverse().slice(-30), cycling: cycling.reverse().slice(-30), swim: swim.reverse().slice(-20) });
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') res.status(401).json({ error: 'No autenticado' });
        else res.status(500).json({ error: 'Error obteniendo performance' });
    }
});

// ---------------------------
// MÓDULO 5: RECUPERACIÓN
// ---------------------------
app.get('/api/recovery', async (req, res) => {
    try {
        const token = await getValidAccessToken();
        const year = new Date().getFullYear();
        const afterTimestamp = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);

        // Usar la misma caché que el progreso anual para que no haya discrepancias
        const allYearActs = await fetchAllActivities(token, 8, afterTimestamp);

        // Filtrar para los últimos 28 días
        const since28Ms = Date.now() - 28 * 86400000;
        const acts = allYearActs.filter(a => new Date(a.start_date).getTime() > since28Ms);

        // Días activos en las últimas 4 semanas
        const activeDays = new Set(acts.map(a => new Date(a.start_date).toISOString().split('T')[0]));
        const totalDays = 28;
        const restDays = totalDays - activeDays.size;

        // Días consecutivos actuales
        let streak = 0;
        for (let i = 0; i < 14; i++) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            if (activeDays.has(key)) streak++;
            else break;
        }

        // Zonas FC (si hay datos de HR)
        const hrActs = acts.filter(a => a.has_heartrate && a.average_heartrate);
        const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
        hrActs.forEach(a => {
            const pct = a.average_heartrate;
            const dur = a.moving_time / 60;
            if (pct < 114)      zones.z1 += dur;
            else if (pct < 152) zones.z2 += dur;
            else if (pct < 171) zones.z3 += dur;
            else if (pct < 190) zones.z4 += dur;
            else                 zones.z5 += dur;
        });
        const totalZoneMin = Object.values(zones).reduce((s, v) => s + v, 0) || 1;
        const zonePcts = Object.fromEntries(Object.entries(zones).map(([k, v]) => [k, parseFloat(((v/totalZoneMin)*100).toFixed(1))]));

        // Últimas 28 días como array (para el mini-calendario de recuperación)
        const last28 = Array.from({ length: 28 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (27 - i));
            const key = d.toISOString().split('T')[0];
            return { date: key, label: d.getDate(), active: activeDays.has(key) };
        });

        // ----------------------------------------
        // INTEGRACIÓN BIOMÉTRICA DE WITHINGS (SUEÑO / FCR)
        // ----------------------------------------
        let sleepData = null;
        let rhrData = null;
        let withingsConnected = false;

        // Arrays de 28 días para el histórico completo
        let sleepHistory28 = [];
        let rhrHistory28 = [];
        let sleepScores28 = [];

        try {
            const withingsToken = await getWithingsValidAccessToken();
            console.log("[Withings] Fetching 28 days of sleep summary data...");
            const today = new Date();
            const twentyEightDaysAgo = new Date();
            twentyEightDaysAgo.setDate(today.getDate() - 28);
            
            const startdateymd = twentyEightDaysAgo.toISOString().split('T')[0];
            const enddateymd = today.toISOString().split('T')[0];

            const sleepResponse = await axios.post('https://wbsapi.withings.net/v2/sleep', 
                new URLSearchParams({
                    action: 'getsummary',
                    startdateymd,
                    enddateymd
                }).toString(),
                {
                    headers: {
                        'Authorization': `Bearer ${withingsToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            if (sleepResponse.data && sleepResponse.data.status === 0 && sleepResponse.data.body && sleepResponse.data.body.series) {
                const series = sleepResponse.data.body.series; // Orden descendente (los más recientes primero)
                
                // Extraer arrays de 28 días completos
                sleepHistory28 = series.map(s => parseFloat((s.data.total_sleep_time / 3600).toFixed(1)));
                rhrHistory28 = series.map(s => s.data.hr_average).filter(hr => hr > 0);
                sleepScores28 = series.map(s => s.data.sleep_score || 75);

                const avgSleep = sleepHistory28.length > 0 
                    ? parseFloat((sleepHistory28.reduce((a, b) => a + b, 0) / sleepHistory28.length).toFixed(1)) 
                    : 7.2;
                
                const avgRhr = rhrHistory28.length > 0 
                    ? Math.round(rhrHistory28.reduce((a, b) => a + b, 0) / rhrHistory28.length) 
                    : 56;
                
                const currentSleepScore = sleepScores28[0] || 75;

                sleepData = {
                    history: [...sleepHistory28].slice(0, 28).reverse(),
                    average: avgSleep,
                    currentScore: currentSleepScore
                };
                
                rhrData = {
                    history: [...rhrHistory28].slice(0, 28).reverse(),
                    average: avgRhr,
                    current: rhrHistory28[0] || 55
                };
                
                withingsConnected = true;
            }
        } catch (e) {
            console.log(`[Recovery] Withings sleep data not available or failed: ${e.message}`);
        }

        // Fallbacks biométricos realistas si no hay vinculación de Withings
        if (!sleepData) {
            sleepHistory28 = [7.5, 6.8, 8.2, 7.0, 6.5, 7.8, 7.2, 7.4, 6.9, 8.0, 7.1, 6.4, 7.9, 7.3, 7.6, 6.7, 8.1, 7.2, 6.6, 7.8, 7.4, 7.5, 6.8, 8.3, 7.1, 6.5, 7.9, 7.2];
            sleepScores28 = [78, 65, 85, 72, 60, 82, 75, 76, 68, 84, 70, 58, 80, 74, 77, 64, 83, 73, 62, 79, 76, 78, 66, 86, 71, 61, 81, 73];
            sleepData = {
                history: sleepHistory28,
                average: 7.3,
                currentScore: 78
            };
        }
        if (!rhrData) {
            rhrHistory28 = [56, 54, 57, 55, 54, 56, 55, 54, 53, 56, 55, 57, 54, 55, 56, 54, 58, 55, 53, 56, 54, 55, 53, 57, 54, 53, 56, 54];
            rhrData = {
                history: rhrHistory28,
                average: 55,
                current: 54
            };
        }

        // Calcular TSB diario de los últimos 28 días
        const loadByDay = {};
        allYearActs.forEach(act => {
            const dateStr = new Date(act.start_date).toISOString().split('T')[0];
            let load = act.suffer_score || 0;
            if (!load && act.moving_time) {
                const hrFactor = act.has_heartrate ? (act.average_heartrate / 150) : 0.7;
                load = Math.round((act.moving_time / 60) * hrFactor * 0.5);
            }
            loadByDay[dateStr] = (loadByDay[dateStr] || 0) + load;
        });

        // TSB para el día de hoy
        let ctl = 0, atl = 0;
        const ctlDecay = Math.exp(-1/42), atlDecay = Math.exp(-1/7);
        for (let i = 42; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const load = loadByDay[dateStr] || 0;
            ctl = ctl * ctlDecay + load * (1 - ctlDecay);
            atl = atl * atlDecay + load * (1 - atlDecay);
        }
        const currentTsb = ctl - atl;

        // ----------------------------------------
        // CALCULO Y MODELADO DE HRV4TRAINING (rMSSD)
        // ----------------------------------------
        // Si Withings no reporta hrv_rmssd directo en sleep, calculamos una curva fisiológicamente
        // coherente basada en el pulso en reposo (FCR), la calidad de sueño y el estrés de entrenamiento (ATL).
        const hrvHistory28 = [];
        
        for (let i = 27; i >= 0; i--) {
            // Retroceder i días para calcular el TSB/ATL de ese día del histórico
            let ctl_day = 0, atl_day = 0;
            for (let j = 42 + i; j >= i; j--) {
                const d = new Date(); d.setDate(d.getDate() - j);
                const dateStr = d.toISOString().split('T')[0];
                const load = loadByDay[dateStr] || 0;
                ctl_day = ctl_day * ctlDecay + load * (1 - ctlDecay);
                atl_day = atl_day * atlDecay + load * (1 - atlDecay);
            }
            
            const rhr_day = rhrData.history[27 - i] || 55;
            const sleepScore_day = sleepScores28[27 - i] || 75;
            
            // Fórmula biológica rMSSD (Línea base ~55ms)
            // 1. Relación FCR inversa: menor pulso = mayor HRV (más actividad parasimpática)
            const rhrContribution = (rhrData.average - rhr_day) * 1.5;
            // 2. Sueño positivo: mejor calidad = mayor HRV
            const sleepContribution = (sleepScore_day - 75) * 0.25;
            // 3. Estrés de carga (ATL): el cansancio agudo del día deprime el HRV
            const fatigueContribution = -Math.min(10, atl_day * 0.15);
            // 4. Ruido aleatorio armónico (ritmo cardíaco natural)
            const sineNoise = Math.sin((27 - i) * 0.5) * 2.5;

            const computedHrv = Math.round(Math.max(25, 58 + rhrContribution + sleepContribution + fatigueContribution + sineNoise));
            hrvHistory28.push(computedHrv);
        }

        // Calcular el Corredor Biométrico de HRV (Média móvil de 21 días y desviación estándar)
        const hrvCorridorMin = [];
        const hrvCorridorMax = [];
        
        for (let i = 0; i < 28; i++) {
            // Para cada día, tomamos la ventana de los 21 días anteriores (o el histórico disponible si i < 21)
            const startIdx = Math.max(0, i - 21);
            const window = hrvHistory28.slice(startIdx, i + 1);
            
            const mean = window.reduce((a, b) => a + b, 0) / window.length;
            const sqDiffs = window.map(v => Math.pow(v - mean, 2));
            const stdDev = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / window.length) || 3;
            
            // Corredor a 0.75 * Desviación Estándar (HRV4Training standard)
            hrvCorridorMin.push(parseFloat((mean - 0.75 * stdDev).toFixed(1)));
            hrvCorridorMax.push(parseFloat((mean + 0.75 * stdDev).toFixed(1)));
        }

        const currentHrv = hrvHistory28[27];
        const hrvAverage = Math.round(hrvHistory28.reduce((a, b) => a + b, 0) / 28);

        const hrvData = {
            history: hrvHistory28,
            corridorMin: hrvCorridorMin,
            corridorMax: hrvCorridorMax,
            current: currentHrv,
            average: hrvAverage
        };

        // ----------------------------------------
        // GARMIN TRAINING READINESS SCORE (0 - 100)
        // ----------------------------------------
        
        // 1. Puntuación de Sueño del último día (35%)
        const sleepScoreWeight = sleepData.currentScore;

        // 2. Estado de HRV Agudo frente al Pasillo (25%)
        // Promedio de HRV de los últimos 7 días
        const hrv7Days = hrvHistory28.slice(21, 28);
        const avgHrv7 = hrv7Days.reduce((a, b) => a + b, 0) / hrv7Days.length;
        const currentMinCorridor = hrvCorridorMin[27];
        const currentMaxCorridor = hrvCorridorMax[27];
        
        let hrvScoreWeight = 100;
        if (avgHrv7 < currentMinCorridor) {
            // Sistema simpático dominante (fatiga/estrés)
            hrvScoreWeight = Math.max(30, Math.round(100 - (currentMinCorridor - avgHrv7) * 9));
        } else if (avgHrv7 > currentMaxCorridor) {
            // Parasimpático dominante extremo (recuperación profunda o saturación)
            hrvScoreWeight = 95;
        }

        // 3. FCR Estado Basal (15%)
        const rhrDiff = rhrData.current - rhrData.average;
        let rhrScoreWeight = 100;
        if (rhrDiff > 0) {
            rhrScoreWeight = Math.max(35, 100 - rhrDiff * 8);
        }

        // 4. Carga Aguda de Strava / TSB (25%)
        let tsbScoreWeight = 100;
        if (currentTsb < -30) {
            tsbScoreWeight = 35;
        } else if (currentTsb < 0) {
            tsbScoreWeight = Math.round(100 + (currentTsb * 2.2));
        }

        const readinessScore = Math.round(
            (sleepScoreWeight * 0.35) +
            (hrvScoreWeight * 0.25) +
            (rhrScoreWeight * 0.15) +
            (tsbScoreWeight * 0.25)
        );

        // ----------------------------------------
        // WHOOP STRAIN VS RECOVERY BALANCE HISTORY (7 DÍAS)
        // ----------------------------------------
        // Mapear los últimos 7 días
        const strainHistory = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const activeDay = activeDays.has(dateStr);
            
            // Buscar el suffer score de Strava de ese día
            const dayActs = acts.filter(a => new Date(a.start_date).toISOString().split('T')[0] === dateStr);
            const daySuffer = dayActs.reduce((s, a) => s + (a.suffer_score || 0), 0);
            const dayDurationMin = dayActs.reduce((s, a) => s + (a.moving_time / 60), 0);
            
            // 1. Escalar Strain del día de 0 a 21
            let strain = 2.0; // Metabolismo basal del día
            if (activeDay) {
                if (daySuffer >= 80) strain = parseFloat((17 + Math.random() * 3).toFixed(1));
                else if (daySuffer >= 40) strain = parseFloat((13 + Math.random() * 3.8).toFixed(1));
                else if (daySuffer >= 15) strain = parseFloat((8 + Math.random() * 4.8).toFixed(1));
                else strain = parseFloat((5 + Math.random() * 2.8).toFixed(1));
            } else {
                strain = parseFloat((1.5 + Math.random() * 1.5).toFixed(1));
            }

            // 2. Escalar Recovery del día de 0 a 100
            // Tomar el sleep score e índices de ese día histórico
            const dayRhr = rhrData.history[27 - i] || 55;
            const daySleepScore = sleepScores28[27 - i] || 75;
            const dayHrv = hrvHistory28[27 - i] || 55;
            
            const rhr_score = dayRhr <= rhrData.average ? 100 : Math.max(40, 100 - (dayRhr - rhrData.average) * 8);
            const hrv_score = dayHrv >= hrvData.average ? 100 : Math.max(40, 100 - (hrvData.average - dayHrv) * 6);
            const recovery = Math.round((daySleepScore * 0.40) + (rhr_score * 0.30) + (hrv_score * 0.30));

            const daysWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            strainHistory.push({
                day: daysWeek[d.getDay()],
                date: dateStr,
                strain,
                recovery
            });
        }

        res.json({
            activeDays: activeDays.size, restDays, streak,
            zones: zonePcts, hasHrData: hrActs.length > 0, last28,
            sleepData, rhrData, hrvData, readinessScore, recoveryScore: readinessScore,
            strainScore: strainHistory[6].strain, strainHistory, withingsConnected
        });
    } catch (error) {
        if (error.message === 'NO_TOKEN' || error.message === 'TOKEN_REFRESH_FAILED') res.status(401).json({ error: 'No autenticado' });
        else res.status(500).json({ error: 'Error obteniendo recuperación' });
    }
});

// Servir archivos estáticos del frontend en producción
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
    console.log(`Serving static files from ${frontendDistPath}`);
    app.use(express.static(frontendDistPath));
    app.get(/.*/, (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
} else {
    console.log('Static frontend directory not found. Running in API-only mode.');
}

app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));
