import React from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Target, AlertTriangle, CheckCircle } from 'lucide-react';

// Arc progress SVG (semicírculo)
const ArcProgress = ({ pct, color, size = 160 }) => {
  const r = 60, cx = size / 2, cy = size / 2 + 15;
  const totalAngle = Math.PI; // semicírculo
  const endAngle = Math.PI + Math.min(pct / 100, 1) * totalAngle;
  const x1 = cx + r * Math.cos(Math.PI), y1 = cy + r * Math.sin(Math.PI);
  const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
  const largeArc = pct > 50 ? 1 : 0;
  return (
    <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
      {/* Track */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
      {/* Progress arc */}
      {pct > 0 && (
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      )}
    </svg>
  );
};

const GoalCard = ({ title, emoji, total, goal, outdoor, indoor, projected, kmNeeded, monthsRemaining, color }) => {
  const pct = Math.min((total / goal) * 100, 100);
  const onTrack = projected >= goal;
  const monthlyNeeded = monthsRemaining > 0 ? (kmNeeded / monthsRemaining).toFixed(0) : 0;

  return (
    <div className="glass-panel" style={{ flex: '1 1 320px', minWidth: 0, position: 'relative', overflow: 'hidden' }}>
      {/* Glow de fondo */}
      <div style={{
        position: 'absolute', top: '-30px', right: '-30px',
        width: '180px', height: '180px', borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`, pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <p className="text-muted text-xs">{emoji} Objetivo {new Date().getFullYear()}</p>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px',
          borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
          background: onTrack ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          color: onTrack ? '#10b981' : '#ef4444',
          border: `1px solid ${onTrack ? '#10b98155' : '#ef444455'}`
        }}>
          {onTrack ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
          {onTrack ? 'En camino' : 'Por debajo'}
        </div>
      </div>

      {/* Arco de progreso + número central */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ArcProgress pct={pct} color={color} size={160} />
          <div style={{
            position: 'absolute', bottom: '0px', left: '50%', transform: 'translateX(-50%)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>
              {total.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>/ {goal.toLocaleString()} km</p>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {/* Barra lineal */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Progreso</span>
              <span style={{ fontSize: '0.72rem', color, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, borderRadius: '4px',
                background: `linear-gradient(90deg, ${color}88, ${color})`,
                transition: 'width 1s ease', boxShadow: `0 0 8px ${color}66`
              }} />
            </div>
          </div>

          {/* Stats compactos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            {[
              { l: 'Proyección', v: `${projected.toLocaleString()} km`, c: onTrack ? '#10b981' : '#ef4444' },
              { l: 'Faltan', v: `${kmNeeded.toLocaleString()} km`, c: 'var(--text-secondary)' },
              { l: 'Meses restantes', v: monthsRemaining, c: 'var(--text-secondary)' },
              { l: 'Necesitas/mes', v: `${monthlyNeeded} km`, c: onTrack ? 'var(--text-secondary)' : '#f59e0b' },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '0.35rem 0.5rem' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{l}</p>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: c }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Desglose Outdoor / Indoor para ciclismo */}
          {(outdoor !== undefined) && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                Exterior: <strong style={{ color }}>{outdoor.toLocaleString()} km</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                Indoor: <strong style={{ color: '#f59e0b' }}>{indoor.toLocaleString()} km</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.8rem 1rem' }}>
      <p style={{ fontWeight: 600, marginBottom: '0.4rem', color: '#f8fafc' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize: '0.78rem', color: p.color }}>
          {p.name}: <strong>{p.value.toFixed(1)} km</strong>
        </p>
      ))}
    </div>
  );
};

const AnnualGoalProgress = ({ data }) => {
  if (!data || data.error || !data.totals) return null;
  const { totals, goals, projected, kmNeeded, monthsRemaining, monthly } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Etiqueta de sección */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Target size={18} color="var(--strava-orange)" />
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.8rem' }}>
          Objetivos Anuales {data.year}
        </h2>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      </div>

      {/* Cards de objetivo */}
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        <GoalCard
          title="Ciclismo Total"
          emoji="🚴"
          total={totals.cycling}
          goal={goals.cycling}
          outdoor={totals.cyclingOutdoor}
          indoor={totals.cyclingIndoor}
          projected={projected.cycling}
          kmNeeded={kmNeeded.cycling}
          monthsRemaining={monthsRemaining}
          color="var(--strava-orange)"
        />
        <GoalCard
          title="Running"
          emoji="🏃"
          total={totals.running}
          goal={goals.running}
          projected={projected.running}
          kmNeeded={kmNeeded.running}
          monthsRemaining={monthsRemaining}
          color="var(--health-green)"
        />
      </div>

      {/* Gráfico mensual de km */}
      <div className="glass-panel">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Kilómetros por mes</h3>
        <div style={{ height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthly} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.78rem' }} />
              <Bar dataKey="cycling" name="🚴 Ciclismo" stackId="c" fill="#FC4C02" radius={[0,0,0,0]} barSize={28} />
              <Bar dataKey="cicloIndoor" name="🏋️ Ciclo Indoor" stackId="c" fill="#f59e0b" radius={[3,3,0,0]} barSize={28} />
              <Bar dataKey="running" name="🏃 Running" fill="var(--health-green)" radius={[3,3,0,0]} barSize={14} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnnualGoalProgress;
