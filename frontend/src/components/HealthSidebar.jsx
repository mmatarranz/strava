import React from 'react';
import { Droplet, Scale, ActivitySquare, TrendingDown, TrendingUp, Moon, Heart } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

const HealthSidebar = ({ healthData, sleepData, rhrData }) => {
  if (!healthData || healthData.error) return <div className="dashboard-sidebar">Cargando biometría...</div>;

  const { weight, bodyFat, hydration, withingsConnected } = healthData;

  const weightTrend = weight.current < weight.previous ? 'down' : 'up';
  const fatTrend = bodyFat.current < bodyFat.previous ? 'down' : 'up';
  
  const hydrationPercent = Math.min((hydration.currentLiters / hydration.dailyGoal) * 100, 100);

  // Weight history Recharts formatting
  const weightChartData = weight.history.map((w, i) => ({ day: i, weight: w }));

  // Sleep details (Withings)
  const currentSleep = sleepData?.history ? sleepData.history[sleepData.history.length - 1] : 7.2;
  const sleepTrend = currentSleep >= 7.5 ? 'good' : 'poor';

  // RHR details (Withings)
  const currentRhr = rhrData?.current || 55;
  const rhrTrend = currentRhr < (rhrData?.average || 56) ? 'down' : 'up';

  return (
    <div className="dashboard-sidebar">
      
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

      {/* 💧 HYDRATION CARD */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 className="text-muted text-sm text-gradient-health" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Droplet size={16} /> Hidratación (Hoy)
          </h3>
        </div>
        <div className="text-2xl" style={{ marginBottom: '0.75rem', fontWeight: 600 }}>
          {hydration.currentLiters} <span className="text-sm text-muted">/ {hydration.dailyGoal} L</span>
        </div>
        
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${hydrationPercent}%`, 
              background: 'linear-gradient(90deg, var(--health-cyan), #38bdf8)',
              transition: 'width 0.5s ease-in-out'
            }} 
          />
        </div>
        <div className="text-xs text-muted" style={{ marginTop: '0.4rem', textAlign: 'right' }}>
          {hydrationPercent.toFixed(0)}% completado
        </div>
      </div>

    </div>
  );
};

export default HealthSidebar;
