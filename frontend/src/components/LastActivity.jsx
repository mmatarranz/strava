import React from 'react';
import { Calendar, Clock, Heart, Trophy, Dumbbell, Bike, Waves, Flame, Zap } from 'lucide-react';

const LastActivity = ({ activity }) => {
  if (!activity) return null;

  const { name, start_date, moving_time, distance, average_heartrate, max_heartrate, suffer_score } = activity;

  // Formatear fecha legible en español
  const dateFormatted = new Date(start_date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Determinar icono del deporte
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

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', overflow: 'hidden' }}>
      
      {/* BACKGROUND GLOW */}
      <div style={{
        position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px',
        borderRadius: '50%', background: `${effect.color}15`, filter: 'blur(30px)', pointerEvents: 'none'
      }} />

      {/* HEADER CARD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
            borderRadius: '12px', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {getSportIcon(activity.sport_type || activity.type)}
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', background: 'rgba(252,76,2,0.12)', color: 'var(--strava-orange)', padding: '2px 8px', borderRadius: '5px', fontWeight: 600 }}>Último Entrenamiento</span>
            <h2 className="text-xl" style={{ marginTop: '0.2rem', fontWeight: 700, lineHeight: 1.2 }}>{name}</h2>
            <p className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.15rem' }}>
              <Calendar size={12} /> {dateFormatted}
            </p>
          </div>
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

    </div>
  );
};

export default LastActivity;
