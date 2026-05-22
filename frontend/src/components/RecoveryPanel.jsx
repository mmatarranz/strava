import React from 'react';

const ZONE_COLORS = {
  z1: '#06b6d4', z2: '#10b981', z3: '#f59e0b', z4: '#FC4C02', z5: '#ef4444'
};
const ZONE_LABELS = {
  z1: 'Z1 Recuperación', z2: 'Z2 Aeróbico', z3: 'Z3 Umbral',
  z4: 'Z4 Anaeróbico', z5: 'Z5 Máxima'
};
const ZONE_DESC = {
  z1: '< 114 bpm', z2: '114–152 bpm', z3: '152–171 bpm',
  z4: '171–190 bpm', z5: '> 190 bpm'
};

const RecoveryPanel = ({ data }) => {
  if (!data) return null;

  const { activeDays, restDays, streak, zones, hasHrData, last28 } = data;

  const streakColor = streak > 6 ? '#ef4444' : streak > 4 ? '#f59e0b' : '#10b981';

  // Semáforo de recuperación
  const status = restDays < 4
    ? { label: '⚠️ Descansa más', color: '#ef4444', hint: 'Menos de 4 días de descanso en 4 semanas. Riesgo de sobreentrenamiento.' }
    : restDays > 18
    ? { label: '😴 Más actividad', color: '#06b6d4', hint: 'Más de 18 días de descanso. Podrías aumentar la carga gradualmente.' }
    : { label: '✅ Balance correcto', color: '#10b981', hint: 'Buen equilibrio entre carga y recuperación.' };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 className="text-xl">Recuperación y Descanso</h2>
        <p className="text-muted text-xs">Análisis de las últimas 4 semanas</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Días activos', value: activeDays, color: 'var(--strava-orange)', unit: '/28' },
          { label: 'Días descanso', value: restDays, color: 'var(--health-cyan)', unit: '/28' },
          { label: 'Racha actual', value: streak, color: streakColor, unit: 'd' },
        ].map(({ label, value, color, unit }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
            padding: '0.75rem 0.5rem', textAlign: 'center', border: `1px solid ${color}33`
          }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color }}>
              {value}<span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{unit}</span>
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Estado de recuperación */}
      <div style={{
        background: `${status.color}18`, border: `1px solid ${status.color}44`,
        borderRadius: '8px', padding: '0.7rem 1rem'
      }}>
        <p style={{ fontWeight: 600, color: status.color, fontSize: '0.85rem', marginBottom: '2px' }}>{status.label}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{status.hint}</p>
      </div>

      {/* Mini-calendario de los últimos 28 días */}
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Últimos 28 días</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {last28.map(({ date, label, active }) => (
            <div key={date} title={date} style={{
              aspectRatio: '1', borderRadius: '5px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.65rem', fontWeight: 500,
              background: active ? 'rgba(252,76,2,0.7)' : 'rgba(255,255,255,0.05)',
              color: active ? 'white' : 'var(--text-secondary)',
              border: active ? '1px solid rgba(252,76,2,0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}>{label}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(252,76,2,0.7)' }} /> Entreno
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)' }} /> Descanso
          </div>
        </div>
      </div>

      {/* Zonas de FC */}
      {hasHrData && (
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            Distribución de Frecuencia Cardíaca
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {Object.entries(zones).map(([z, pct]) => (
              <div key={z}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '0.72rem', color: ZONE_COLORS[z] }}>{ZONE_LABELS[z]}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{ZONE_DESC[z]} · {pct}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`, borderRadius: '3px',
                    background: ZONE_COLORS[z], transition: 'width 0.8s ease',
                    boxShadow: `0 0 6px ${ZONE_COLORS[z]}88`
                  }} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            💡 Método polarizado: 80% del tiempo debería estar en Z1-Z2.
            {zones.z1 + zones.z2 >= 80
              ? <span style={{ color: '#10b981' }}> ✅ Lo estás cumpliendo.</span>
              : <span style={{ color: '#f59e0b' }}> Actualmente {(zones.z1 + zones.z2).toFixed(0)}% en Z1-Z2.</span>
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default RecoveryPanel;
