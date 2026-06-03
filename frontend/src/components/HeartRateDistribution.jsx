import React from 'react';

const ZONE_COLORS = {
  z1: '#06b6d4', z2: '#10b981', z3: '#f59e0b', z4: '#FC4C02', z5: '#ef4444'
};
const ZONE_LABELS = {
  z1: 'Z1 Recuperación', z2: 'Z2 Resistencia', z3: 'Z3 Ritmo',
  z4: 'Z4 Umbral', z5: 'Z5 Anaeróbico'
};
const ZONE_DESC = {
  z1: '< 114 bpm', z2: '115–125 bpm', z3: '126–136 bpm',
  z4: '137–150 bpm', z5: '> 151 bpm'
};

const HeartRateDistribution = ({ data }) => {
  if (!data || data.error || !data.hasHrData) return null;

  const { zones } = data;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h2 className="text-xl" style={{ fontSize: '1.1rem', fontWeight: 700 }}>Distribución de Frecuencia Cardíaca</h2>
        <p className="text-muted text-xs">Zonas de intensidad de tus entrenamientos (Últimos 28d)</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {Object.entries(zones).map(([z, pct]) => (
          <div key={z}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontSize: '0.72rem', color: ZONE_COLORS[z], fontWeight: 600 }}>{ZONE_LABELS[z]}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{ZONE_DESC[z]} · {pct}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, borderRadius: '3px',
                background: ZONE_COLORS[z], transition: 'width 0.8s ease',
                boxShadow: `0 0 6px ${ZONE_COLORS[z]}66`
              }} />
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.35 }}>
        💡 <strong>Método polarizado:</strong> El 80% de tus entrenamientos debería realizarse en zonas de baja intensidad (Z1-Z2) para optimizar la base aeróbica.
        {zones.z1 + zones.z2 >= 80
          ? <span style={{ color: '#10b981', fontWeight: 600 }}> ✅ ¡Excelente! Estás cumpliendo este principio.</span>
          : <span style={{ color: '#f59e0b', fontWeight: 600 }}> Actualmente estás en un {(zones.z1 + zones.z2).toFixed(0)}% en Z1-Z2. Intenta rodar más suave.</span>
        }
      </p>
    </div>
  );
};

export default HeartRateDistribution;
