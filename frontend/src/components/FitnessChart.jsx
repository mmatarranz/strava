import React from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { Zap } from 'lucide-react';

const FitnessChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const latest = data[data.length - 1];
  const tsbStatus = latest.tsb > 5
    ? { label: 'En Forma ✅', color: '#10b981' }
    : latest.tsb < -10
    ? { label: '⚠️ Sobrecarga', color: '#ef4444' }
    : { label: '⚙️ Acumulando', color: '#f59e0b' };

  // Mostrar solo 1 de cada 3 etiquetas en el eje X para no saturar
  const tickFormatter = (val, i) => i % 10 === 0 ? val : '';

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 className="text-xl">Forma Atlética (PMC)</h2>
          <p className="text-muted text-xs">Fitness crónico (CTL) · Fatiga aguda (ATL) · Forma (TSB)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: `CTL ${latest.ctl}`, color: '#06b6d4', desc: 'Fitness' },
            { label: `ATL ${latest.atl}`, color: '#FC4C02', desc: 'Fatiga' },
            { label: `TSB ${latest.tsb > 0 ? '+' : ''}${latest.tsb}`, color: tsbStatus.color, desc: tsbStatus.label },
          ].map(({ label, color, desc }) => (
            <div key={label} style={{
              textAlign: 'center', background: 'rgba(255,255,255,0.04)',
              borderRadius: '8px', padding: '0.4rem 0.8rem', border: `1px solid ${color}44`
            }}>
              <p style={{ fontSize: '1rem', fontWeight: 700, color }}>{label}</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: '260px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(val, name) => [val, name]}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            {/* Zona de sobrecarga */}
            <ReferenceLine y={-10} stroke="#ef444444" strokeDasharray="4 4" label={{ value: 'Sobrecarga', fill: '#ef4444', fontSize: 10, position: 'insideBottomLeft' }} />
            <Bar dataKey="load" fill="rgba(255,255,255,0.08)" name="Carga diaria" radius={[2,2,0,0]} barSize={5} />
            <Line type="monotone" dataKey="ctl" stroke="#06b6d4" strokeWidth={2.5} dot={false} name="CTL (Fitness)" />
            <Line type="monotone" dataKey="atl" stroke="#FC4C02" strokeWidth={2} dot={false} name="ATL (Fatiga)" strokeDasharray="5 3" />
            <Line type="monotone" dataKey="tsb" stroke="#10b981" strokeWidth={2} dot={false} name="TSB (Forma)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
        💡 <strong style={{ color: 'var(--text-primary)' }}>Regla de oro:</strong> TSB entre -10 y +5 = zona óptima de rendimiento. Por encima de +10 = demasiado descanso. Por debajo de -25 = riesgo de lesión.
      </div>
    </div>
  );
};

export default FitnessChart;
