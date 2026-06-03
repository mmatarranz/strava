import React, { useState } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area
} from 'recharts';
import { Zap, Calendar, Heart, ShieldAlert, Award, Clock, Activity, BarChart2 } from 'lucide-react';

const TrainingReadiness = ({ data }) => {
  if (!data) return null;

  const {
    readinessScore,
    sleepData,
    rhrData,
    hrvData,
    strainScore,
    strainHistory,
    withingsConnected,
    appleHealthConnected
  } = data;

  const [activeTab, setActiveTab] = useState('readiness'); // 'readiness', 'hrv_corridor', 'strain_balance'

  // Determinar color de la predisposición
  const getReadinessTheme = (score) => {
    if (score >= 90) return { label: 'Sobresaliente 🏆', color: '#00e5ff', desc: '¡Sistema nervioso súper compensado! Ideal para exprimir ritmos.', tip: 'Listo para cualquier reto hoy. ¡Metas exigentes!' };
    if (score >= 70) return { label: 'Óptimo 🟢', color: '#10b981', desc: 'Tu cuerpo ha asimilado la fatiga. Buen estado aeróbico.', tip: 'Buen día para entrenamiento fraccionado o volumen.' };
    if (score >= 35) return { label: 'Fatiga Acumulada ⚡', color: '#f59e0b', desc: 'Estrés agudo moderado. Tu cuerpo está trabajando para reparar fibras.', tip: 'Sesión aeróbica suave (Z1/Z2) o rodaje regenerativo.' };
    return { label: 'Alarma de Sobrecarga 🚨', color: '#ef4444', desc: 'Sistema simpático saturado o falta de sueño profunda.', tip: 'Descanso total o estiramientos suaves. ¡Previene lesiones!' };
  };

  const theme = getReadinessTheme(readinessScore);

  // Formatear datos para el gráfico de corredor de HRV
  // hrvData.history es de 28 días
  const hrvChartData = hrvData?.history ? hrvData.history.map((val, idx) => {
    const minVal = hrvData.corridorMin[idx] || 45;
    const maxVal = hrvData.corridorMax[idx] || 65;
    return {
      day: idx + 1,
      hrv: val,
      min: minVal,
      max: maxVal,
      corridor: [minVal, maxVal],
      rolling7: hrvData.rolling7 ? hrvData.rolling7[idx] : val
    };
  }) : [];

  // Puntos clave del dial circular (Ready gauge)
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readinessScore / 100) * circumference;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
      
      {/* HEADER CON TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="text-xl" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={20} style={{ color: theme.color }} /> Predisposición Diaria
          </h2>
          <p className="text-muted text-xs">
            {appleHealthConnected 
              ? '⚡ Biometría, HRV y actividad de Apple Health activa' 
              : withingsConnected 
                ? '⚡ Biometría y actividad (pasos) activa de Withings' 
                : '🛌 Datos analizados (Simulados)'}
          </p>
        </div>

        <div className="tab-container" style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '3px', border: '1px solid var(--glass-border)' }}>
          <button 
            onClick={() => setActiveTab('readiness')} 
            className={`tab-btn ${activeTab === 'readiness' ? 'active' : ''}`}
            style={{
              padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px', cursor: 'pointer', border: 'none',
              background: activeTab === 'readiness' ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === 'readiness' ? 'white' : 'var(--text-secondary)', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            Readiness
          </button>
          <button 
            onClick={() => setActiveTab('hrv_corridor')} 
            className={`tab-btn ${activeTab === 'hrv_corridor' ? 'active' : ''}`}
            style={{
              padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px', cursor: 'pointer', border: 'none',
              background: activeTab === 'hrv_corridor' ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === 'hrv_corridor' ? 'white' : 'var(--text-secondary)', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            Pasillo HRV
          </button>
          <button 
            onClick={() => setActiveTab('strain_balance')} 
            className={`tab-btn ${activeTab === 'strain_balance' ? 'active' : ''}`}
            style={{
              padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: '6px', cursor: 'pointer', border: 'none',
              background: activeTab === 'strain_balance' ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === 'strain_balance' ? 'white' : 'var(--text-secondary)', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            Strain Balance
          </button>
        </div>
      </div>

      {/* RENDER TAB: TRAINING READINESS GAUGE */}
      {activeTab === 'readiness' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
            {/* GAUGE DIAL */}
            <div style={{ position: 'relative', width: '130px', height: '130px' }}>
              <svg width="100%" height="100%" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                {/* Dial track */}
                <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
                {/* Dial progress */}
                <circle
                  cx="60" cy="60" r={radius} fill="none"
                  stroke={theme.color}
                  strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 1s ease-out', filter: `drop-shadow(0 0 4px ${theme.color}40)` }}
                />
              </svg>
              {/* Central Text */}
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center'
              }}>
                <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{readinessScore}</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', tracking: '0.5px', marginTop: '2px', fontWeight: 600 }}>Cuerpo</span>
              </div>
            </div>

            {/* DIAGNOSTICO */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <span style={{
                fontSize: '0.72rem', background: `${theme.color}15`, color: theme.color,
                border: `1px solid ${theme.color}25`, padding: '3px 10px', borderRadius: '20px', fontWeight: 700
              }}>
                {theme.label}
              </span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.75rem', lineHeight: 1.45, fontWeight: 500 }}>
                {theme.desc}
              </p>
              <div style={{
                marginTop: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
                borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.75rem', color: 'white', fontWeight: 500
              }}>
                📢 <span style={{ color: 'var(--text-secondary)' }}>Consejo:</span> {theme.tip}
              </div>
            </div>
          </div>

          {/* METRICS FACTOR GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.6rem', marginTop: '0.2rem' }}>
            
            {/* HRV FACTOR */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.6rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs" style={{ fontSize: '0.68rem' }}>HRV rMSSD</span>
                <Heart size={12} style={{ color: '#00e5ff' }} />
              </div>
              <p style={{ fontSize: '1.15rem', fontWeight: 750, color: 'white', marginTop: '1px' }}>
                {hrvData.current} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ms</span>
              </p>
              <span style={{
                fontSize: '0.62rem', fontWeight: 600,
                color: hrvData.current >= hrvData.average ? '#10b981' : '#f59e0b'
              }}>
                {hrvData.current >= hrvData.average ? '👍 Óptimo' : '⚠️ Bajo Basal'}
              </span>
            </div>

            {/* SUEÑO FACTOR */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.6rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs" style={{ fontSize: '0.68rem' }}>Calidad Sueño</span>
                <Clock size={12} style={{ color: '#8b5cf6' }} />
              </div>
              <p style={{ fontSize: '1.15rem', fontWeight: 750, color: 'white', marginTop: '1px' }}>
                {sleepData.currentScore} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/100</span>
              </p>
              <span style={{
                fontSize: '0.62rem', fontWeight: 600,
                color: sleepData.currentScore >= 70 ? '#10b981' : '#ef4444'
              }}>
                {sleepData.currentScore >= 80 ? '⭐ Profundo' : sleepData.currentScore >= 65 ? '🛌 Suficiente' : '💤 Insuficiente'}
              </span>
            </div>

            {/* FCR FACTOR */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.6rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs" style={{ fontSize: '0.68rem' }}>FC Reposo</span>
                <Activity size={12} style={{ color: '#ff4b4b' }} />
              </div>
              <p style={{ fontSize: '1.15rem', fontWeight: 750, color: 'white', marginTop: '1px' }}>
                {rhrData.current} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ppm</span>
              </p>
              <span style={{
                fontSize: '0.62rem', fontWeight: 600,
                color: rhrData.current <= rhrData.average ? '#10b981' : '#f59e0b'
              }}>
                {rhrData.current <= rhrData.average ? '💚 Estable' : `⚠️ +${rhrData.current - rhrData.average} ppm`}
              </span>
            </div>

            {/* ESFUERZO FACTOR */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.6rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs" style={{ fontSize: '0.68rem' }}>Carga (Strain)</span>
                <Zap size={12} style={{ color: 'var(--strava-orange)' }} />
              </div>
              <p style={{ fontSize: '1.15rem', fontWeight: 750, color: 'white', marginTop: '1px' }}>
                {strainScore} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/21</span>
              </p>
              <span style={{
                fontSize: '0.62rem', fontWeight: 600,
                color: strainScore >= 14 ? '#ef4444' : strainScore >= 8 ? '#f59e0b' : '#10b981'
              }}>
                {strainScore >= 14 ? '🔥 Sobreesfuerzo' : strainScore >= 8 ? '⚡ Productivo' : '🛌 Regenerativo'}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* RENDER TAB: HRV PASILLO BIOMÉTRICO (HRV4Training Style) */}
      {activeTab === 'hrv_corridor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Pasillo Biométrico de Variabilidad Cardíaca</h3>
            <p className="text-muted text-xs" style={{ marginTop: '2px' }}>
              Tu HRV diario (fino/cian) y su tendencia de 7 días (verde) cruzando el pasillo de 21 días (sombra).
            </p>
          </div>

          <div style={{ width: '100%', height: '170px', marginTop: '0.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hrvChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="corridorColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.16}/>
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.03}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid var(--glass-border)', borderRadius: '10px' }}
                  labelFormatter={(lbl) => `Día histórico: ${lbl}`}
                />
                
                {/* Biometric corridor limits */}
                <Area type="monotone" dataKey="max" baseValue="min" stroke="none" fill="url(#corridorColor)" name="Pasillo Biométrico" />
                <Line dataKey="max" stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="3 3" dot={false} activeDot={false} name="Límite Superior" />
                <Line dataKey="min" stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="3 3" dot={false} activeDot={false} name="Límite Inferior" />
                
                {/* Active HRV path */}
                <Line type="monotone" dataKey="hrv" stroke="#00e5ff" strokeWidth={1.5} strokeOpacity={0.6} dot={false} activeDot={{ r: 3 }} name="HRV Diario" />
                <Line type="monotone" dataKey="rolling7" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} name="Tendencia 7d" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{
            background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '8px',
            padding: '0.5rem 0.8rem', fontSize: '0.72rem', color: '#e0f7fa', lineHeight: 1.35
          }}>
            ℹ️ <strong>Interpretación:</strong> La línea verde (tendencia de 7 días) filtra el ruido diario. Si se mantiene estable **dentro** del pasillo ensombrecido, estás absorbiendo la carga correctamente. Caídas por debajo del pasillo indican estrés acumulado y necesidad de descanso.
          </div>
        </div>
      )}

      {/* RENDER TAB: WHOOP-STYLE STRAIN VS RECOVERY BALANCE */}
      {activeTab === 'strain_balance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Carga Diaria (Strain) vs. Recuperación</h3>
            <p className="text-muted text-xs" style={{ marginTop: '2px' }}>
              Contraste del esfuerzo relativo (barras naranjas) frente a la asimilación matinal (línea cian neón).
            </p>
          </div>

          <div style={{ width: '100%', height: '170px', marginTop: '0.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={strainHistory} margin={{ top: 10, right: -15, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                {/* Left axis for Strain (0 to 21) */}
                <YAxis yAxisId="left" domain={[0, 21]} stroke="var(--strava-orange)" fontSize={10} tickLine={false} axisLine={false} />
                {/* Right axis for Recovery (0 to 100) */}
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#00e5ff" fontSize={10} tickLine={false} axisLine={false} />
                
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid var(--glass-border)', borderRadius: '10px' }}
                />
                
                {/* Strain bars */}
                <Bar yAxisId="left" dataKey="strain" fill="var(--strava-orange)" radius={[4, 4, 0, 0]} barSize={16} name="Carga (Strain)" />
                
                {/* Recovery line */}
                <Line yAxisId="right" type="monotone" dataKey="recovery" stroke="#00e5ff" strokeWidth={2.5} dot={{ r: 3, fill: '#00e5ff' }} name="Recuperación" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{
            background: 'rgba(252,76,2,0.05)', border: '1px solid rgba(252,76,2,0.15)', borderRadius: '8px',
            padding: '0.5rem 0.8rem', fontSize: '0.72rem', color: '#ffebee', lineHeight: 1.35
          }}>
            🎯 <strong>Equilibrio del Atleta (Strava + Withings):</strong> El Strain diario ahora combina cuadráticamente tus entrenamientos de Strava con tu actividad pasiva (pasos diarios NEAT de Withings). Un Strain que supere ligeramente la barra de Recuperación optimiza la supercompensación, pero vigila la fatiga no deportiva si caminas mucho.
          </div>
        </div>
      )}

    </div>
  );
};

export default TrainingReadiness;
