import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { History } from 'lucide-react';

const HistoricalStats = ({ data, onSyncFull }) => {
  if (!data || data.length === 0) return null;

  const [syncing, setSyncing] = React.useState(false);

  // Filtrar el año actual si se desea (o dejarlo para comparar)
  // El usuario pidió "años anteriores", pero suele ser útil ver la comparativa.
  const currentYear = new Date().getFullYear();
  const pastYears = data.filter(d => d.year < currentYear);

  if (pastYears.length === 0) return null;

  const handleSyncClick = async () => {
    if (!onSyncFull) return;
    setSyncing(true);
    try {
      await onSyncFull();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <History size={20} color="var(--strava-orange)" />
          <h2 className="text-xl">Histórico de Años Anteriores</h2>
        </div>
        {onSyncFull && (
          <button
            onClick={handleSyncClick}
            disabled={syncing}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.72rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              margin: 0
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = 'white'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            {syncing ? '🔄 Sincronizando...' : '🔄 Sincronización Profunda'}
          </button>
        )}
      </div>

      <div style={{ height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pastYears} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(val) => [`${val.toLocaleString()} km`, 'Distancia']}
            />
            <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '0.8rem' }} />
            <Bar dataKey="cycling" name="🚴 Ciclismo" fill="#FC4C02" radius={[3, 3, 0, 0]} barSize={40} />
            <Bar dataKey="running" name="🏃 Running" fill="var(--health-green)" radius={[3, 3, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla resumen compacta */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-secondary)' }}>Año</th>
              <th style={{ textAlign: 'right', padding: '0.5rem', color: '#FC4C02' }}>🚴 Ciclismo</th>
              <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--health-green)' }}>🏃 Running</th>
              <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 700 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {pastYears.map(h => (
              <tr key={h.year} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.5rem', fontWeight: 600 }}>{h.year}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>{h.cycling.toLocaleString()} km</td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>{h.running.toLocaleString()} km</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{h.total.toLocaleString()} km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoricalStats;
