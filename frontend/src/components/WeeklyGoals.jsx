import React, { useState } from 'react';
import { Target, Edit3, Check, X } from 'lucide-react';

const RING_R = 38;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

const Ring = ({ pct, color, icon, sport, achieved, target, unit, size = 100 }) => {
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(pct, 100) / 100);
  const isComplete = pct >= 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', minWidth: '90px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
          {/* Progress */}
          <circle
            cx="50" cy="50" r={RING_R} fill="none"
            stroke={isComplete ? '#10b981' : color}
            strokeWidth="9" strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease', filter: isComplete ? `drop-shadow(0 0 4px #10b981)` : `drop-shadow(0 0 3px ${color})` }}
          />
        </svg>
        {/* Center emoji */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '1.4rem'
        }}>
          {isComplete ? '✅' : icon}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '1px' }}>{sport}</p>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: isComplete ? '#10b981' : color }}>
          {achieved}<span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginLeft: '2px' }}>{unit}</span>
        </p>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>/ {target} {unit}</p>
      </div>
    </div>
  );
};

const SPORT_COLORS = {
  Running: '#10b981', Ciclismo: '#FC4C02', 'Ciclo Indoor': '#f59e0b',
  Natación: '#3b82f6', Pesas: '#8b5cf6', Estiramientos: '#ec4899', Andar: '#06b6d4'
};

const WeeklyGoals = ({ goals, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({});

  if (!goals) return null;

  const entries = Object.entries(goals);
  const completed = entries.filter(([, g]) => g.pct >= 100).length;

  const handleEdit = () => {
    const v = {};
    entries.forEach(([sport, g]) => { v[sport] = g.target; });
    setEditValues(v);
    setEditing(true);
  };

  const handleSave = () => {
    const updated = {};
    entries.forEach(([sport, g]) => {
      updated[sport] = { target: parseFloat(editValues[sport]) || g.target };
    });
    onSave(updated);
    setEditing(false);
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-xl">Metas Semanales</h2>
          <p className="text-muted text-xs">{completed}/{entries.length} objetivos completados esta semana</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {editing ? (
            <>
              <button onClick={handleSave} style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#10b981', borderRadius: '7px', padding: '0.35rem 0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}><Check size={13} /> Guardar</button>
              <button onClick={() => setEditing(false)} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '7px', padding: '0.35rem 0.7rem', cursor: 'pointer', fontSize: '0.78rem' }}><X size={13} /></button>
            </>
          ) : (
            <button onClick={handleEdit} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)', borderRadius: '7px', padding: '0.35rem 0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontFamily: 'inherit' }}>
              <Edit3 size={13} /> Editar metas
            </button>
          )}
        </div>
      </div>

      {/* Edición de objetivos */}
      {editing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem' }}>
          {entries.map(([sport, g]) => (
            <div key={sport} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
              <p style={{ fontSize: '0.75rem', marginBottom: '0.3rem', color: SPORT_COLORS[sport] }}>{g.icon} {sport}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="number"
                  value={editValues[sport] || ''}
                  onChange={e => setEditValues(p => ({ ...p, [sport]: e.target.value }))}
                  style={{
                    width: '70px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px', padding: '4px 8px', color: 'white', fontSize: '0.82rem', fontFamily: 'inherit'
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{g.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Anillos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', justifyContent: 'center' }}>
        {entries.map(([sport, g]) => (
          <Ring
            key={sport} sport={sport} icon={g.icon}
            pct={g.pct} achieved={g.achieved} target={g.target} unit={g.unit}
            color={SPORT_COLORS[sport] || '#94a3b8'}
          />
        ))}
      </div>

      {/* Barra de progreso global */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Progreso global de la semana</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--health-green)', fontWeight: 600 }}>{Math.round(entries.reduce((s, [, g]) => s + g.pct, 0) / entries.length)}%</span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            width: `${Math.round(entries.reduce((s, [, g]) => s + g.pct, 0) / entries.length)}%`,
            background: 'linear-gradient(90deg, #FC4C02, #10b981)',
            transition: 'width 0.8s ease'
          }} />
        </div>
      </div>
    </div>
  );
};

export default WeeklyGoals;
