import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { BarChart2, Award, Zap, ShieldAlert, Heart, TrendingUp, TrendingDown } from 'lucide-react';

const AerobicEfficiency = ({ data }) => {
  const [activeTab, setActiveTab] = useState('zones'); // 'zones' o 'efficiency'
  const [efSport, setEfSport] = useState('Running'); // 'Running' o 'Ciclismo'

  if (!data || !data.zones) return null;

  const { zones, efficiencyHistory = [] } = data;

  const z1 = zones.z1 || 0;
  const z2 = zones.z2 || 0;
  const z3 = zones.z3 || 0;
  const z4 = zones.z4 || 0;
  const z5 = zones.z5 || 0;

  // Clasificación Fisiológica de Distribución de Intensidad (Sports Science Classifier)
  const lowIntensity = z1 + z2;
  const mediumIntensity = z3;
  const highIntensity = z4 + z5;

  let profile = {
    label: 'Distribución Mixta / No Estructurada ⚖️',
    color: '#38bdf8',
    desc: 'Tus entrenamientos muestran una distribución de zonas mixta. Para optimizar tu adaptación cardiovascular, considera estructurar tus semanas con metas más claras.'
  };

  if (lowIntensity >= 75 && highIntensity >= 10) {
    profile = {
      label: 'Entrenamiento Polarizado (80/20) 🎯',
      color: '#10b981',
      desc: '¡Distribución óptima de atletas de élite! La gran mayoría de tu volumen es muy suave (Base/Regenerativo) y tus sesiones intensas son de máxima exigencia. Esto previene el sobreentrenamiento y dispara tu rendimiento.'
    };
  } else if (lowIntensity >= 60 && mediumIntensity >= 20 && highIntensity < 15) {
    profile = {
      label: 'Entrenamiento Piramidal 📊',
      color: '#00e5ff',
      desc: 'Estructura clásica y altamente efectiva. Entrenas una base amplia en zonas suaves, moderando el trabajo en umbral/tempo y reservando un volumen mínimo para el VO2 máx. Muy sostenible.'
    };
  } else if (mediumIntensity + z4 >= 40 && lowIntensity < 60) {
    profile = {
      label: 'Umbral / Sweet Spot Dominante ⚡',
      color: '#FC4C02',
      desc: 'El "agujero negro" del entrenamiento amateur. Pasas demasiado tiempo en zonas medias (Z3/Z4) donde acumulas mucha fatiga pero no asimilas suficiente estímulo. Intenta rodar más suave en tus días fáciles y hacer las series a tope.'
    };
  }

  // Formatear datos para el gráfico de barras de zonas
  const zoneChartData = [
    { name: 'Z1 Recup.', porcentaje: z1, color: '#06b6d4', desc: 'Z1 - Recuperación (<114 ppm)' },
    { name: 'Z2 Resis.', porcentaje: z2, color: '#10b981', desc: 'Z2 - Resistencia (115-125 ppm)' },
    { name: 'Z3 Ritmo', porcentaje: z3, color: '#f59e0b', desc: 'Z3 - Ritmo (126-136 ppm)' },
    { name: 'Z4 Umbral', porcentaje: z4, color: '#FC4C02', desc: 'Z4 - Umbral (137-150 ppm)' },
    { name: 'Z5 Anaer.', porcentaje: z5, color: '#ef4444', desc: 'Z5 - Anaeróbico (>151 ppm)' }
  ];

  // Filtrar y calcular estadísticas de la evolución del Factor de Eficiencia (EF)
  const efSportData = efficiencyHistory.filter(act => {
    if (efSport === 'Running') return act.type === 'Running';
    if (efSport === 'Ciclismo') return act.type === 'Ciclismo' || act.type === 'Ciclo Indoor';
    return false;
  });

  let currentEf = 0;
  let efChange = null;
  if (efSportData.length >= 2) {
    const startActs = efSportData.slice(0, Math.min(3, efSportData.length));
    const endActs = efSportData.slice(-Math.min(3, efSportData.length));
    const startAvg = startActs.reduce((s, a) => s + a.ef, 0) / startActs.length;
    const endAvg = endActs.reduce((s, a) => s + a.ef, 0) / endActs.length;
    currentEf = endAvg;
    efChange = parseFloat((((endAvg - startAvg) / startAvg) * 100).toFixed(1));
  } else if (efSportData.length === 1) {
    currentEf = efSportData[0].ef;
  }

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
      
      {/* HEADER CON TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="text-xl" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart2 size={20} style={{ color: 'var(--chart-water)' }} /> Distribución e Intensidad Aeróbica
          </h2>
          <p className="text-muted text-xs">
            Zonas de pulso y Factor de Eficiencia (EF) en tus entrenamientos (Últimos 28d)
          </p>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '3px', border: '1px solid var(--glass-border)' }}>
          <button 
            onClick={() => setActiveTab('zones')} 
            className={`tab-btn ${activeTab === 'zones' ? 'active' : ''}`}
            style={{
              padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px', cursor: 'pointer', border: 'none',
              background: activeTab === 'zones' ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === 'zones' ? 'white' : 'var(--text-secondary)', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            Zonas de Pulso
          </button>
          <button 
            onClick={() => setActiveTab('efficiency')} 
            className={`tab-btn ${activeTab === 'efficiency' ? 'active' : ''}`}
            style={{
              padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px', cursor: 'pointer', border: 'none',
              background: activeTab === 'efficiency' ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === 'efficiency' ? 'white' : 'var(--text-secondary)', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            Factor de Eficiencia (EF)
          </button>
        </div>
      </div>

      {/* RENDER TAB: ZONAS DE INTENSIDAD */}
      {activeTab === 'zones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* CLASIFICACION DEL PERFIL */}
          <div style={{
            background: `${profile.color}08`, border: `1px solid ${profile.color}25`,
            borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={16} style={{ color: profile.color }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: profile.color }}>{profile.label}</span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-primary)', lineHeight: 1.45, margin: 0, fontWeight: 500 }}>
              {profile.desc}
            </p>
          </div>

          {/* GRAFICO DE BARRAS HORIZONTALES */}
          <div style={{ width: '100%', height: '180px', marginTop: '0.25rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={zoneChartData}
                layout="vertical"
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} width={65} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid var(--glass-border)', borderRadius: '10px' }}
                  formatter={(val, name, props) => [`${val}%`, props.payload.desc]}
                />
                <Bar 
                  dataKey="porcentaje" 
                  radius={[0, 4, 4, 0]} 
                  barSize={12}
                >
                  {zoneChartData.map((entry, index) => (
                    <Bar key={`cell-${index}`} dataKey="porcentaje" fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* FOOTER DESGLOSE */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(255,255,255,0.015)', border: '1px solid var(--glass-border)',
            borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '0.72rem', color: 'var(--text-secondary)'
          }}>
            <span>🟢 Suave (Z1/Z2): <strong>{lowIntensity.toFixed(1)}%</strong></span>
            <span>🟡 Moderado (Z3): <strong>{mediumIntensity.toFixed(1)}%</strong></span>
            <span>🔴 Intenso (Z4/Z5): <strong>{highIntensity.toFixed(1)}%</strong></span>
          </div>
        </div>
      )}

      {/* RENDER TAB: FACTOR DE EFICIENCIA (EF) */}
      {activeTab === 'efficiency' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          
          {/* CONTROL Y METRICAS RAPIDAS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
            
            {/* Toggle de Deporte */}
            <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '2px' }}>
              <button 
                onClick={() => setEfSport('Running')}
                style={{
                  padding: '0.3rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: efSport === 'Running' ? 'var(--strava-orange)' : 'transparent',
                  color: efSport === 'Running' ? '#fff' : 'var(--text-secondary)', fontWeight: 600, transition: 'all 0.2s'
                }}
              >
                🏃 Running
              </button>
              <button 
                onClick={() => setEfSport('Ciclismo')}
                style={{
                  padding: '0.3rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: efSport === 'Ciclismo' ? 'var(--strava-orange)' : 'transparent',
                  color: efSport === 'Ciclismo' ? '#fff' : 'var(--text-secondary)', fontWeight: 600, transition: 'all 0.2s'
                }}
              >
                🚴 Ciclismo
              </button>
            </div>

            {/* Metricas de evolocion */}
            {efSportData.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>EF actual (3 acts)</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>
                    {currentEf.toFixed(2)} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 400 }}>m/latido</span>
                  </span>
                </div>
                {efChange !== null && (
                  <div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Progresión</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '1rem', fontWeight: 800, color: efChange >= 0 ? '#10b981' : '#ef4444' }}>
                      {efChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {efChange >= 0 ? '+' : ''}{efChange}%
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MENSAJE EXPLICATIVO */}
          <div style={{
            background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)',
            borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', gap: '8px', alignItems: 'flex-start'
          }}>
            <Heart size={16} style={{ color: 'var(--health-cyan)', marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-primary)', lineHeight: 1.4, margin: 0, fontWeight: 500 }}>
              <strong>¿Qué es el Factor de Eficiencia (EF)?</strong> Mide la distancia en metros que avanzas por cada latido del corazón. A medida que tu resistencia aeróbica mejora, tu corazón impulsa más volumen sistólico, permitiéndote ir más rápido a la misma frecuencia cardíaca (la curva asciende).
            </p>
          </div>

          {/* GRAFICO DE EVOLUCION */}
          {efSportData.length === 0 ? (
            <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--glass-border)', borderRadius: '12px' }}>
              <span className="text-muted text-xs">No hay entrenamientos de {efSport === 'Running' ? 'carrera' : 'ciclismo'} con frecuencia cardíaca en los últimos 28 días.</span>
            </div>
          ) : (
            <div style={{ width: '100%', height: '170px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={efSportData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid var(--glass-border)', borderRadius: '10px' }}
                    formatter={(val) => [`${val} m/latido`, 'Factor de Eficiencia (EF)']}
                    labelFormatter={(label, payload) => {
                      const p = payload?.[0]?.payload;
                      return `${label}${p?.name ? ` — ${p.name}` : ''}`;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ef" 
                    stroke="var(--health-cyan)" 
                    strokeWidth={2.5} 
                    dot={{ fill: 'var(--health-cyan)', r: 3.5, strokeWidth: 0 }} 
                    activeDot={{ r: 5 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default AerobicEfficiency;
