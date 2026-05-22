import React from 'react';
import { Droplet, Scale, ActivitySquare, TrendingDown, TrendingUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

const HealthSidebar = ({ healthData }) => {
  if (!healthData) return <div className="dashboard-sidebar">Loading...</div>;

  const { weight, bodyFat, hydration } = healthData;

  const weightTrend = weight.current < weight.previous ? 'down' : 'up';
  const fatTrend = bodyFat.current < bodyFat.previous ? 'down' : 'up';
  
  // Progress bar for hydration
  const hydrationPercent = Math.min((hydration.currentLiters / hydration.dailyGoal) * 100, 100);

  // Mock weight history for mini chart
  const weightChartData = weight.history.map((w, i) => ({ day: i, weight: w })).reverse();

  return (
    <div className="dashboard-sidebar">
      
      {/* Weight Card */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="text-muted text-sm text-gradient-health">Peso Corporal</h3>
          <Scale size={20} color="var(--health-cyan)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
          <span className="text-3xl">{weight.current} <span className="text-sm text-muted">kg</span></span>
          <span className={weightTrend === 'down' ? 'trend-positive text-xs' : 'trend-up text-xs'}>
            {weightTrend === 'down' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {Math.abs(weight.current - weight.previous).toFixed(1)} kg
          </span>
        </div>
        <div style={{ height: '60px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightChartData}>
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '4px', padding: '4px' }}
                itemStyle={{ color: 'var(--health-cyan)', fontSize: '12px' }}
                labelStyle={{ display: 'none' }}
              />
              <Line type="monotone" dataKey="weight" stroke="var(--health-cyan)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Body Fat Card */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="text-muted text-sm text-gradient-health">Índice de Grasa</h3>
          <ActivitySquare size={20} color="var(--health-cyan)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="text-3xl">{bodyFat.current} <span className="text-sm text-muted">%</span></span>
          <span className={fatTrend === 'down' ? 'trend-positive text-xs' : 'trend-up text-xs'}>
            {fatTrend === 'down' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {Math.abs(bodyFat.current - bodyFat.previous).toFixed(1)} %
          </span>
        </div>
        <div className="text-xs text-muted">Objetivo: {bodyFat.goal}%</div>
      </div>

      {/* Hydration Card */}
      <div className="glass-panel" style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="text-muted text-sm text-gradient-health">Hidratación (Hoy)</h3>
          <Droplet size={20} color="#38bdf8" />
        </div>
        <div className="text-2xl" style={{ marginBottom: '1rem' }}>
          {hydration.currentLiters} <span className="text-sm text-muted">/ {hydration.dailyGoal} L</span>
        </div>
        
        {/* Progress bar manually created for styling */}
        <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${hydrationPercent}%`, 
              background: 'linear-gradient(90deg, var(--health-cyan), #38bdf8)',
              transition: 'width 0.5s ease-in-out'
            }} 
          />
        </div>
        <div className="text-xs text-muted" style={{ marginTop: '0.5rem', textAlign: 'right' }}>
          {hydrationPercent.toFixed(0)}% completado
        </div>
      </div>

    </div>
  );
};

export default HealthSidebar;
