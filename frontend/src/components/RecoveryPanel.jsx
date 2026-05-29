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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        {[
          { label: 'Sueño (Withings)', value: `${sleepData?.currentScore || 78}`, color: 'var(--health-cyan)', unit: '%' },
          { label: 'RHR Reposo', value: `${rhrData?.current || 55}`, color: 'var(--chart-indoor)', unit: 'ppm' },
          { label: 'Respiración', value: `${sleepData?.breathingRate?.current || 13.2}`, color: 'var(--health-green)', unit: 'rpm' },
          { label: 'Racha Activa', value: streak, color: streakColor, unit: 'd' },
        ].map(({ label, value, color, unit }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
            padding: '0.65rem 0.2rem', textAlign: 'center', border: `1px solid ${color}22`
          }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color }}>
              {value}<span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{unit}</span>
            </p>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.1' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* 😴 DESGLOSE DE FASES DE SUEÑO (WITHINGS) */}
      {sleepData?.stages && (
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', fontWeight: 600 }}>
            Desglose de Fases de Sueño (Última Noche)
          </p>
          
          {/* Segmented bar */}
          <div style={{ 
            width: '100%', height: '12px', background: 'rgba(255,255,255,0.04)', 
            borderRadius: '6px', overflow: 'hidden', display: 'flex', marginBottom: '0.75rem' 
          }}>
            {[
              { key: 'deep',  val: sleepData.stages.deep,  color: '#06b6d4' },
              { key: 'light', val: sleepData.stages.light, color: '#10b981' },
              { key: 'rem',   val: sleepData.stages.rem,   color: '#8b5cf6' },
              { key: 'awake', val: sleepData.stages.awake, color: '#f59e0b' }
            ].map(({ key, val, color }) => {
              const totalTime = sleepData.stages.deep + sleepData.stages.light + sleepData.stages.rem + sleepData.stages.awake || 1;
              const pct = (val / totalTime) * 100;
              return val > 0 ? (
                <div 
                  key={key} 
                  title={`${key}: ${val}h (${Math.round(pct)}%)`}
                  style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.5s ease' }} 
                />
              ) : null;
            })}
          </div>

          {/* Leyenda de fases */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem 0.75rem' }}>
            {[
              { label: 'Profundo (Físico)', val: `${sleepData.stages.deep}h`, color: '#06b6d4', desc: 'Recuperación de fibras' },
              { label: 'REM (Neural)', val: `${sleepData.stages.rem}h`, color: '#8b5cf6', desc: 'Asimilación mental' },
              { label: 'Ligero', val: `${sleepData.stages.light}h`, color: '#10b981', desc: 'Transición/Descanso' },
              { label: 'Despierto', val: `${sleepData.stages.awake}h`, color: '#f59e0b', desc: 'Interrupciones nocturnas' }
            ].map(({ label, val, color, desc }) => (
              <div key={label} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, marginTop: '4px' }} />
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'white', lineHeight: '1.2' }}>{label} <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>· {val}</span></p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', lineHeight: '1.1' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecoveryPanel;
