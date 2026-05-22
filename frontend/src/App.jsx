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
import './index.css';

const API_URL = 'http://localhost:3000/api';

async function apiFetch(path) {
  console.log(`[API] Fetching ${path}...`);
  const res = await fetch(`${API_URL}${path}`);
  if (res.status === 401) throw new Error('NO_AUTH');
  const data = await res.json();
  console.log(`[API] ${path} returned`, data);
  return data;
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
  const [errorMsg,      setErrorMsg]      = useState(null);

  const fetchAll = async () => {
    try {
      const statusData = await apiFetch('/auth/status');
      if (!statusData.authenticated) { setIsAuthenticated(false); setLoading(false); return; }
      setIsAuthenticated(true);

      // Lanzar todas las peticiones en paralelo
      const [acts, health, statsRes, fitness, goals, perf, recovery, annual, history] = await Promise.all([
        apiFetch('/activities'),
        apiFetch('/health'),
        apiFetch('/stats'),
        apiFetch('/fitness'),
        apiFetch('/goals'),
        apiFetch('/performance'),
        apiFetch('/recovery'),
        apiFetch('/annual-progress'),
        apiFetch('/history'),
      ]);

      setActivities(acts);
      setHealthData(health);
      setStats(statsRes);
      setFitnessData(fitness);
      setGoalsData(goals);
      setPerfData(perf);
      setRecoveryData(recovery);
      setAnnualData(annual);
      setHistoryData(history);
    } catch (error) {
      if (error.message === 'NO_AUTH') { setIsAuthenticated(false); }
      else { setErrorMsg('Error conectando con el servidor backend en :3000'); }
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
        <div style={{ color: 'var(--health-green)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--health-green)', boxShadow: '0 0 6px var(--health-green)' }}></div>
          Conectado a Strava
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>No se encontraron actividades en tu cuenta.</div>
      ) : (
        <div className="dashboard-grid">
          {/* OBJETIVOS ANUALES — encima de todo, span completo */}
          <div style={{ gridColumn: '1 / -1' }}>
            <AnnualGoalProgress data={annualData} />
          </div>

          {/* HEADER KPIs */}
          <Header activities={activities} />

          {/* COLUMNA PRINCIPAL */}
          <div className="dashboard-main">
            {/* Módulo 2: Metas semanales */}
            <WeeklyGoals goals={goalsData} onSave={handleSaveGoals} />

            {/* Módulo 1: Forma Atlética ATL/CTL/TSB */}
            <FitnessChart data={fitnessData} />

            {/* Desglose Diario / Mensual / Anual */}
            <ActivityBreakdown stats={stats} />

            {/* Módulo 3: Evolución de rendimiento */}
            <PerformanceEvolution data={perfData} />

            {/* Módulo 4: Radar de equilibrio */}
            <SportRadar stats={stats} />

            {/* Módulo Histórico: Años anteriores */}
            <HistoricalStats data={historyData} />

            {/* Módulo 6: Calendario mensual */}
            <TrainingCalendar activities={activities} />

            {/* Gráfico de áreas apiladas y burbujas originales */}
            <MainChart activities={activities} />
            <IntensityChart activities={activities} />
          </div>

          {/* SIDEBAR DERECHO */}
          <div className="dashboard-sidebar">
            {/* Módulo 5: Recuperación */}
            <RecoveryPanel data={recoveryData} />

            {/* Salud */}
            <HealthSidebar healthData={healthData} />
          </div>
        </div>
      )}
    </>
  );
}

export default App;
