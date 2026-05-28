import React from 'react';
import { Activity, Timer, TrendingUp, TrendingDown, Mountain } from 'lucide-react';

const Header = ({ activities }) => {
  // Mock logic to calculate current week vs last week volume
  // In a real app, you'd filter by actual dates.
  const currentWeekDuration = activities.reduce((acc, curr) => acc + curr.moving_time, 0);
  const lastWeekDuration = currentWeekDuration * 0.85; // mock last week as 85% of this week
  
  const percentageChange = (((currentWeekDuration - lastWeekDuration) / lastWeekDuration) * 100).toFixed(1);
  const isPositive = percentageChange > 0;

  const currentHours = (currentWeekDuration / 3600).toFixed(1);
  const lastHours = (lastWeekDuration / 3600).toFixed(1);

  // Group by category to show some stats
  const enduranceTime = activities.filter(a => a.category === 'Endurance').reduce((acc, curr) => acc + curr.moving_time, 0) / 3600;
  const indoorTime = activities.filter(a => a.category === 'Indoor/Gym').reduce((acc, curr) => acc + curr.moving_time, 0) / 3600;

  // New: total elevation gain from activities
  const totalElevation = Math.round(activities.reduce((acc, curr) => acc + (curr.total_elevation_gain || 0), 0));

  return (
    <div className="dashboard-header">
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="text-muted text-sm">Volumen Total (7d)</h3>
          <Timer size={20} color="var(--strava-orange)" />
        </div>
        <div className="text-3xl" style={{ marginBottom: '0.5rem' }}>
          {currentHours} <span className="text-sm text-muted">hrs</span>
        </div>
        <div className={isPositive ? 'trend-positive text-sm' : 'trend-down text-sm'}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>{Math.abs(percentageChange)}% vs sem. anterior ({lastHours}h)</span>
        </div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="text-muted text-sm">Resistencia</h3>
          <Activity size={20} color="var(--chart-endurance)" />
        </div>
        <div className="text-3xl" style={{ marginBottom: '0.5rem' }}>
          {enduranceTime.toFixed(1)} <span className="text-sm text-muted">hrs</span>
        </div>
        <div className="text-muted text-sm">Carrera, Ciclismo, Caminata</div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="text-muted text-sm">Desnivel Acumulado</h3>
          <Mountain size={20} color="#10b981" />
        </div>
        <div className="text-3xl" style={{ marginBottom: '0.5rem' }}>
          {totalElevation.toLocaleString('es-ES')} <span className="text-sm text-muted">m</span>
        </div>
        <div className="text-muted text-sm">Ascenso total en sesiones recientes</div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="text-muted text-sm">Indoor / Gym</h3>
          <Activity size={20} color="var(--chart-indoor)" />
        </div>
        <div className="text-3xl" style={{ marginBottom: '0.5rem' }}>
          {indoorTime.toFixed(1)} <span className="text-sm text-muted">hrs</span>
        </div>
        <div className="text-muted text-sm">Pesas, Cicloindoor, Estiramientos</div>
      </div>
    </div>
  );
};

export default Header;
