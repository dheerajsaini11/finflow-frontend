import { useState, useEffect } from 'react';
import { getYearlyAnalytics } from '../services/api';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [year, month]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await getYearlyAnalytics({ year, month });
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (val) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const chartData = data?.months?.map((m, i) => ({
    name: MONTHS[i],
    Income: m.income,
    Expense: m.expense,
    Investment: m.investment,
  })) || [];

  const pieData = data?.categoryBreakdown?.map(c => ({
    name: c.name,
    value: Number(c.total),
    color: c.color || '#6c5ce7',
  })) || [];

  const heatmapData = {};
  data?.heatmap?.forEach(h => {
    heatmapData[h.day] = Number(h.total);
  });

  const maxHeat = Math.max(...Object.values(heatmapData), 1);

  const getHeatColor = (val) => {
    if (!val) return '#1a1f35';
    const intensity = val / maxHeat;
    if (intensity > 0.75) return '#ff4757';
    if (intensity > 0.5) return '#ff6b81';
    if (intensity > 0.25) return '#ff9f9f';
    return '#ffcdd2';
  };

  // Generate all days of year for heatmap
  const generateYearDays = () => {
    const days = [];
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push(dateStr);
      }
    }
    return days;
  };

  if (loading) {
    return (
      <div style={styles.loading}>Loading analytics...</div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Analytics</div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={styles.yearSelect}
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Line Chart */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Cash Flow Index</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" />
            <XAxis dataKey="name" stroke="#8892b0" fontSize={11} />
            <YAxis stroke="#8892b0" fontSize={11}
              tickFormatter={v => v >= 1000 ? `₹${v/1000}k` : `₹${v}`}
            />
            <Tooltip
              contentStyle={{ background: '#1a1f35', border: '1px solid #2a2f45', borderRadius: '8px' }}
              formatter={(val) => formatAmount(val)}
            />
            <Legend />
            <Line type="monotone" dataKey="Income" stroke="#00f5a0" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Expense" stroke="#ff4757" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Investment" stroke="#6c5ce7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Month Selector for Pie */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>Category Breakdown</div>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={styles.monthSelect}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        {pieData.length === 0 ? (
          <div style={styles.empty}>No expense data for this month</div>
        ) : (
          <div style={styles.pieContainer}>
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => formatAmount(val)}
                  contentStyle={{ background: '#1a1f35', border: '1px solid #2a2f45', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={styles.legend}>
              {pieData.map((item, i) => {
                const total = pieData.reduce((s, p) => s + p.value, 0);
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                return (
                  <div key={i} style={styles.legendItem}>
                    <div style={{ ...styles.legendDot, background: item.color }} />
                    <span style={styles.legendName}>{item.name}</span>
                    <span style={styles.legendPct}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Spending Heatmap */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Spending Heatmap</div>
        <div style={styles.heatmapScroll}>
          <div style={styles.heatmap}>
            {generateYearDays().map((day, i) => (
              <div
                key={i}
                title={`${day}: ${heatmapData[day] ? formatAmount(heatmapData[day]) : 'No spend'}`}
                style={{
                  ...styles.heatCell,
                  background: getHeatColor(heatmapData[day]),
                }}
              />
            ))}
          </div>
          <div style={styles.heatMonths}>
            {MONTHS.map(m => (
              <span key={m} style={styles.heatMonth}>{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Compare Bar Chart */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Monthly Comparison</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" />
            <XAxis dataKey="name" stroke="#8892b0" fontSize={11} />
            <YAxis stroke="#8892b0" fontSize={11}
              tickFormatter={v => v >= 1000 ? `₹${v/1000}k` : `₹${v}`}
            />
            <Tooltip
              contentStyle={{ background: '#1a1f35', border: '1px solid #2a2f45', borderRadius: '8px' }}
              formatter={(val) => formatAmount(val)}
            />
            <Legend />
            <Bar dataKey="Income" fill="#00f5a0" radius={[4,4,0,0]} />
            <Bar dataKey="Expense" fill="#ff4757" radius={[4,4,0,0]} />
            <Bar dataKey="Investment" fill="#6c5ce7" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: '20px' }} />
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', color: '#00f5a0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingTop: '10px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  yearSelect: { background: '#1a1f35', border: '1px solid #2a2f45', color: '#fff', padding: '8px 12px', borderRadius: '10px', fontSize: '14px', outline: 'none' },
  card: { background: '#1a1f35', borderRadius: '16px', padding: '20px', marginBottom: '16px', border: '1px solid #2a2f45' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '16px' },
  monthSelect: { background: '#0a0e1a', border: '1px solid #2a2f45', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '13px', outline: 'none' },
  empty: { color: '#8892b0', textAlign: 'center', padding: '20px' },
  pieContainer: { display: 'flex', alignItems: 'center' },
  legend: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  legendName: { fontSize: '12px', color: '#fff', flex: 1 },
  legendPct: { fontSize: '12px', color: '#8892b0', fontWeight: '600' },
  heatmapScroll: { overflowX: 'auto' },
  heatmap: { display: 'grid', gridTemplateColumns: 'repeat(30, 12px)', gridAutoRows: '12px', gap: '2px', marginBottom: '8px', minWidth: '400px' },
  heatCell: { width: '12px', height: '12px', borderRadius: '2px' },
  heatMonths: { display: 'flex', justifyContent: 'space-between', minWidth: '400px' },
  heatMonth: { fontSize: '10px', color: '#8892b0' },
};