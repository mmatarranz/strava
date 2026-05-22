import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis
} from 'recharts';

const IntensityChart = ({ activities }) => {
  // Map activities to chart data
  // X: Time (Duration in minutes)
  // Y: Suffer Score (Relative Effort)
  // Z: Bubble size
  
  const data = activities.map(act => ({
    name: act.name,
    category: act.category,
    duration: parseFloat((act.moving_time / 60).toFixed(1)),
    effort: act.suffer_score || Math.floor(Math.random() * 50) + 10,
    recovery: act.suffer_score ? act.suffer_score * 0.5 : 24 // mock recovery time based on effort
  }));

  const enduranceData = data.filter(d => d.category === 'Endurance');
  const indoorData = data.filter(d => d.category === 'Indoor/Gym');
  const aguaData = data.filter(d => d.category === 'Agua');

  return (
    <div className="glass-panel" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
      <h2 className="text-xl" style={{ marginBottom: '1.5rem' }}>Análisis de Intensidad</h2>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
            <XAxis type="number" dataKey="duration" name="Duración" unit=" min" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
            <YAxis type="number" dataKey="effort" name="Esfuerzo Relativo" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
            <ZAxis type="number" dataKey="recovery" range={[60, 400]} name="Recuperación" unit=" h" />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
            />
            <Scatter name="Endurance" data={enduranceData} fill="var(--chart-endurance)" />
            <Scatter name="Indoor" data={indoorData} fill="var(--chart-indoor)" />
            <Scatter name="Agua" data={aguaData} fill="var(--chart-water)" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default IntensityChart;
