import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import MainChart from './components/MainChart';
import IntensityChart from './components/IntensityChart';
import HealthSidebar from './components/HealthSidebar';
import ActivityBreakdown from './components/ActivityBreakdown';
import FitnessChart from './components/FitnessChart';
import WeeklyGoals from './components/WeeklyGoals';
import PerformanceEvolution from './components/PerformanceEvolution';
import SportRadar from './components/SportRadar';
import RecoveryPanel from './components/RecoveryPanel';
import TrainingCalendar from './components/TrainingCalendar';
import AnnualGoalProgress from './components/AnnualGoalProgress';
import HistoricalStats from './components/HistoricalStats';
import LastActivity from './components/LastActivity';
import TrainingReadiness from './components/TrainingReadiness';
import AerobicEfficiency from './components/AerobicEfficiency';
import AICoachDrawer from './components/AICoachDrawer';
import AIReportCard from './components/AIReportCard';
import HeartRateDistribution from './components/HeartRateDistribution';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');

async function apiFetch(path) {
  console.log(`[API] Fetching ${path}...`);
  const res = await fetch(`${API_URL}${path}`);
  if (res.status === 401) throw new Error('NO_AUTH');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server returned status ${res.status}`);
  }
  const data = await res.json();
  console.log(`[API] ${path} returned`, data);
  return data;
}

async function fetchSafe(path, fallback) {
  try {
    return await apiFetch(path);
  } catch (e) {
    if (e.message === 'NO_AUTH') throw e;
    console.warn(`[SafeFetch] Failed to fetch ${path}, using fallback:`, e.message);
    return fallback;
  }
}

function App() {
  const [activities,    setActivities]    = useState([]);
  const [healthData,    setHealthData]    = useState(null);
  const [stats,         setStats]         = useState(null);
  const [fitnessData,   setFitnessData]   = useState(null);
  const [goalsData,     setGoalsData]     = useState(null);
  const [perfData,      setPerfData]      = useState(null);
  const [recoveryData,  setRecoveryData]  = useState(null);
  const [annualData,    setAnnualData]    = useState(null);
  const [historyData,   setHistoryData]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isWithingsAuthenticated, setIsWithingsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('rendimiento');
  const [errorMsg,      setErrorMsg]      = useState(null);

  const fetchAll = async () => {
    try {
      const statusData = await apiFetch('/auth/status');
      if (!statusData.authenticated) { setIsAuthenticated(false); setLoading(false); return; }
      setIsAuthenticated(true);

      // Lanzar todas las peticiones en paralelo de forma segura con fallbacks
      const [withingsStatus, acts, health, statsRes, fitness, goals, perf, recovery, annual, history] = await Promise.all([
        fetchSafe('/withings/auth/status', { authenticated: false }),
        fetchSafe('/activities', []),
        fetchSafe('/health', null),
        fetchSafe('/stats', null),
        fetchSafe('/fitness', []),
        fetchSafe('/goals', null),
        fetchSafe('/performance', null),
        fetchSafe('/recovery', null),
        fetchSafe('/annual-progress', null),
        fetchSafe('/history', []),
      ]);

      setIsWithingsAuthenticated(withingsStatus.authenticated);
      setActivities(Array.isArray(acts) ? acts : []);
      setHealthData(health);
      setStats(statsRes);
      setFitnessData(Array.isArray(fitness) ? fitness : []);
      setGoalsData(goals);
      setPerfData(perf);
      setRecoveryData(recovery);
      setAnnualData(annual);
      setHistoryData(Array.isArray(history) ? history : []);
    } catch (error) {
      if (error.message === 'NO_AUTH') { setIsAuthenticated(false); }
      else { setErrorMsg('Error de conexión o autenticación: ' + error.message); }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSaveGoals = async (updated) => {
    try {
      await fetch(`${API_URL}/goals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      // Refrescar metas
      const fresh = await apiFetch('/goals');
      setGoalsData(fresh);
    } catch (e) { console.error(e); }
  };

  const handleSyncFullHistory = async () => {
    setLoading(true);
    try {
      const freshHistory = await apiFetch('/history?sync=full');
      setHistoryData(Array.isArray(freshHistory) ? freshHistory : []);
      const freshActs = await apiFetch('/activities');
      setActivities(Array.isArray(freshActs) ? freshActs : []);
      const freshStats = await apiFetch('/stats');
      setStats(freshStats);
    } catch (e) {
      console.error(e);
      setErrorMsg('Error realizando sincronización completa de histórico: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem' }}>
      <span className="text-gradient">Cargando Dashboard...</span>
    </div>
  );

  if (!isAuthenticated) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}>
      <h1 className="text-3xl text-gradient" style={{ marginBottom: '1rem' }}>Strava Performance Dashboard</h1>
      <p className="text-muted" style={{ marginBottom: '2rem', maxWidth: '400px' }}>
        Conecta tu cuenta de Strava para visualizar tus datos de entrenamiento.
      </p>
      <a href={`${API_URL}/auth/login`} style={{
        textDecoration: 'none', color: 'white', background: 'var(--strava-orange)', fontWeight: '600',
        padding: '1rem 2rem', display: 'inline-block', cursor: 'pointer', borderRadius: '12px'
      }}>Conectar con Strava</a>
      {errorMsg && <p style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.85rem' }}>{errorMsg}</p>}
    </div>
  );

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <div>
          <h1 className="text-3xl text-gradient">Dashboard de Rendimiento</h1>
          <p className="text-muted">Seguimiento personalizado de tus actividades en Strava</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--health-green)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--health-green)', boxShadow: '0 0 6px var(--health-green)' }}></div>
            Conectado a Strava
          </div>
          {isWithingsAuthenticated ? (
            <div style={{ color: 'var(--health-cyan)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--health-cyan)', boxShadow: '0 0 6px var(--health-cyan)' }}></div>
              Conectado a Withings
            </div>
          ) : (
            <a href={`${API_URL}/withings/auth/login`} style={{
              textDecoration: 'none', color: 'white', background: 'rgba(255, 255, 255, 0.08)', fontSize: '0.72rem', fontWeight: '500',
              padding: '0.35rem 0.7rem', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              transition: 'background 0.2s ease'
            }} onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'} onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}>
              🔌 Conectar Withings
            </a>
          )}
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>No se encontraron actividades en tu cuenta.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* NAVEGACIÓN TEMÁTICA DE PESTAÑAS (TABS SELECTOR) */}
          <div className="tab-navigation">
            <button 
              onClick={() => setActiveTab('rendimiento')} 
              className={`tab-item ${activeTab === 'rendimiento' ? 'active' : ''}`}
            >
              📊 Rendimiento y Carga
            </button>
            <button 
              onClick={() => setActiveTab('salud')} 
              className={`tab-item ${activeTab === 'salud' ? 'active health-tab-active' : ''}`}
            >
              🩺 Fisiología y Salud
            </button>
            <button 
              onClick={() => setActiveTab('objetivos')} 
              className={`tab-item ${activeTab === 'objetivos' ? 'active goals-tab-active' : ''}`}
            >
              📅 Objetivos y Agenda
            </button>
          </div>

          {/* RENDERIZADO CONDICIONAL DE PESTAÑAS */}
          
          {/* PESTAÑA 1: RENDIMIENTO Y CARGA */}
          {activeTab === 'rendimiento' && (
            <div className="tab-pane dashboard-main">
              <LastActivity activities={activities} />
              <FitnessChart data={fitnessData} />
              <AerobicEfficiency data={recoveryData} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                <PerformanceEvolution data={perfData} />
                <SportRadar stats={stats} />
              </div>
              <MainChart activities={activities} />
              <IntensityChart activities={activities} />
            </div>
          )}

          {/* PESTAÑA 2: FISIOLOGÍA Y SALUD */}
          {activeTab === 'salud' && (
            <div className="tab-pane health-tab-grid">
              {/* Columna Izquierda: 2/3 del ancho (Parte Central) */}
              <div className="health-span-two" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <AIReportCard />
                <TrainingReadiness data={recoveryData} />
                <RecoveryPanel data={recoveryData} />
                <HealthSidebar healthData={healthData} sleepData={recoveryData?.sleepData} rhrData={recoveryData?.rhrData} isGridLayout={true} />
              </div>
              
              {/* Columna Derecha: 1/3 del ancho (Lateral) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <TrainingCalendar activities={activities} />
                <HeartRateDistribution data={recoveryData} />
              </div>
            </div>
          )}

          {/* PESTAÑA 3: OBJETIVOS Y AGENDA */}
          {activeTab === 'objetivos' && (
            <div className="tab-pane dashboard-main">
              <AnnualGoalProgress data={annualData} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <WeeklyGoals goals={goalsData} onSave={handleSaveGoals} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                <ActivityBreakdown stats={stats} />
                <HistoricalStats data={historyData} onSyncFull={handleSyncFullHistory} />
              </div>
            </div>
          )}

          {/* HEADER KPIs (Movido a la parte inferior como barra de resumen global) */}
          {activeTab !== 'salud' && <Header activities={activities} />}

        </div>
      )}
      {/* Asistente Deportivo IA Flotante */}
      <AICoachDrawer />
    </>
  );
}

export default App;
