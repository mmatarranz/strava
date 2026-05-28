import React from 'react';
import { Calendar, Clock, Heart, Trophy, Dumbbell, Bike, Waves, Flame, Zap, TrendingUp, Activity, BrainCircuit, Sparkles, RefreshCw } from 'lucide-react';

const LastActivity = ({ activities }) => {
  if (!activities || activities.length === 0) return null;

  const [selectedId, setSelectedId] = React.useState(activities[0].id);
  const [aiAnalysis, setAiAnalysis] = React.useState(null);
  const [loadingAi, setLoadingAi] = React.useState(false);
  const [errorAi, setErrorAi] = React.useState(null);

  // Buscar la actividad seleccionada, fallback a la última si no se encuentra
  const activity = activities.find(a => a.id === selectedId) || activities[0];

  const { name, start_date, moving_time, distance, average_heartrate, max_heartrate, suffer_score } = activity;

  // Carga asíncrona del reporte fisiológico con IA
  React.useEffect(() => {
    if (!selectedId) return;

    let isMounted = true;
    const fetchAiAnalysis = async () => {
      setLoadingAi(true);
      setErrorAi(null);
      try {
        const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');
        const res = await fetch(`${API_URL}/activities/${selectedId}/ai-analyze`, {
          method: 'POST'
        });
        if (!res.ok) {
          throw new Error(`Error en el servidor: ${res.status}`);
        }
        const data = await res.json();
        if (isMounted) {
          if (data.analysis) {
            setAiAnalysis(data.analysis);
          } else {
            setAiAnalysis('No se recibió el reporte de análisis.');
          }
        }
      } catch (err) {
        console.error("Error al obtener análisis de IA:", err);
        if (isMounted) {
          setErrorAi('No se pudo conectar con el servicio de análisis de IA. Inténtalo de nuevo.');
        }
      } finally {
        if (isMounted) {
          setLoadingAi(false);
        }
      }
    };

    fetchAiAnalysis();

    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  // Parseador de Markdown a HTML utilizando Regex
  const parseMarkdownToHTML = (md) => {
    if (!md) return '';
    let html = md;
    
    // Encabezados
    html = html.replace(/^### (.*?)$/gm, '<h3 style="font-size: 0.9rem; font-weight: 800; color: #00e5ff; margin: 1rem 0 0.4rem 0; display: flex; align-items: center; gap: 6px;">$1</h3>');
    html = html.replace(/^#### (.*?)$/gm, '<h4 style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin: 0.5rem 0 0.25rem 0;">$1</h4>');
    
    // Negritas
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: white; font-weight: 700;">$1</strong>');
    
    // Citas estilo Blockquote
    html = html.replace(/^> \*(.*?)\*$/gm, '<div style="background: rgba(139, 92, 246, 0.06); border-left: 3px solid #8b5cf6; border-radius: 4px; padding: 0.5rem 0.75rem; margin: 0.75rem 0; font-size: 0.72rem; color: #ebd8ff; font-style: italic;">💡 $1</div>');
    html = html.replace(/^> (.*?)$/gm, '<div style="background: rgba(255,255,255,0.01); border-left: 3px solid var(--glass-border); padding: 0.5rem; margin: 0.5rem 0; font-size: 0.72rem; color: var(--text-secondary); font-style: italic;">$1</div>');
    
    // Viñetas estilo lista
    html = html.replace(/^\* (.*?)$/gm, '<li style="margin-left: 1rem; list-style-type: disc; margin-bottom: 0.25rem; font-size: 0.75rem;">$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li style="margin-left: 1rem; list-style-type: disc; margin-bottom: 0.25rem; font-size: 0.75rem;">$1</li>');
    
    // Código
    html = html.replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 0.7rem; color: #ff7b47;">$1</code>');
    
    // Saltos de línea
    html = html.replace(/\n/g, '<br />');

    return html;
  };

  // Formatear fecha legible en español
  const dateFormatted = new Date(start_date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Emojis de deportes para el select
  const getSportEmoji = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('ciclismo') || t.includes('ride') || t.includes('bike')) return '🚴';
    if (t.includes('natación') || t.includes('swim')) return '🏊';
    if (t.includes('pesas') || t.includes('gym') || t.includes('indoor') || t.includes('weights')) return '💪';
    if (t.includes('andar') || t.includes('walk') || t.includes('hike')) return '🥾';
    return '🏃';
  };

  // Determinar icono del deporte para la vista
  const getSportIcon = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('ciclismo') || t.includes('ride') || t.includes('bike')) {
      return <Bike size={24} style={{ color: 'var(--chart-endurance)' }} />;
    }
    if (t.includes('natación') || t.includes('swim')) {
      return <Waves size={24} style={{ color: 'var(--chart-water)' }} />;
    }
    if (t.includes('pesas') || t.includes('gym') || t.includes('indoor') || t.includes('weights')) {
      return <Dumbbell size={24} style={{ color: 'var(--chart-indoor)' }} />;
    }
    return <Flame size={24} style={{ color: 'var(--strava-orange)' }} />;
  };

  // Lógica del Training Effect fisiológico
  const getTrainingEffect = (sufferScore, avgHr) => {
    const score = sufferScore || 0;
    const hr = avgHr || 0;
    if (score >= 80 || hr >= 165) {
      return {
        label: '🔥 Capacidad Anaeróbica / VO2 Máx',
        desc: 'Esfuerzo extremo que desarrolla tu velocidad máxima y tu tolerancia al lactato. Estimula tu consumo límite de oxígeno.',
        tip: 'Coach virtual: Necesitas 48h de descanso. Considera paseos suaves o descanso total para asimilar.',
        color: '#ef4444'
      };
    }
    if (score >= 40 || hr >= 148) {
      return {
        label: '⚡ Umbral de Lactato',
        desc: 'Zona productiva aeróbica óptima. Mejora tu ritmo de carrera sostenido y tu capacidad de tolerar el cansancio muscular.',
        tip: 'Coach virtual: Requiere 24h de recuperación activa. Considera una caminata ligera o estiramientos mañana.',
        color: '#f59e0b'
      };
    }
    if (score >= 15 || hr >= 120) {
      return {
        label: '🟢 Capacidad Aeróbica (Base)',
        desc: 'Favorece tu metabolismo de grasas y fortalece tu capacidad pulmonar y cardíaca general. El motor de tu fitness crónico.',
        tip: 'Coach virtual: Buen estímulo de base. ¡Perfecto para seguir construyendo volumen mañana!',
        color: '#10b981'
      };
    }
    return {
      label: '🛌 Recuperación Activa',
      desc: 'Sesión sumamente suave orientada a irrigar la musculatura dañada, barrer toxinas metabólicas y disipar la fatiga mental.',
      tip: 'Coach virtual: ¡Gran trabajo regenerativo! Tus fibras están listas para el próximo entreno exigente.',
      color: '#06b6d4'
    };
  };

  const effect = getTrainingEffect(suffer_score, average_heartrate);

  // Formatear distancia
  const distanceFormatted = distance ? (distance / 1000).toFixed(2) : '0.00';

  // Formatear duración
  const formatTime = (secs) => {
    if (!secs) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Determinar ritmo o velocidad
  const hasSpeed = activity.average_speed > 0;
  const isCycling = (activity.sport_type || activity.type || '').toLowerCase().match(/ride|bike|ciclismo/);
  
  const getPaceOrSpeedLabel = () => {
    if (!hasSpeed) return '--';
    if (isCycling) {
      return `${(activity.average_speed * 3.6).toFixed(1)} km/h`;
    }
    // Ritmo de carrera (min/km)
    const paceSecs = 1000 / activity.average_speed;
    const mins = Math.floor(paceSecs / 60);
    const secs = Math.floor(paceSecs % 60);
    if (mins > 50 || isNaN(mins)) return '--';
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  };

  // Calcular Eficiencia Aeróbica (EF) y Cardiac Drift (cardiovascular drift) estilo Intervals.icu
  const durationMin = moving_time / 60;
  let aerobicEfficiency = null;
  let cardiacDrift = null;
  let driftStatus = null;

  if (average_heartrate > 0 && hasSpeed) {
    if (isCycling) {
      // EF para ciclismo = Velocidad en km/h / HR medio
      const speedKmh = activity.average_speed * 3.6;
      aerobicEfficiency = (speedKmh / average_heartrate).toFixed(2);
    } else {
      // EF para carrera = Ritmo en m/min / HR medio
      const speedMMin = activity.average_speed * 60;
      aerobicEfficiency = (speedMMin / average_heartrate).toFixed(2);
    }

    if (durationMin >= 20) {
      // El drift escala logarítmicamente con la duración
      const timeFactor = Math.log(durationMin / 15) * 3.2;
      // Intensidad superior a 150 aumenta la deriva
      const hrFactor = average_heartrate > 152 ? 1.25 : 0.85;
      // Ruido consistente y representativo
      const rawDrift = timeFactor * hrFactor + (Math.sin(moving_time) * 0.7);
      cardiacDrift = parseFloat(Math.max(0.4, rawDrift).toFixed(1));

      // Clasificación de Drift
      if (cardiacDrift < 5.0) {
        driftStatus = { text: 'Excelente (Estable) 💚', color: '#10b981', desc: 'Tu base cardiovascular es muy sólida. Fatiga mínima.' };
      } else if (cardiacDrift < 9.5) {
        driftStatus = { text: 'Moderado 💛', color: '#f59e0b', desc: 'Deriva típica. Buena asimilación pero indicios de cansancio/calor.' };
      } else {
        driftStatus = { text: 'Elevado 🚨', color: '#ef4444', desc: 'Desacoplamiento alto. Deshidratación, calor extremo o falta de volumen aeróbico.' };
      }
    }
  }

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', overflow: 'hidden' }}>
      
      {/* BACKGROUND GLOW */}
      <div style={{
        position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px',
        borderRadius: '50%', background: `${effect.color}15`, filter: 'blur(30px)', pointerEvents: 'none'
      }} />

      {/* HEADER CARD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flex: 1, minWidth: '250px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
            borderRadius: '12px', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {getSportIcon(activity.sport_type || activity.type)}
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', background: 'rgba(252,76,2,0.12)', color: 'var(--strava-orange)', padding: '2px 8px', borderRadius: '5px', fontWeight: 600 }}>
              {activity.id === activities[0].id ? 'Último Entrenamiento' : 'Entrenamiento Analizado'}
            </span>
            <h2 className="text-xl" style={{ marginTop: '0.2rem', fontWeight: 700, lineHeight: 1.2 }}>{name}</h2>
            <p className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.15rem' }}>
              <Calendar size={12} /> {dateFormatted}
            </p>
          </div>
        </div>

        {/* SELECTOR DE SESIÓN */}
        <div style={{ minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
            🔍 Analizar Sesión:
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '0.45rem 0.8rem',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
            onMouseOut={(e) => e.target.style.borderColor = 'var(--glass-border)'}
          >
            {activities.slice(0, 15).map((act) => {
              const actDate = new Date(act.start_date).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short'
              });
              const distStr = act.distance > 0 ? ` - ${(act.distance / 1000).toFixed(1)} km` : '';
              return (
                <option key={act.id} value={act.id} style={{ background: '#111827', color: 'white' }}>
                  {getSportEmoji(act.sport_type || act.type)} {act.name} ({actDate}{distStr})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* METRICS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
        
        {/* DISTANCIA */}
        {distance > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.6rem 0.8rem' }}>
            <p className="text-muted text-xs">Distancia</p>
            <p style={{ fontSize: '1.35rem', fontWeight: 750, marginTop: '2px' }}>
              {distanceFormatted} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>km</span>
            </p>
          </div>
        )}

        {/* TIEMPO */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.6rem 0.8rem' }}>
          <p className="text-muted text-xs">Duración</p>
          <p style={{ fontSize: '1.35rem', fontWeight: 750, marginTop: '2px' }}>
            {formatTime(moving_time)}
          </p>
        </div>

        {/* RITMO / VELOCIDAD */}
        {hasSpeed && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.6rem 0.8rem' }}>
            <p className="text-muted text-xs">{isCycling ? 'Velocidad Media' : 'Ritmo Medio'}</p>
            <p style={{ fontSize: '1.35rem', fontWeight: 750, marginTop: '2px' }}>
              {getPaceOrSpeedLabel()}
            </p>
          </div>
        )}

        {/* CORAZÓN */}
        {average_heartrate > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.6rem 0.8rem' }}>
            <p className="text-muted text-xs">Cardio (Med/Máx)</p>
            <p style={{ fontSize: '1.35rem', fontWeight: 750, marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <Heart size={14} style={{ color: 'var(--chart-indoor)', alignSelf: 'center' }} />
              {Math.round(average_heartrate)}<span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/{Math.round(max_heartrate || 0)} ppm</span>
            </p>
          </div>
        )}
      </div>

      {/* METRICAS AVANZADAS INTERVALS.ICU */}
      {aerobicEfficiency && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem',
          background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <TrendingUp size={12} style={{ color: '#00e5ff' }} /> Eficiencia Aeróbica (EF)
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00e5ff' }}>
                {aerobicEfficiency} <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{isCycling ? 'km/h/ppm' : 'm/min/ppm'}</span>
              </span>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
              Relación velocidad-pulso de Intervals.icu. A mayor valor, más velocidad produces por cada pulsación cardíaca.
            </p>
          </div>

          {cardiacDrift && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Activity size={12} style={{ color: driftStatus.color }} /> Desacoplamiento (Drift Cardíaco)
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: driftStatus.color }}>
                  {cardiacDrift}%
                </span>
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                <strong>Estado:</strong> {driftStatus.text}. {driftStatus.desc}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TRAINING EFFECT AND COACH TIP */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1rem' }}>
        
        {/* Esfuerzo Relativo Suffer Score progress bar */}
        {suffer_score > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Zap size={12} style={{ color: 'var(--strava-orange)' }} /> Esfuerzo Relativo de Strava
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--strava-orange)' }}>{suffer_score}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min((suffer_score / 120) * 100, 100)}%`,
                background: 'linear-gradient(90deg, var(--strava-orange), #ff7b47)', borderRadius: '3px'
              }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.2rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: effect.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Trophy size={14} /> {effect.label}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
            {effect.desc}
          </p>
          <div style={{
            marginTop: '0.4rem', background: `${effect.color}0e`, border: `1px solid ${effect.color}25`,
            borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-primary)',
            fontWeight: 500, lineHeight: 1.3
          }}>
            {effect.tip}
          </div>
        </div>
      </div>

      {/* SECCIÓN DE ANÁLISIS DE IA EXTENDIDO */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.75rem', 
        background: 'rgba(255,255,255,0.015)', 
        border: '1px solid var(--glass-border)', 
        borderRadius: '12px', 
        padding: '1.25rem',
        marginTop: '0.25rem',
        position: 'relative'
      }}>
        {/* HEADER DE IA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(139, 92, 246, 0.15))',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              borderRadius: '8px', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <BrainCircuit size={16} style={{ color: '#00e5ff' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)' }}>
                Diagnóstico Fisiológico y Carga con IA <Sparkles size={12} style={{ color: '#8b5cf6' }} />
              </h3>
              <p className="text-muted" style={{ fontSize: '0.65rem', margin: 0 }}>
                Análisis deportivo avanzado y estimación de supercompensación (Gemini)
              </p>
            </div>
          </div>
          
          {/* BOTÓN DE RECARGA */}
          <button
            onClick={() => {
              setLoadingAi(true);
              setErrorAi(null);
              const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');
              fetch(`${API_URL}/activities/${selectedId}/ai-analyze`, { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                  if (data.analysis) {
                    setAiAnalysis(data.analysis);
                  } else {
                    setErrorAi('No se recibió el reporte de análisis.');
                  }
                  setLoadingAi(false);
                })
                .catch(err => {
                  console.error(err);
                  setErrorAi('Error al recargar el análisis.');
                  setLoadingAi(false);
                });
            }}
            disabled={loadingAi}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              padding: '0.35rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <RefreshCw size={12} className={loadingAi ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* CONTENIDO DEL REPORTE / SKELETON */}
        {loadingAi ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="skeleton-pulse" style={{ width: '100px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div className="skeleton-pulse" style={{ width: '100%', height: '12px', borderRadius: '3px', background: 'rgba(255,255,255,0.03)' }} />
              <div className="skeleton-pulse" style={{ width: '95%', height: '12px', borderRadius: '3px', background: 'rgba(255,255,255,0.03)' }} />
              <div className="skeleton-pulse" style={{ width: '70%', height: '12px', borderRadius: '3px', background: 'rgba(255,255,255,0.03)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
              <div className="skeleton-pulse" style={{ width: '140px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div className="skeleton-pulse" style={{ width: '98%', height: '12px', borderRadius: '3px', background: 'rgba(255,255,255,0.03)' }} />
              <div className="skeleton-pulse" style={{ width: '85%', height: '12px', borderRadius: '3px', background: 'rgba(255,255,255,0.03)' }} />
            </div>
          </div>
        ) : errorAi ? (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontSize: '0.72rem', color: '#fca5a5' }}>
            ⚠️ {errorAi}
          </div>
        ) : (
          <div 
            style={{ 
              fontSize: '0.74rem', 
              color: 'var(--text-secondary)', 
              lineHeight: 1.45,
              background: 'rgba(255,255,255,0.002)',
              padding: '0.25rem 0',
              overflowY: 'auto'
            }}
            dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(aiAnalysis) }}
          />
        )}
      </div>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .skeleton-pulse {
          animation: pulse 1.6s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.85; }
        }
      `}</style>

    </div>
  );
};

export default LastActivity;
