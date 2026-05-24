import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { BarChart2, Award, Zap, ShieldAlert } from 'lucide-react';

const AerobicEfficiency = ({ data }) => {
  if (!data || !data.zones) return null;

  const { zones } = data;

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
    desc: 'Tus entrenamientos muestran una distribución dispersa. Para optimizar tu adaptación cardiovascular, considera estructurar tus semanas con metas más claras.'
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
    { name: 'Z1 Recup.', porcentaje: z1, color: '#06b6d4', desc: 'Z1 - Recuperación Activa (<114 ppm)' },
    { name: 'Z2 Base', porcentaje: z2, color: '#10b981', desc: 'Z2 - Base Aeróbica / Quema de grasas (114-151 ppm)' },
    { name: 'Z3 Tempo', porcentaje: z3, color: '#f59e0b', desc: 'Z3 - Tempo / Sweet Spot (152-170 ppm)' },
    { name: 'Z4 Umbral', porcentaje: z4, color: '#FC4C02', desc: 'Z4 - Umbral del Lactato (171-189 ppm)' },
    { name: 'Z5 VO2', porcentaje: z5, color: '#ef4444', desc: 'Z5 - Capacidad Anaeróbica (>190 ppm)' }
  ];

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
      
      {/* HEADER */}
      <div>
        <h2 className="text-xl" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BarChart2 size={20} style={{ color: 'var(--chart-water)' }} /> Distribución de Intensidad (Últimos 28 días)
        </h2>
        <p className="text-muted text-xs">
          Análisis del volumen total entrenado en zonas de frecuencia cardíaca.
        </p>
      </div>

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
  );
};

export default AerobicEfficiency;
