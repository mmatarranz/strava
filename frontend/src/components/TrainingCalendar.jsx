import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const SPORT_EMOJIS = {
  Run: '🏃', Ride: '🚴', VirtualRide: '🏋️', Walk: '🚶', Hike: '🥾',
  WeightTraining: '💪', Workout: '🧘', Swim: '🏊', Default: '⚡'
};

const TrainingCalendar = ({ activities }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    if (next <= today) setViewDate(next);
  };

  // Agrupar actividades del mes seleccionado por día
  const actsByDay = {};
  (activities || []).forEach(act => {
    const d = new Date(act.start_date);
    if (d.getFullYear() === viewDate.getFullYear() && d.getMonth() === viewDate.getMonth()) {
      const key = d.getDate();
      if (!actsByDay[key]) actsByDay[key] = [];
      actsByDay[key].push(act);
    }
  });

  // Construir días del mes
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  // Lunes=0 ... Domingo=6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);

  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isFuture = (d) => new Date(year, month, d) > today;

  // Stats del mes
  const totalActs = Object.values(actsByDay).flat().length;
  const totalHours = (Object.values(actsByDay).flat().reduce((s, a) => s + a.moving_time, 0) / 3600).toFixed(1);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-xl">Calendario de Entrenos</h2>
          <p className="text-muted text-xs">{totalActs} actividades · {totalHours} horas este mes</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, minWidth: '120px', textAlign: 'center' }}>
            {MONTHS_ES[month]} {year}
          </span>
          <button onClick={nextMonth} disabled={new Date(year, month + 1, 1) > today}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', opacity: new Date(year, month + 1, 1) > today ? 0.3 : 1 }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '2px' }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, padding: '2px' }}>{d}</div>
        ))}
      </div>

      {/* Celdas del calendario */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {cells.map((day, idx) => {
          const acts = day ? (actsByDay[day] || []) : [];
          const hasActs = acts.length > 0;
          const todayCell = day && isToday(day);
          const futureCell = day && isFuture(day);

          return (
            <div key={idx} title={hasActs ? acts.map(a => a.name).join('\n') : ''} style={{
              minHeight: '52px', borderRadius: '8px', padding: '4px',
              background: !day ? 'transparent'
                : todayCell ? 'rgba(252,76,2,0.2)'
                : hasActs ? 'rgba(255,255,255,0.07)'
                : 'rgba(255,255,255,0.02)',
              border: todayCell ? '1px solid rgba(252,76,2,0.5)' : '1px solid rgba(255,255,255,0.04)',
              opacity: futureCell ? 0.3 : 1,
              cursor: hasActs ? 'pointer' : 'default',
              transition: 'background 0.2s ease',
              display: 'flex', flexDirection: 'column', gap: '2px'
            }}>
              {day && (
                <>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: todayCell ? 700 : 400,
                    color: todayCell ? 'var(--strava-orange)' : 'var(--text-secondary)'
                  }}>{day}</span>
                  {/* Emojis de actividades (max 3) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px' }}>
                    {acts.slice(0, 3).map((a, i) => (
                      <span key={i} style={{ fontSize: '0.85rem' }}>
                        {SPORT_EMOJIS[a.type] || SPORT_EMOJIS.Default}
                      </span>
                    ))}
                    {acts.length > 3 && <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>+{acts.length - 3}</span>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
        {[['🏃','Running'],['🚴','Ciclismo'],['🏋️','Ciclo Indoor'],['🏊','Natación'],['💪','Pesas'],['🧘','Estiramientos'],['🚶','Andar']].map(([e, l]) => (
          <span key={l}>{e} {l}</span>
        ))}
      </div>
    </div>
  );
};

export default TrainingCalendar;
