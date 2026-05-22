import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const MainChart = ({ activities }) => {
  // Aggregate data by date
  // Since we use mock data, we will map them into a timeline structure
  const dataMap = {};
  
  activities.forEach(act => {
    const dateStr = new Date(act.start_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    if (!dataMap[dateStr]) {
      dataMap[dateStr] = { date: dateStr, Endurance: 0, Indoor: 0, Agua: 0 };
    }
    
    const minutes = act.moving_time / 60;
    if (act.category === 'Endurance') dataMap[dateStr].Endurance += minutes;
    if (act.category === 'Indoor/Gym') dataMap[dateStr].Indoor += minutes;
    if (act.category === 'Agua') dataMap[dateStr].Agua += minutes;
  });

  const data = Object.values(dataMap).reverse(); // simple sort for mock

  return (
    <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
      <h2 className="text-xl" style={{ marginBottom: '1.5rem' }}>Dedicación de Tiempo por Categoría (min)</h2>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEndurance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-endurance)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--chart-endurance)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorIndoor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-indoor)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--chart-indoor)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorAgua" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-water)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--chart-water)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
            <YAxis stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'var(--glass-border)', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Area type="monotone" dataKey="Endurance" stackId="1" stroke="var(--chart-endurance)" fill="url(#colorEndurance)" />
            <Area type="monotone" dataKey="Indoor" stackId="1" stroke="var(--chart-indoor)" fill="url(#colorIndoor)" />
            <Area type="monotone" dataKey="Agua" stackId="1" stroke="var(--chart-water)" fill="url(#colorAgua)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MainChart;
