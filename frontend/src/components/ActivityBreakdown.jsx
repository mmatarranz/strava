import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';

const TABS = [
  { key: 'daily',   label: 'Diario',  Icon: CalendarDays },
  { key: 'monthly', label: 'Mensual', Icon: Calendar },
  { key: 'annual',  label: 'Anual',   Icon: CalendarRange },
];

// 7 actividades con colores únicos y diferenciados
const ACTIVITIES = [
  { key: 'Ciclismo',     color: '#FC4C02' }, // naranja Strava
  { key: 'Ciclo Indoor', color: '#f59e0b' }, // ámbar
  { key: 'Running',      color: '#10b981' }, // verde esmeralda
  { key: 'Andar',        color: '#06b6d4' }, // cian
  { key: 'Pesas',        color: '#8b5cf6' }, // violeta
  { key: 'Estiramientos',color: '#ec4899' }, // rosa
  { key: 'Natación',     color: '#3b82f6' }, // azul
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px', padding: '0.9rem 1.1rem', minWidth: '190px'
    }}>
      <p style={{ fontWeight: 700, marginBottom: '0.6rem', color: '#f8fafc', fontSize: '0.9rem' }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '0.5rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
          Total actividades: <strong style={{ color: '#f8fafc' }}>{d?.count}</strong>
        </p>
        <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
          Tiempo total: <strong style={{ color: '#f8fafc' }}>{(d?.durationMin / 60).toFixed(1)} h</strong>
        </p>
        {d?.distanceKm > 0 && (
          <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
            Distancia: <strong style={{ color: '#f8fafc' }}>{d?.distanceKm} km</strong>
          </p>
        )}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {ACTIVITIES.map(({ key, color }) =>
          d?.[key] > 0 && (
            <p key={key} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color }}>
              <span>{key}</span>
              <strong>{d[key]}</strong>
            </p>
          )
        )}
      </div>
    </div>
  );
};

const ActivityBreakdown = ({ stats }) => {
  const [activeTab, setActiveTab] = useState('monthly');

  if (!stats) return (
    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      Cargando estadísticas...
    </div>
  );

  const data = stats[activeTab] || [];

  const totalActivities = data.reduce((s, d) => s + (d.count || 0), 0);
  const totalHours      = (data.reduce((s, d) => s + (d.durationMin || 0), 0) / 60).toFixed(1);
  const totalKm         = data.reduce((s, d) => s + (d.distanceKm || 0), 0).toFixed(1);

  // Conteo por tipo para el período visible
  const activityCounts = ACTIVITIES.map(({ key, color }) => ({
    key, color,
    count: data.reduce((s, d) => s + (d[key] || 0), 0)
  })).filter(a => a.count > 0);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header con tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 className="text-xl">Desglose de Actividades</h2>
        <div style={{
          display: 'flex', gap: '0.25rem',
          background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px'
        }}>
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.4rem 0.9rem', borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 500, fontFamily: 'inherit',
              background: activeTab === key ? 'var(--strava-orange)' : 'transparent',
              color: activeTab === key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs del período */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Actividades',   value: totalActivities, color: 'var(--strava-orange)', unit: '' },
          { label: 'Horas totales', value: totalHours,      color: 'var(--health-cyan)',   unit: 'h' },
          { label: 'Kilómetros',    value: totalKm,         color: '#8b5cf6',              unit: 'km' },
        ].map(({ label, value, color, unit }) => (
          <div key={label} style={{
            flex: '1 1 80px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
            padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.07)'
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color }}>
              {value}<span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '3px' }}>{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Mini-leyenda con conteo por actividad */}
      {activityCounts.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {activityCounts.map(({ key, color, count }) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '3px 10px', borderRadius: '20px',
              background: `${color}22`, border: `1px solid ${color}55`,
              fontSize: '0.76rem', color
            }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color }} />
              {key} <strong>({count})</strong>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico de barras apiladas */}
      {data.length === 0 ? (
        <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '2rem 0' }}>
          Sin datos para este período.
        </p>
      ) : (
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              barSize={activeTab === 'annual' ? 52 : activeTab === 'monthly' ? 30 : 20}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickLine={false} axisLine={false}
                interval={activeTab === 'daily' ? Math.max(0, Math.floor(data.length / 10)) : 0}
              />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend
                wrapperStyle={{ paddingTop: '12px', fontSize: '0.78rem' }}
                formatter={(val) => {
                  const act = ACTIVITIES.find(a => a.key === val);
                  return <span style={{ color: act?.color || '#fff' }}>{val}</span>;
                }}
              />
              {ACTIVITIES.map(({ key, color }, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={color}
                  radius={idx === ACTIVITIES.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ActivityBreakdown;
