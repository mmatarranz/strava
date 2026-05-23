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
  if (!data || data.error) return null;

  const { activeDays, restDays, streak, zones, hasHrData, last28, sleepData, rhrData, recoveryScore, withingsConnected } = data;

  const streakColor = streak > 6 ? '#ef4444' : streak > 4 ? '#f59e0b' : '#10b981';

  // Obtener estado basado en score científico
  const getRecoveryStatus = (score) => {
    if (score >= 80) return { label: '🟢 Óptima', desc: '¡Listo para entrenar! Cuerpo completamente recuperado.', color: '#10b981' };
    if (score >= 50) return { label: '🟡 Moderada', desc: 'Recuperación parcial. Se recomienda sesión suave o Z2.', color: '#f59e0b' };
    return { label: '🔴 Baja', desc: 'Fatiga elevada. Considera un día de descanso absoluto o estiramientos.', color: '#ef4444' };
  };

  const status = getRecoveryStatus(recoveryScore);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-xl">Recuperación y Descanso</h2>
          <p className="text-muted text-xs">Análisis cruzado Strava × Withings</p>
        </div>
        {withingsConnected && <span style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.15)', color: 'var(--health-cyan)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>Biometría Activa</span>}
      </div>

      {/* 🧪 CÍRCULO / DIAL DE RECUPERACIÓN CIENTÍFICA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', padding: '1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
        
        {/* Marcador Numérico */}
        <div style={{
          position: 'relative', width: '75px', height: '75px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 16px ${status.color}1b`,
          border: `3.5px solid ${status.color}33`,
          background: 'rgba(15,23,42,0.6)'
        }}>
          <span style={{ fontSize: '1.65rem', fontWeight: 800, color: status.color }}>
            {recoveryScore}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>%</span>
          </span>
        </div>

        {/* Mensaje de Estado */}
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, color: status.color, fontSize: '0.95rem', marginBottom: '3px' }}>{status.label}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.25' }}>{status.desc}</p>
        </div>
      </div>

      {/* KPIs DE RECUPERACIÓN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
        {[
          { label: 'Sueño (Withings)', value: `${sleepData?.currentScore || 78}`, color: 'var(--health-cyan)', unit: '%' },
          { label: 'RHR Reposo', value: `${rhrData?.current || 55}`, color: 'var(--chart-indoor)', unit: 'ppm' },
          { label: 'Racha Activa', value: streak, color: streakColor, unit: 'd' },
        ].map(({ label, value, color, unit }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
            padding: '0.65rem 0.4rem', textAlign: 'center', border: `1px solid ${color}22`
          }}>
            <p style={{ fontSize: '1.35rem', fontWeight: 800, color }}>
              {value}<span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{unit}</span>
            </p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.1' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* MINI-CALENDARIO DE LOS ÚLTIMOS 28 DÍAS */}
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Días de entrenamiento (28d)</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {last28.map(({ date, label, active }) => (
            <div key={date} title={date} style={{
              aspectRatio: '1', borderRadius: '5px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.65rem', fontWeight: 500,
              background: active ? 'rgba(252,76,2,0.7)' : 'rgba(255,255,255,0.04)',
              color: active ? 'white' : 'var(--text-secondary)',
              border: active ? '1px solid rgba(252,76,2,0.3)' : '1px solid rgba(255,255,255,0.05)',
            }}>{label}</div>
          ))}
        </div>
      </div>

      {/* DISTRIBUCIÓN DE FRECUENCIA CARDÍACA (Strava) */}
      {hasHrData && (
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Distribución de Frecuencia Cardíaca
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {Object.entries(zones).map(([z, pct]) => (
              <div key={z}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '0.72rem', color: ZONE_COLORS[z] }}>{ZONE_LABELS[z]}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{ZONE_DESC[z]} · {pct}%</span>
                </div>
                <div style={{ height: '5px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`, borderRadius: '3px',
                    background: ZONE_COLORS[z], transition: 'width 0.8s ease',
                    boxShadow: `0 0 6px ${ZONE_COLORS[z]}66`
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
