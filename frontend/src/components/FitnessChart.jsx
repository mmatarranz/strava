import React, { useState } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import { Zap, Calendar, TrendingUp } from 'lucide-react';

const FitnessChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Estados interactivos para Timeframe y Simulador de Carga Futura
  const [timeframe, setTimeframe] = useState(90); // 30, 90, 180
  const [futureTss, setFutureTss] = useState(40); // Carga diaria por defecto para simulación (TSS)
  const [showSimulator, setShowSimulator] = useState(false);

  // Filtrar el histórico de acuerdo al rango seleccionado
  const historicalData = data.slice(-timeframe);
  const latest = historicalData[historicalData.length - 1] || data[data.length - 1];

  // 1. Zonas de entrenamiento científicas de Coggan basadas en el TSB
  const getCogganZone = (tsb) => {
    if (tsb < -30) return { label: 'Sobrecarga Extrema ⚠️', desc: 'Riesgo alto de lesión/sobreentrenamiento. Necesitas descanso.', color: '#ef4444', zone: 'Overtraining' };
    if (tsb >= -30 && tsb < -10) return { label: 'Entrenamiento Óptimo ⚡', desc: 'Zona productiva de gran ganancia cardiovascular.', color: '#f59e0b', zone: 'Optimal' };
    if (tsb >= -10 && tsb <= 5) return { label: 'Mantenimiento / Transición ⚙️', desc: 'Zona neutra. Ideal para transiciones o semanas suaves.', color: '#38bdf8', zone: 'Neutral' };
    if (tsb > 5 && tsb <= 25) return { label: 'Pico de Forma / Frescura 🏆', desc: 'Zona óptima de frescura. ¡Listo para competir al máximo!', color: '#10b981', zone: 'Freshness' };
    return { label: 'Pérdida de Fitness 😴', desc: 'Demasiado descanso. Pérdida paulatina de tu capacidad atlética.', color: '#94a3b8', zone: 'Transition' };
  };

  const tsbStatus = getCogganZone(latest.tsb);

  // 2. Calcular el Ramp Rate (Tasa de Rampa de Fitness) - Comparar CTL hoy con CTL hace 7 días
  const ctl7DaysAgo = historicalData.length >= 8 
    ? historicalData[historicalData.length - 8].ctl 
    : historicalData[0]?.ctl || 0;
  const rampRate = parseFloat((latest.ctl - ctl7DaysAgo).toFixed(1));

  const getRampRateStatus = (ramp) => {
    if (ramp >= 8) return { text: `Tasa alta (+${ramp} ctl/sem) 🚨`, color: '#ef4444', desc: '¡Cuidado! Subir fitness demasiado rápido causa fatiga excesiva.' };
    if (ramp >= 2 && ramp < 8) return { text: `Adaptación óptima (+${ramp} ctl/sem) ✅`, color: '#10b981', desc: 'Ritmo excelente y sostenible de progresión física.' };
    if (ramp >= -2 && ramp < 2) return { text: `Mantenimiento (${ramp >= 0 ? '+' : ''}${ramp} ctl/sem) ⚖️`, color: '#38bdf8', desc: 'Nivel estable de entrenamiento. Ideal para conservar el estado.' };
    return { text: `Descanso / Pérdida (${ramp} ctl/sem) 🛌`, color: '#94a3b8', desc: 'Periodo de recuperación o periodo de bajo volumen.' };
  };

  const rampStatus = getRampRateStatus(rampRate);

  // 3. Simulación de Carga Futura (7 días) usando fórmulas exponenciales del PMC
  let simCtl = latest.ctl;
  let simAtl = latest.atl;
  const ctlDecay = Math.exp(-1 / 42);
  const atlDecay = Math.exp(-1 / 7);
  const simulatedDays = [];

  for (let j = 1; j <= 7; j++) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + j);

    simCtl = simCtl * ctlDecay + futureTss * (1 - ctlDecay);
    simAtl = simAtl * atlDecay + futureTss * (1 - atlDecay);
    const simTsb = simCtl - simAtl;

    simulatedDays.push({
      date: nextDate.toISOString().split('T')[0],
      label: nextDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      ctl: parseFloat(simCtl.toFixed(1)),
      atl: parseFloat(simAtl.toFixed(1)),
      tsb: parseFloat(simTsb.toFixed(1)),
      load: futureTss,
      isFuture: true
    });
  }

  // Fusionar histórico con simulación futura si está activada
  const chartData = [
    ...historicalData.map(d => ({ ...d, isFuture: false })),
    ...(showSimulator ? simulatedDays : [])
  ];

  // Controlar qué etiquetas del eje X mostrar para que no se saturen
  const tickFormatter = (val, i) => {
    const totalCount = chartData.length;
    const interval = totalCount > 100 ? 20 : totalCount > 40 ? 10 : 5;
    return i % interval === 0 ? val : '';
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* CABECERA CON TÍTULO Y SELECTOR DE PERÍODO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-xl" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1rem' }}>
            <TrendingUp size={20} style={{ color: 'var(--health-cyan)' }} />
            Forma Atlética Profesional (PMC)
          </h2>
          <p className="text-muted text-xs">
            Fitness crónico (CTL) · Fatiga aguda (ATL) · Balance de forma (TSB) basado en el modelo de Coggan
          </p>
        </div>

        {/* SELECTOR DE PERÍODO */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.25rem', border: '1px solid var(--glass-border)' }}>
          {[
            { value: 30, label: '30 Días' },
            { value: 90, label: '90 Días' },
            { value: 180, label: '180 Días' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimeframe(opt.value)}
              style={{
                background: timeframe === opt.value ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: timeframe === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.3rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES DE ESTADO ACTUAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        
        {/* FITNESS */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--health-cyan)' }}></span>
            Fitness actual (CTL)
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--health-cyan)' }}>{latest.ctl}</span>
            <span style={{ fontSize: '0.75rem', color: rampStatus.color }} title={rampStatus.desc}>
              {rampRate >= 0 ? '▲' : '▼'} {Math.abs(rampRate)}/sem
            </span>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Carga acumulada de 42 días.
          </p>
        </div>

        {/* FATIGA */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(252, 76, 2, 0.2)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--strava-orange)' }}></span>
            Fatiga acumulada (ATL)
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--strava-orange)' }}>{latest.atl}</span>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Estrés metabólico de los últimos 7 días.
          </p>
        </div>

        {/* BALANCE DE FORMA (TSB) */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${tsbStatus.color}33`, borderRadius: '12px', padding: '0.75rem 1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: tsbStatus.color }}></span>
            Balance / Forma (TSB)
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: tsbStatus.color }}>
              {latest.tsb > 0 ? '+' : ''}{latest.tsb}
            </span>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={tsbStatus.label}>
            Estado: <strong>{tsbStatus.label}</strong>
          </p>
        </div>

      </div>

      {/* WIDGET DE DETALLE DE ZONA Y TASA DE RAMPA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
        
        {/* DESCRIPCIÓN DE LA ZONA COGGAN */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Zona TSB: <span style={{ color: tsbStatus.color }}>{tsbStatus.zone}</span>
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
            {tsbStatus.desc}
          </p>
        </div>

        {/* TASA DE RAMPA */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Velocidad de Adaptación: <span style={{ color: rampStatus.color }}>{rampStatus.text}</span>
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
            {rampStatus.desc}
          </p>
        </div>
      </div>

      {/* BOTÓN PARA ABRIR EL SIMULADOR DE CARGA FUTURA */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          style={{
            background: showSimulator ? 'rgba(252, 76, 2, 0.15)' : 'rgba(255,255,255,0.04)',
            color: showSimulator ? 'var(--strava-orange)' : 'var(--text-primary)',
            border: `1px solid ${showSimulator ? 'var(--strava-orange)' : 'var(--glass-border)'}`,
            borderRadius: '8px',
            padding: '0.4rem 1rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease'
          }}
        >
          <Calendar size={14} />
          {showSimulator ? 'Ocultar Simulador' : 'Simular Proyección a 7 Días'}
        </button>
      </div>

      {/* PANEL DEL SIMULADOR DE CARGA FUTURA */}
      {showSimulator && (
        <div style={{
          background: 'rgba(252, 76, 2, 0.03)',
          border: '1px dashed rgba(252, 76, 2, 0.25)',
          borderRadius: '12px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                🛠️ Simulador de Carga Diaria Planeada (Próximos 7 días)
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Introduce la carga diaria estimada (TSS). Observa cómo cambiará tu rendimiento, fatiga y frescura el próximo domingo.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--strava-orange)' }}>{futureTss}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Carga/Día (TSS)</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <input
              type="range"
              min="0"
              max="150"
              step="5"
              value={futureTss}
              onChange={(e) => setFutureTss(Number(e.target.value))}
              style={{
                flex: 1,
                accentColor: 'var(--strava-orange)',
                cursor: 'pointer',
                minWidth: '200px'
              }}
            />
            
            {/* Presets Rápidos */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {[
                { label: 'Descanso (0)', val: 0 },
                { label: 'Suave (25)', val: 25 },
                { label: 'Medio (50)', val: 50 },
                { label: 'Intenso (85)', val: 85 },
                { label: 'Épico (120)', val: 120 }
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setFutureTss(preset.val)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.62rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resultado de la simulación */}
          <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <span>Domingo que viene (proyección):</span>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span>Fitness: <strong style={{ color: 'var(--health-cyan)' }}>{simulatedDays[simulatedDays.length - 1]?.ctl}</strong></span>
              <span>Fatiga: <strong style={{ color: 'var(--strava-orange)' }}>{simulatedDays[simulatedDays.length - 1]?.atl}</strong></span>
              <span>Forma (TSB): <strong style={{ color: getCogganZone(simulatedDays[simulatedDays.length - 1]?.tsb).color }}>
                {simulatedDays[simulatedDays.length - 1]?.tsb > 0 ? '+' : ''}{simulatedDays[simulatedDays.length - 1]?.tsb}
              </strong> ({getCogganZone(simulatedDays[simulatedDays.length - 1]?.tsb).zone})</span>
            </div>
          </div>
        </div>
      )}

      {/* GRÁFICO PMC */}
      <div style={{ height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} />
            
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  const isFuture = item.isFuture;
                  const itemTsbStatus = getCogganZone(item.tsb);
                  return (
                    <div style={{
                      background: 'rgba(15,23,42,0.95)',
                      border: `1px solid ${isFuture ? 'rgba(252, 76, 2, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        <span>{item.date || 'Proyección'} ({item.label})</span>
                        {isFuture && <span style={{ color: 'var(--strava-orange)', fontSize: '0.65rem' }}>PROYECTADO</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--health-cyan)' }}>CTL: <strong>{item.ctl}</strong></span>
                        <span style={{ color: 'var(--strava-orange)' }}>ATL: <strong>{item.atl}</strong></span>
                        <span style={{ color: itemTsbStatus.color }}>TSB: <strong>{item.tsb > 0 ? '+' : ''}{item.tsb}</strong></span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                        Carga diaria: {item.load || 0} · {itemTsbStatus.label}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            
            {/* Zonas representativas en el gráfico */}
            {/* Zona de Overtraining / Sobrecarga extrema */}
            <ReferenceLine y={-30} stroke="#ef444455" strokeDasharray="3 3" label={{ value: 'Peligro', fill: '#ef4444', fontSize: 9, position: 'insideBottomLeft' }} />
            {/* Zona óptima / productiva de entrenamiento */}
            <ReferenceLine y={-10} stroke="#f59e0b55" strokeDasharray="3 3" label={{ value: 'Zona Óptima', fill: '#f59e0b', fontSize: 9, position: 'insideBottomLeft' }} />
            {/* Zona de Frescura / Pico de forma */}
            <ReferenceLine y={5} stroke="#10b98155" strokeDasharray="3 3" label={{ value: 'Frescura', fill: '#10b981', fontSize: 9, position: 'insideTopLeft' }} />

            {/* Sombreado de área futura si el simulador está abierto */}
            {showSimulator && (
              <ReferenceArea
                x1={simulatedDays[0]?.label}
                x2={simulatedDays[simulatedDays.length - 1]?.label}
                fill="rgba(252, 76, 2, 0.05)"
                stroke="rgba(252, 76, 2, 0.15)"
                strokeDasharray="4 4"
              />
            )}

            <Bar dataKey="load" fill="rgba(255,255,255,0.06)" name="Carga diaria" radius={[2, 2, 0, 0]} barSize={4} />
            
            {/* Líneas de entrenamiento */}
            <Line type="monotone" dataKey="ctl" stroke="#06b6d4" strokeWidth={2.5} dot={false} name="CTL (Fitness)" activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="atl" stroke="#FC4C02" strokeWidth={1.8} dot={false} name="ATL (Fatiga)" strokeDasharray="4 2" activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="tsb" stroke="#10b981" strokeWidth={2} dot={false} name="TSB (Forma)" activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <p>
          💡 <strong style={{ color: 'var(--text-primary)' }}>Regla de oro de Coggan:</strong>
        </p>
        <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <li><span style={{ color: '#10b981', fontWeight: 600 }}>Pico de Forma (TSB +5 a +25):</span> Estrés disipado y gran frescura muscular. Momento perfecto para carreras.</li>
          <li><span style={{ color: '#f59e0b', fontWeight: 600 }}>Entrenamiento Óptimo (TSB -10 a -30):</span> Carga óptima que induce adaptaciones cardiovasculares estables.</li>
          <li><span style={{ color: '#ef4444', fontWeight: 600 }}>Peligro (TSB &lt; -30):</span> Alta fatiga metabólica. Riesgo muy elevado de lesión y estancamiento.</li>
        </ul>
      </div>
    </div>
  );
};

export default FitnessChart;
