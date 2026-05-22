import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

const TABS = [
  { key: 'running', label: '🏃 Running', metricKey: 'pace', unit: 'min/km', label2: 'Pace', inverted: true },
  { key: 'cycling', label: '🚴 Ciclismo', metricKey: 'speed', unit: 'km/h', label2: 'Velocidad', inverted: false },
  { key: 'swim',    label: '🏊 Natación', metricKey: 'per100', unit: 'min/100m', label2: 'T/100m', inverted: true },
];

const formatPaceLabel = (val) => {
  if (!val) return '';
  const m = Math.floor(val);
  const s = Math.round((val - m) * 60);
  return `${m}:${s.toString().padStart(2,'0')}`;
};

const PerformanceEvolution = ({ data }) => {
  const [activeTab, setActiveTab] = useState('running');
  if (!data) return null;

  const tabCfg = TABS.find(t => t.key === activeTab);
  const tabData = data[activeTab] || [];

  // Calcular tendencia
  let trend = null;
  if (tabData.length >= 2) {
    const first = tabData[0][tabCfg.metricKey];
    const last  = tabData[tabData.length - 1][tabCfg.metricKey];
    const diff  = parseFloat((last - first).toFixed(2));
    const improving = tabCfg.inverted ? diff < 0 : diff > 0;
    trend = { diff, improving };
  }

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="text-xl">Evolución del Rendimiento</h2>
          <p className="text-muted text-xs">Progresión de {tabCfg.label2} a lo largo del tiempo</p>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '0.35rem 0.75rem', borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 500, fontFamily: 'inherit',
              background: activeTab === t.key ? 'var(--strava-orange)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Tendencia */}
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
          {trend.improving
            ? <><TrendingDown size={16} color="#10b981" /><span style={{ color: '#10b981' }}>Mejorando</span></>
            : trend.diff === 0
            ? <><Minus size={16} color="#94a3b8" /><span style={{ color: '#94a3b8' }}>Estable</span></>
            : <><TrendingUp size={16} color="#ef4444" /><span style={{ color: '#ef4444' }}>Regresión</span></>
          }
          <span className="text-muted">
            ({trend.improving ? '' : '+'}{tabCfg.inverted ? -trend.diff : trend.diff} {tabCfg.unit} en las últimas {tabData.length} sesiones)
          </span>
        </div>
      )}

      {tabData.length === 0 ? (
        <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '2rem' }}>
          No hay datos suficientes de {tabCfg.label} en el histórico.
        </p>
      ) : (
        <div style={{ height: '230px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tabData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false}
                interval={Math.max(0, Math.floor(tabData.length / 8))} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={tabCfg.inverted ? formatPaceLabel : undefined}
                reversed={tabCfg.inverted}
              />
              <Tooltip
                contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                formatter={(val) => [tabCfg.inverted ? formatPaceLabel(val) : `${val} ${tabCfg.unit}`, tabCfg.label2]}
                labelFormatter={(label, payload) => {
                  const p = payload?.[0]?.payload;
                  return `${label}${p?.name ? ` — ${p.name}` : ''}${p?.distanceKm ? ` (${p.distanceKm}km)` : ''}`;
                }}
              />
              <Line
                type="monotone"
                dataKey={tabCfg.metricKey}
                stroke="var(--strava-orange)"
                strokeWidth={2.5}
                dot={{ fill: 'var(--strava-orange)', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default PerformanceEvolution;
