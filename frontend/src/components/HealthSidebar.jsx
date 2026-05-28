import React from 'react';
import { Droplet, Scale, ActivitySquare, TrendingDown, TrendingUp, Moon, Heart, Footprints, HeartPulse, Dumbbell, Wind, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

const HealthSidebar = ({ healthData, sleepData, rhrData, isGridLayout }) => {
  if (!healthData || healthData.error) return <div className="dashboard-sidebar">Cargando biometría...</div>;

  const { weight, bodyFat, hydration, activity, composition, cardio, bloodPressure, withingsConnected } = healthData;

  const weightTrend = weight.current < weight.previous ? 'down' : 'up';
  const fatTrend = bodyFat.current < bodyFat.previous ? 'down' : 'up';
  
  const compData = composition || { muscleMass: 60.5, boneMass: 3.2, waterPct: 56.4 };
  const cardioData = cardio || { pwv: 6.2, vascularAge: 28 };
  
  const hydrationPercent = compData.waterPct;

  // Weight history Recharts formatting
  const weightChartData = weight.history.map((w, i) => ({ day: i, weight: w }));

  // Sleep details (Withings)
  const currentSleep = sleepData?.history ? sleepData.history[sleepData.history.length - 1] : 7.2;
  const sleepTrend = currentSleep >= 7.5 ? 'good' : 'poor';

  // RHR details (Withings)
  const currentRhr = rhrData?.current || 55;
  const rhrTrend = currentRhr < (rhrData?.average || 56) ? 'down' : 'up';

  // Steps details (Withings)
  const stepsData = activity || {
    currentSteps: 8450,
    stepsGoal: 10000,
    previousSteps: 7800,
    history: [6200, 11500, 8450, 7800, 9100, 8000, 8450],
    activeCalories: 350,
    activeDurationFormated: "01:15:00"
  };

  const stepsTrend = stepsData.currentSteps >= stepsData.previousSteps ? 'up' : 'down';
  const stepsPct = (stepsData.currentSteps / stepsData.stepsGoal) * 100;
  const stepsChartData = stepsData.history.map((s, i) => ({ day: i, steps: s }));

  // NEW: Blood Pressure Data (Withings)
  const bpData = bloodPressure || {
    systolic: { current: 115, previous: 118, history: [118, 117, 116, 115, 115] },
    diastolic: { current: 75, previous: 77, history: [78, 77, 76, 75, 75] }
  };
  const bpSystolicTrend = bpData.systolic.current <= bpData.systolic.previous ? 'down' : 'up';
  const bpDiastolicTrend = bpData.diastolic.current <= bpData.diastolic.previous ? 'down' : 'up';
  
  const getBpStatus = (sys, dia) => {
    if (sys < 120 && dia < 80) return { label: 'Óptima ✓', color: 'var(--health-green)', desc: 'Presión arterial en rango ideal de salud.' };
    if (sys < 130 && dia < 85) return { label: 'Normal 🟢', color: '#84cc16', desc: 'Rango saludable de presión arterial.' };
    return { label: 'Elevada ⚠️', color: '#f59e0b', desc: 'Presión arterial ligeramente alta. Vigilar fatiga.' };
  };
  const bpStatus = getBpStatus(bpData.systolic.current, bpData.diastolic.current);
  const bpChartData = bpData.systolic.history.map((sys, i) => ({
    day: i,
    systolic: sys,
    diastolic: bpData.diastolic.history[i] || 75
  }));

  // NEW: Sleep Breathing Rate Data (Withings Sleep)
  const breathingData = sleepData?.breathingRate || {
    current: 13.2,
    average: 13.4,
    history: [13.4, 13.6, 13.2, 13.5, 13.8, 13.1, 13.3, 13.5, 13.7, 13.2, 13.4, 13.6, 13.3, 13.5, 13.4, 13.6, 13.2, 13.5, 13.8, 13.1, 13.3, 13.5, 13.7, 13.2, 13.4, 13.6, 13.3, 13.2]
  };
  const breathingChartData = breathingData.history.map((b, i) => ({ day: i, breathing: b }));

  const containerClass = isGridLayout ? "health-sidebar-grid" : "dashboard-sidebar";

  return (
    <div className={containerClass}>
      
      {/* 🩺 WEIGHT CARD */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="text-muted text-sm text-gradient-health" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Scale size={16} /> Peso Corporal
          </h3>
          {withingsConnected && <span style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.15)', color: 'var(--health-cyan)', padding: '2px 6px', borderRadius: '4px' }}>Withings</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="text-3xl" style={{ fontWeight: 700 }}>{weight.current} <span className="text-sm text-muted">kg</span></span>
          <span className={weightTrend === 'down' ? 'trend-positive text-xs' : 'trend-up text-xs'} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            {weightTrend === 'down' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {Math.abs(weight.current - weight.previous).toFixed(1)} kg
          </span>
        </div>
        <div style={{ height: '55px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightChartData}>
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '6px' }}
                itemStyle={{ color: 'var(--health-cyan)', fontSize: '11px' }}
                labelStyle={{ display: 'none' }}
              />
              <Line type="monotone" dataKey="weight" stroke="var(--health-cyan)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 📊 BODY FAT CARD */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="text-muted text-sm text-gradient-health" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ActivitySquare size={16} /> Índice de Grasa
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span className="text-3xl" style={{ fontWeight: 700 }}>{bodyFat.current} <span className="text-sm text-muted">%</span></span>
          <span className={fatTrend === 'down' ? 'trend-positive text-xs' : 'trend-up text-xs'} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            {fatTrend === 'down' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {Math.abs(bodyFat.current - bodyFat.previous).toFixed(1)} %
          </span>
        </div>
        <div className="text-xs text-muted">Grasa objetivo: {bodyFat.goal}%</div>
      </div>

      {/* 😴 SLEEP CARD (Withings) */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="text-muted text-sm text-gradient-health" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Moon size={16} /> Horas de Sueño
          </h3>
          {withingsConnected && <span style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.15)', color: 'var(--health-cyan)', padding: '2px 6px', borderRadius: '4px' }}>Withings</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span className="text-3xl" style={{ fontWeight: 700 }}>{currentSleep} <span className="text-sm text-muted">hrs</span></span>
          <span className={sleepTrend === 'good' ? 'trend-positive text-xs' : 'trend-up text-xs'} style={{ color: sleepTrend === 'good' ? 'var(--health-green)' : '#f59e0b', fontSize: '0.7rem' }}>
            {sleepTrend === 'good' ? '😴 Descanso Óptimo' : '⚠️ Descanso Corto'}
          </span>
        </div>
        <div className="text-xs text-muted">Promedio semanal: {sleepData?.average || 7.3} hrs (Calidad: {sleepData?.currentScore || 78}%)</div>
      </div>

      {/* ❤️ RHR CARD (Withings) */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="text-muted text-sm text-gradient-health" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Heart size={16} /> Pulsaciones en Reposo
          </h3>
          {withingsConnected && <span style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.15)', color: 'var(--health-cyan)', padding: '2px 6px', borderRadius: '4px' }}>Withings</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span className="text-3xl" style={{ fontWeight: 700, color: 'var(--chart-indoor)' }}>{currentRhr} <span className="text-sm text-muted" style={{ color: 'var(--text-secondary)' }}>ppm</span></span>
          <span className={rhrTrend === 'down' ? 'trend-positive text-xs' : 'trend-up text-xs'} style={{ color: rhrTrend === 'down' ? 'var(--health-green)' : '#ef4444', fontSize: '0.7rem' }}>
            {rhrTrend === 'down' ? '📉 FCR óptima' : '📈 FCR elevada'}
          </span>
        </div>
        <div className="text-xs text-muted">FCR Media: {rhrData?.average || 55} ppm</div>
      </div>

      {/* 💓 NEW: CARDIOVASCULAR BLOOD PRESSURE CARD */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="text-muted text-sm text-gradient-health" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <HeartPulse size={16} /> Presión Arterial
          </h3>
          {withingsConnected && <span style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.15)', color: 'var(--health-cyan)', padding: '2px 6px', borderRadius: '4px' }}>BPM Connect</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span className="text-3xl" style={{ fontWeight: 700 }}>
            {bpData.systolic.current}<span className="text-muted" style={{ fontSize: '1.2rem', fontWeight: 400 }}>/{bpData.diastolic.current}</span> <span className="text-sm text-muted">mmHg</span>
          </span>
          <span style={{ fontSize: '0.7rem', color: bpStatus.color, fontWeight: 700 }}>
            {bpStatus.label}
          </span>
        </div>
        <div className="text-xs text-muted" style={{ marginBottom: '0.6rem' }}>
          Tendencia: {bpData.systolic.current <= bpData.systolic.previous ? '📉 Sistólica estable' : '📈 Sistólica elevada'}
        </div>
        
        <div style={{ height: '40px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bpChartData}>
              <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '6px' }}
                itemStyle={{ color: 'var(--health-cyan)', fontSize: '10px' }}
                labelStyle={{ display: 'none' }}
              />
              <Line type="monotone" dataKey="systolic" stroke="var(--health-cyan)" strokeWidth={1.5} dot={false} name="Sistólica" />
              <Line type="monotone" dataKey="diastolic" stroke="#38bdf8" strokeWidth={1.2} strokeDasharray="3 3" dot={false} name="Diastólica" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 🌬️ NEW: NIGHTTIME BREATHING RATE CARD */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="text-muted text-sm text-gradient-health" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Wind size={16} /> Frecuencia Respiratoria
          </h3>
          {withingsConnected && <span style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.15)', color: 'var(--health-cyan)', padding: '2px 6px', borderRadius: '4px' }}>Sleep</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span className="text-3xl" style={{ fontWeight: 700 }}>
            {breathingData.current} <span className="text-sm text-muted">rpm</span>
          </span>
          <span className="text-xs text-muted" style={{ color: breathingData.current >= 12 && breathingData.current <= 16 ? 'var(--health-green)' : '#f59e0b', fontSize: '0.7rem', fontWeight: 600 }}>
            {breathingData.current >= 12 && breathingData.current <= 16 ? '✓ Fisiología Estable' : '⚠️ Ritmo Alterado'}
          </span>
        </div>
        <div className="text-xs text-muted" style={{ marginBottom: '0.6rem' }}>
          Promedio nocturno: {breathingData.average} rpm
        </div>

        <div style={{ height: '40px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={breathingChartData}>
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '6px' }}
                itemStyle={{ color: 'var(--health-green)', fontSize: '11px' }}
                labelStyle={{ display: 'none' }}
              />
              <Line type="monotone" dataKey="breathing" stroke="#34d399" strokeWidth={1.5} dot={{ r: 1 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 🚶 PASOS DIARIOS CARD */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="text-muted text-sm text-gradient-health" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Footprints size={16} /> Pasos Diarios
          </h3>
          {withingsConnected && <span style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.15)', color: 'var(--health-cyan)', padding: '2px 6px', borderRadius: '4px' }}>Withings</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span className="text-3xl" style={{ fontWeight: 700 }}>{stepsData.currentSteps.toLocaleString('es-ES')} <span className="text-sm text-muted" style={{ fontSize: '0.75rem' }}>/ {stepsData.stepsGoal.toLocaleString('es-ES')}</span></span>
          <span className={stepsTrend === 'up' ? 'trend-positive text-xs' : 'trend-up text-xs'} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: stepsTrend === 'up' ? 'var(--health-green)' : '#f59e0b', fontSize: '0.7rem' }}>
            {stepsTrend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.round(stepsPct)}%
          </span>
        </div>
        
        {/* Progress bar */}
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.6rem', marginTop: '0.4rem' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${Math.min(stepsPct, 100)}%`, 
              background: 'linear-gradient(90deg, #10b981, #00e5ff)',
              transition: 'width 0.5s ease-in-out'
            }} 
          />
        </div>

        <div className="text-xs text-muted" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontWeight: 500 }}>
          <span>🔥 {stepsData.activeCalories} kcal activas</span>
          <span>⏱️ {stepsData.activeDurationFormated}</span>
        </div>

        <div style={{ height: '40px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stepsChartData}>
              <YAxis domain={['dataMin - 500', 'dataMax + 500']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '6px' }}
                itemStyle={{ color: 'var(--health-green)', fontSize: '11px' }}
                labelStyle={{ display: 'none' }}
              />
              <Line type="monotone" dataKey="steps" stroke="#10b981" strokeWidth={1.5} dot={{ r: 1.5 }} activeDot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 💧 AGUA CORPORAL / HIDRATACIÓN REAL CARD */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="text-muted text-sm text-gradient-health" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Droplet size={16} /> Agua Corporal (Withings)
          </h3>
          {withingsConnected && <span style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.15)', color: 'var(--health-cyan)', padding: '2px 6px', borderRadius: '4px' }}>Impedancia</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="text-3xl" style={{ fontWeight: 700 }}>{compData.waterPct.toFixed(1)} <span className="text-sm text-muted">%</span></span>
          <span className="text-xs text-muted" style={{ color: compData.waterPct >= 50 && compData.waterPct <= 65 ? 'var(--health-green)' : '#f59e0b', fontSize: '0.7rem' }}>
            {compData.waterPct >= 50 && compData.waterPct <= 65 ? '✓ Hidratación Óptima' : '⚠️ Hidratación Baja'}
          </span>
        </div>
        
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${(compData.waterPct / 75) * 100}%`, 
              background: 'linear-gradient(90deg, #38bdf8, var(--health-cyan))',
              transition: 'width 0.5s ease-in-out'
            }} 
          />
        </div>
        <div className="text-xs text-muted" style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Límites atletas: 50% - 65%</span>
          <span>{hydration.currentLiters}L bebido hoy</span>
        </div>
      </div>

      {/* 🧬 COMPOSICIÓN Y SALUD CARDIOVASCULAR CARD */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="text-muted text-sm text-gradient-health" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Activity size={16} /> Composición & Cardio
          </h3>
          {withingsConnected && <span style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.15)', color: 'var(--health-cyan)', padding: '2px 6px', borderRadius: '4px' }}>Clínico</span>}
        </div>
        
        {/* Desglose de Masa Muscular y Ósea */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Dumbbell size={12} /> Masa Muscular</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>{compData.muscleMass} kg</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Scale size={12} /> Masa Ósea</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>{compData.boneMass} kg</span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '0.6rem 0' }} />

        {/* Métricas Cardiovasculares Avanzadas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted">Edad Vascular</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--health-cyan)' }}>
              {cardioData.vascularAge} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>años</span>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted">Rigidez Arterial (PWV)</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--health-cyan)' }}>
              {cardioData.pwv} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>m/s</span>
            </span>
          </div>
        </div>
        
        {/* Cardio status indicator */}
        <div style={{ 
          marginTop: '0.75rem', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.12)', 
          borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.68rem', color: '#e0f7fa', textAlign: 'center' 
        }}>
          💡 {cardioData.pwv < 7.0 ? '✓ Excelente elasticidad arterial (Óptimo)' : '⚠️ Elasticidad arterial estándar'}
        </div>
      </div>

    </div>
  );
};

export default HealthSidebar;
