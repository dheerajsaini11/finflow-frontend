import { useState, useEffect } from 'react';
import { getYearlyAnalytics, getTransactions } from '../services/api';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const WEEKDAYS_MON = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const WEEKDAYS_SUN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const getHeatColor = (val, max) => {
  if (!val || val === 0) return '#1e2440';
  const ratio = val / max;
  if (ratio > 0.8)  return '#ff2d3b';
  if (ratio > 0.6)  return '#ff4757';
  if (ratio > 0.4)  return '#ff6b7a';
  if (ratio > 0.15) return '#ff9fa8';
  return '#ffd0d4';
};

export default function Analytics() {
  const [data, setData]         = useState(null);
  const [monthTxs, setMonthTxs] = useState([]);
  const [year, setYear]         = useState(new Date().getFullYear());
  const [month, setMonth]       = useState(new Date().getMonth() + 1);
  const [loading, setLoading]   = useState(true);
  const [tooltip, setTooltip]   = useState(null);

  const weekStart      = localStorage.getItem('finflow_week_start') || 'monday';
  const startsOnMonday = weekStart === 'monday';
  const WEEKDAYS       = startsOnMonday ? WEEKDAYS_MON : WEEKDAYS_SUN;

  useEffect(() => { fetchAnalytics(); }, [year, month]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const lastDay = new Date(year, month, 0).getDate();
      const [analyticsRes, txsRes] = await Promise.all([
        getYearlyAnalytics({ year, month }),
        getTransactions({
          start_date: `${year}-${String(month).padStart(2,'0')}-01`,
          end_date:   `${year}-${String(month).padStart(2,'0')}-${lastDay}`,
          limit: 1000,
        })
      ]);
      setData(analyticsRes.data);
      setMonthTxs(txsRes.data.transactions || []);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (val) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const chartData = data?.months?.map((m, i) => ({
    name: MONTHS[i],
    Income: m.income,
    Expense: m.expense,
    Investment: m.investment,
  })) || [];

  const pieData = (data?.categoryBreakdown || [])
    .filter(c => c.name)
    .map(c => ({
      name: c.name,
      value: Number(c.total),
      color: c.color || '#6c5ce7',
      icon: c.icon || '📦',
    }));

  const heatmapData = {};
  monthTxs.forEach(tx => {
    if (tx.type === 'expense') {
      const d = tx.date.split('T')[0].substring(0, 10);
      heatmapData[d] = (heatmapData[d] || 0) + Number(tx.amount);
    }
  });
  const maxHeat = Math.max(...Object.values(heatmapData), 1);

  const buildCalendar = () => {
    const daysInMonth  = new Date(year, month, 0).getDate();
    const firstWeekDay = new Date(year, month - 1, 1).getDay();
    const blanks = startsOnMonday ? (firstWeekDay + 6) % 7 : firstWeekDay;
    return [
      ...Array(blanks).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) =>
        `${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
      ),
    ];
  };

  const sortedCats   = [...(data?.categoryBreakdown || [])].filter(c => c.name).sort((a, b) => Number(b.total) - Number(a.total));
  const heavyweight  = sortedCats[0] || null;
  const totalExpenses = sortedCats.reduce((s, c) => s + Number(c.total), 0);
  const hwPct = heavyweight && totalExpenses > 0
    ? ((Number(heavyweight.total) / totalExpenses) * 100).toFixed(0) : 0;

  const expenses  = monthTxs.filter(t => t.type === 'expense');
  const peakSpend = expenses.length > 0
    ? expenses.reduce((m, t) => Number(t.amount) > Number(m.amount) ? t : m, expenses[0])
    : null;

  const calendarCells = buildCalendar();
  const pieTotalVal   = pieData.reduce((s, p) => s + p.value, 0);

  // 1 col when ≤4 categories, 2 cols otherwise
  const legendCols = pieData.length <= 4 ? 1 : 2;

  // Heatmap section — shared between empty and filled state
  const HeatmapBlock = () => (
    <div style={s.heatmapSection}>
      <div style={s.heatmapTitleRow}>
        <span style={s.heatmapTitle}>Spending Intensity — {MONTHS_FULL[month-1]} {year}</span>
        <div style={s.heatLegend}>
          <span style={s.heatLegendLbl}>Less</span>
          {['#1e2440','#ffd0d4','#ff9fa8','#ff6b7a','#ff4757','#ff2d3b'].map((c,i) => (
            <div key={i} style={{ ...s.heatLegendCell, background: c }} />
          ))}
          <span style={s.heatLegendLbl}>More</span>
        </div>
      </div>
      <div style={s.heatGrid}>
        <div style={s.heatDayLabels}>
          {WEEKDAYS.map((d, i) => <div key={i} style={s.heatDayLabel}>{d}</div>)}
        </div>
        <div style={s.heatCells}>
          {calendarCells.map((dayStr, i) => {
            if (!dayStr) return <div key={i} style={s.heatCellEmpty} />;
            const spend   = heatmapData[dayStr];
            const dayNum  = parseInt(dayStr.split('-')[2]);
            const isToday = dayStr === new Date().toISOString().split('T')[0];
            return (
              <div
                key={i}
                style={{
                  ...s.heatCell,
                  background: getHeatColor(spend, maxHeat),
                  border: isToday ? '2px solid #00f5a0' : '1px solid #ffffff08',
                }}
                onMouseEnter={e => {
                  const date  = new Date(dayStr);
                  const label = date.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
                  setTooltip({
                    x: e.clientX, y: e.clientY,
                    text: spend ? `${label}\n${fmt(spend)}` : `${label}\nNo spending`,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <span style={{ ...s.heatCellNum, color: spend ? '#111' : 'rgba(255,255,255,0.55)' }}>
                  {dayNum}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {tooltip && (
        <div style={{
          ...s.heatTooltip,
          top: tooltip.y - 60,
          left: Math.min(tooltip.x - 60, typeof window !== 'undefined' ? window.innerWidth - 160 : 200),
        }}>
          {tooltip.text.split('\n').map((line, i) => (
            <div key={i} style={i === 1 ? s.heatTooltipAmt : s.heatTooltipDate}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) return (
    <div style={s.loadingScreen}>
      <div style={s.loadingDot} />
      <span style={s.loadingText}>Loading analytics...</span>
    </div>
  );

  return (
    <div style={s.page}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={s.pageHeader}>
        <div>
          <div style={s.pageTitle}>Analytics</div>
          <div style={s.pageSub}>{year} overview</div>
        </div>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={s.select}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ── Cash Flow Line Chart ─────────────────────────────────────────── */}
      <div style={s.card}>
        <div style={s.cardTitleRow}>
          <div style={s.cardTitle}>Cash Flow Index</div>
          <div style={s.cardBadge}>12 months</div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f4566" />
            <XAxis dataKey="name" stroke="#8892b0" fontSize={11} tickLine={false} />
            <YAxis stroke="#8892b0" fontSize={11} tickLine={false}
              tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
            <Tooltip
              contentStyle={{ background: '#1a1f35', border: '1px solid #2a2f45', borderRadius: '10px', fontSize: '13px' }}
              formatter={fmt}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="Income"     stroke="#00f5a0" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Expense"    stroke="#ff4757" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Investment" stroke="#6c5ce7" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Insight Cards ─────────────────────────────────────────────────── */}
      <div style={s.insightRow}>
        <div style={s.insightCard}>
          <div style={{ ...s.insightBadge, background: '#ffa50215', color: '#ffa502' }}>💼 PEAK SPEND</div>
          <div style={s.insightMain}>{peakSpend ? fmt(peakSpend.amount) : '—'}</div>
          <div style={s.insightSub}>
            {peakSpend
              ? `${peakSpend.category_name || 'Misc'} · ${new Date(peakSpend.date).toLocaleDateString('en-IN',{ month:'short', day:'numeric' })}`
              : 'No expenses yet'}
          </div>
        </div>
        <div style={s.insightCard}>
          <div style={{ ...s.insightBadge, background: '#6c5ce715', color: '#6c5ce7' }}>🏆 TOP CATEGORY</div>
          <div style={s.insightMain}>{heavyweight ? heavyweight.name : '—'}</div>
          <div style={s.insightSub}>{hwPct}% of total outflow</div>
        </div>
      </div>

      {/* ── Monthly Insights Card ─────────────────────────────────────────── */}
      <div style={s.card}>
        <div style={s.cardTitleRow}>
          <div style={s.cardTitle}>Monthly Insights</div>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={s.select}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>

        {pieData.length === 0 ? (
          <>
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>📊</div>
              <div style={s.emptyText}>No expense data for {MONTHS_FULL[month-1]}</div>
            </div>
            <HeatmapBlock />
          </>
        ) : (
          /*
           * Three-section flex row:
           *   [Donut]  [Legend 1-2 cols]  [Heatmap]
           * On tablet/mobile they wrap naturally via flexWrap.
           */
          <div style={s.monthlyLayout}>

            {/* 1 — Donut */}
            <div style={s.donutWrap}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius="52%" outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [fmt(val), name]}
                    contentStyle={{ background: '#1a1f35', border: '1px solid #2a2f45', borderRadius: '10px', fontSize: '13px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={s.donutCenter}>
                <div style={s.donutCenterAmt}>{fmt(pieTotalVal)}</div>
                <div style={s.donutCenterLbl}>total spent</div>
              </div>
            </div>

            {/* 2 — Legend: 1 col (≤4 cats) or 2 cols (5+ cats) */}
            <div style={{
              flex: 1,
              minWidth: '180px',
              display: 'grid',
              gridTemplateColumns: `repeat(${legendCols}, 1fr)`,
              gap: '10px 24px',
              alignContent: 'start',
            }}>
              {pieData.map((item, i) => {
                const pct = pieTotalVal > 0 ? ((item.value / pieTotalVal) * 100).toFixed(1) : 0;
                return (
                  <div key={i} style={s.legendItem}>
                    <div style={{ ...s.legendSwatch, background: item.color }} />
                    <div style={s.legendDetails}>
                      <div style={s.legendName}>{item.icon} {item.name}</div>
                      <div style={s.legendMeta}>
                        <span style={s.legendAmt}>{fmt(item.value)}</span>
                        <span style={{ ...s.legendPct, color: item.color }}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3 — Heatmap */}
            <HeatmapBlock />

          </div>
        )}
      </div>

      {/* ── Monthly Comparison Bar Chart ──────────────────────────────────── */}
      <div style={s.card}>
        <div style={s.cardTitleRow}>
          <div style={s.cardTitle}>Monthly Comparison</div>
          <div style={s.cardBadge}>bar view</div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f4566" />
            <XAxis dataKey="name" stroke="#8892b0" fontSize={11} tickLine={false} />
            <YAxis stroke="#8892b0" fontSize={11} tickLine={false}
              tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
            <Tooltip
              contentStyle={{ background: '#1a1f35', border: '1px solid #2a2f45', borderRadius: '10px', fontSize: '13px' }}
              formatter={fmt}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Income"     fill="#00f5a0" radius={[4,4,0,0]} maxBarSize={28} />
            <Bar dataKey="Expense"    fill="#ff4757" radius={[4,4,0,0]} maxBarSize={28} />
            <Bar dataKey="Investment" fill="#6c5ce7" radius={[4,4,0,0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: '100px' }} />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:          { padding: '20px', background: '#0a0e1a', minHeight: '100vh' },
  loadingScreen: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', gap: '16px' },
  loadingDot:    { width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#00f5a0,#0066ff)', animation: 'pulse 1.5s infinite' },
  loadingText:   { color: '#8892b0', fontSize: '14px' },

  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingTop: '10px' },
  pageTitle:   { fontSize: '24px', fontWeight: '700', color: '#fff' },
  pageSub:     { fontSize: '13px', color: '#8892b0', marginTop: '2px' },

  card:         { background: '#1a1f35', borderRadius: '16px', padding: '20px', marginBottom: '16px', border: '1px solid #2a2f45' },
  cardTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardTitle:    { fontSize: '16px', fontWeight: '700', color: '#fff' },
  cardBadge:    { fontSize: '11px', color: '#8892b0', background: '#2a2f45', padding: '4px 10px', borderRadius: '20px' },

  select: { background: '#0a0e1a', border: '1px solid #2a2f45', color: '#fff', padding: '7px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', cursor: 'pointer' },

  insightRow:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' },
  insightCard:  { background: '#1a1f35', borderRadius: '16px', padding: '18px 16px', border: '1px solid #2a2f45' },
  insightBadge: { display: 'inline-block', fontSize: '10px', fontWeight: '700', letterSpacing: '0.6px', padding: '4px 10px', borderRadius: '20px', marginBottom: '12px' },
  insightMain:  { fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '4px', lineHeight: 1.2 },
  insightSub:   { fontSize: '12px', color: '#8892b0', lineHeight: 1.4 },

  emptyState: { textAlign: 'center', padding: '40px 20px' },
  emptyIcon:  { fontSize: '36px', marginBottom: '12px' },
  emptyText:  { fontSize: '14px', color: '#8892b0' },

  // Three-section flex row: Donut | Legend | Heatmap
  // flexWrap means tablet/mobile stack naturally
  monthlyLayout: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
    alignItems: 'flex-start',
  },

  donutWrap: {
    position: 'relative',
    flex: '0 0 200px',
    width: '200px',
  },
  donutCenter: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  donutCenterAmt: { fontSize: '15px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap' },
  donutCenterLbl: { fontSize: '11px', color: '#8892b0', marginTop: '2px' },

  // legendGrid is now inline in JSX (dynamic cols), kept minimal here
  legendItem:    { display: 'flex', alignItems: 'flex-start', gap: '10px' },
  legendSwatch:  { width: '12px', height: '12px', borderRadius: '3px', flexShrink: 0, marginTop: '3px' },
  legendDetails: { flex: 1, minWidth: 0 },
  legendName:    { fontSize: '13px', color: '#fff', fontWeight: '500', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  legendMeta:    { display: 'flex', gap: '8px', alignItems: 'center' },
  legendAmt:     { fontSize: '12px', color: '#8892b0' },
  legendPct:     { fontSize: '12px', fontWeight: '700' },

  // Heatmap — flexShrink:0 keeps it from being squeezed in the flex row
  heatmapSection:  { flexShrink: 0 },
  heatmapTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' },
  heatmapTitle:    { fontSize: '13px', fontWeight: '600', color: '#8892b0' },
  heatLegend:      { display: 'flex', alignItems: 'center', gap: '4px' },
  heatLegendLbl:   { fontSize: '11px', color: '#8892b0' },
  heatLegendCell:  { width: '13px', height: '13px', borderRadius: '3px' },

  heatGrid:      { display: 'flex', gap: '6px', alignItems: 'flex-start' },
  heatDayLabels: { display: 'grid', gridTemplateRows: 'repeat(7, 28px)', gap: '4px', flexShrink: 0, paddingTop: '2px' },
  heatDayLabel:  { fontSize: '10px', color: '#8892b0', display: 'flex', alignItems: 'center', paddingRight: '4px', fontWeight: '600', whiteSpace: 'nowrap' },

  heatCells: {
    display: 'grid',
    gridTemplateRows: 'repeat(7, 28px)',
    gridAutoFlow: 'column',
    gridAutoColumns: '28px',
    gap: '4px',
  },
  heatCell: {
    width: '28px',
    height: '28px',
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.1s',
  },
  heatCellEmpty: { width: '28px', height: '28px', borderRadius: '5px', background: 'transparent' },
  heatCellNum:   { fontSize: '10px', fontWeight: '600', userSelect: 'none' },

  heatTooltip:     { position: 'fixed', background: '#1a1f35', border: '1px solid #2a2f45', borderRadius: '8px', padding: '8px 12px', zIndex: 9999, pointerEvents: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', minWidth: '130px' },
  heatTooltipDate: { fontSize: '12px', color: '#8892b0', marginBottom: '2px' },
  heatTooltipAmt:  { fontSize: '14px', fontWeight: '700', color: '#ff4757' },
};