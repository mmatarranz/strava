import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const SPORTS = ['Ciclismo','Ciclo Indoor','Running','Andar','Pesas','Estiramientos','Natación'];

// Radar chart comparando distribución de tiempo este mes vs mes anterior
const SportRadar = ({ stats }) => {
  if (!stats?.monthly || stats.monthly.length < 1) return null;

  const now = new Date();
  const thisMonth = `${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][now.getMonth()]} ${now.getFullYear()}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][prevDate.getMonth()]} ${prevDate.getFullYear()}`;

  const current  = stats.monthly.find(m => m.label === thisMonth);
  const previous = stats.monthly.find(m => m.label === prevMonth);

  const radarData = SPORTS.map(sport => ({
    sport,
    'Este mes':  current?.[sport]  || 0,
    'Mes anterior': previous?.[sport] || 0,
  }));

  const hasData = radarData.some(d => d['Este mes'] > 0 || d['Mes anterior'] > 0);
  if (!hasData) return null;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h2 className="text-xl">Equilibrio entre Deportes</h2>
        <p className="text-muted text-xs">Nº de sesiones: {thisMonth} vs {prevMonth}</p>
      </div>
      <div style={{ height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="sport" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(val, name) => [`${val} sesiones`, name]}
            />
            <Radar name="Este mes" dataKey="Este mes" stroke="var(--strava-orange)" fill="var(--strava-orange)" fillOpacity={0.3} strokeWidth={2} />
            <Radar name="Mes anterior" dataKey="Mes anterior" stroke="var(--health-cyan)" fill="var(--health-cyan)" fillOpacity={0.15} strokeWidth={2} strokeDasharray="5 3" />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.78rem' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SportRadar;
