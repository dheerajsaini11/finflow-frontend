import { useState, useEffect } from 'react';
import { getYearlyAnalytics, getTransactions } from '../services/api';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS_MON = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const WEEKDAYS_SUN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// 5-tier heat scale
const getHeatColor = (val, max) => {
  if (!val || val === 0) return '#1e2440';
  const r = val / max;
  if (r > 0.80) return '#ff2d3b';
  if (r > 0.60) return '#ff4757';
  if (r > 0.40) return '#ff6b7a';
  if (r > 0.15) return '#ff9fa8';
  return '#ffd0d4';
};

// ── Responsive hook ───────────────────────────────────────────────────────────
const useWidth = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
};

// ── Legend layout calculator ──────────────────────────────────────────────────
// Returns { maxRows, numCols, pieSize }
// We cap rows per column at MAX_ROWS so categories fill downward first.
const MAX_ROWS = 5;

const getLegendLayout = (count, isMobile, isTablet) => {
  if (isMobile) return { maxRows: count, numCols: 1, pieSize: 180 };
  if (isTablet)  return { maxRows: MAX_ROWS, numCols: Math.ceil(count / MAX_ROWS), pieSize: 180 };
  // Desktop: figure out how many cols we'll need, then shrink pie if many cols
  const numCols = Math.max(1, Math.ceil(count / MAX_ROWS));
  // Each legend col is ~170px + gap; pie shrinks from 220 down to 140 as cols grow
  const pieSize = Math.max(140, Math.min(220, 220 - (numCols - 1) * 20));
  return { maxRows: MAX_ROWS, numCols, pieSize };
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Analytics() {
  const [data, setData]         = useState(null);
  const [monthTxs, setMonthTxs] = useState([]);
  const [year, setYear]         = useState(new Date().getFullYear());
  const [month, setMonth]       = useState(new Date().getMonth() + 1);
  const [loading, setLoading]   = useState(true);
  const [tooltip, setTooltip]   = useState(null); // { x, y, lines[] }

  const vw         = useWidth();
  const isMobile   = vw < 520;
  const isTablet   = vw >= 520 && vw < 960;
  const isDesktop  = vw >= 960;

  const weekStart      = localStorage.getItem('finflow_week_start') || 'monday';
  const startsOnMonday = weekStart === 'monday';
  const WEEKDAYS       = startsOnMonday ? WEEKDAYS_MON : WEEKDAYS_SUN;

  useEffect(() => { fetchAnalytics(); }, [year, month]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const lastDay = new Date(year, month, 0).getDate();
      const [aRes, tRes] = await Promise.all([
        getYearlyAnalytics({ year, month }),
        getTransactions({
          start_date: `${year}-${String(month).padStart(2,'0')}-01`,
          end_date:   `${year}-${String(month).padStart(2,'0')}-${lastDay}`,
          limit: 1000,
        }),
      ]);
      setData(aRes.data);
      setMonthTxs(tRes.data.transactions || []);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (val) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const chartData = data?.months?.map((m, i) => ({
    name: MONTHS[i], Income: m.income, Expense: m.expense, Investment: m.investment,
  })) || [];

  // Filter null-name (deleted categories with SET NULL)
  const pieData = (data?.categoryBreakdown || [])
    .filter(c => c.name)
    .map(c => ({ name: c.name, value: Number(c.total), color: c.color || '#6c5ce7', icon: c.icon || '📦' }));

  // Heatmap
  const heatmapData = {};
  monthTxs.forEach(tx => {
    if (tx.type === 'expense') {
      const d = tx.date.split('T')[0].substring(0, 10);
      heatmapData[d] = (heatmapData[d] || 0) + Number(tx.amount);
    }
  });
  const maxHeat = Math.max(...Object.values(heatmapData), 1);

  // Calendar cells (week-start aware)
  const buildCalendar = () => {
    const dim = new Date(year, month, 0).getDate();
    const fwd = new Date(year, month - 1, 1).getDay();
    const blanks = startsOnMonday ? (fwd + 6) % 7 : fwd;
    return [
      ...Array(blanks).fill(null),
      ...Array.from({ length: dim }, (_, i) =>
        `${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
      ),
    ];
  };

  // Insight calculations
  const sortedCats    = [...pieData].sort((a,b) => b.value - a.value);
  const heavyweight   = sortedCats[0] || null;
  const totalExpenses = sortedCats.reduce((s,c) => s + c.value, 0);
  const hwPct = heavyweight && totalExpenses > 0
    ? ((heavyweight.value / totalExpenses) * 100).toFixed(0) : 0;
  const expenses  = monthTxs.filter(t => t.type === 'expense');
  const peakSpend = expenses.length > 0
    ? expenses.reduce((mx, t) => Number(t.amount) > Number(mx.amount) ? t : mx, expenses[0])
    : null;

  const calendarCells = buildCalendar();
  const pieTotalVal   = pieData.reduce((s,p) => s + p.value, 0);
  const todayStr      = new Date().toISOString().split('T')[0];

  // Legend layout
  const { maxRows, numCols, pieSize } = getLegendLayout(pieData.length, isMobile, isTablet);

  // ── Heat cell size: fill available width on mobile ────────────────────────
  // On mobile we want the grid to take full card width.
  // Day-label col ≈ 36px, gap between label+cells = 6px, 4px gaps between 7 cols
  // cellSize = (availableWidth - 36 - 6 - 6*4) / 7
  // We clamp between 28–44px.
  const CARD_PADDING  = 20;                         // card has 20px padding each side
  const availCardW    = vw - CARD_PADDING * 2 - 2;  // subtract card border too
  const DAY_LABEL_W   = 36;
  const heatCellSize  = isMobile
    ? Math.max(28, Math.min(44, Math.floor((availCardW - DAY_LABEL_W - 6 - 24) / 7)))
    : 28;

  // ── Rendering ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={st.loadingScreen}>
      <div style={st.loadingSpinner} />
      <span style={st.loadingText}>Loading analytics...</span>
    </div>
  );

  // ── Heatmap block (self-contained) ────────────────────────────────────────
  const HeatmapBlock = () => (
    <div style={{ width: '100%' }}>
      {/* Title row: label left, legend+dropdown right */}
      <div style={st.heatTitleRow}>
        <span style={st.heatTitle}>Spending Intensity — {MONTHS_FULL[month-1]} {year}</span>
        <div style={st.heatControls}>
          {/* Heat legend sits directly left of dropdown */}
          <div style={st.heatLegend}>
            <span style={st.heatLegLbl}>Less</span>
            {['#1e2440','#ffd0d4','#ff9fa8','#ff6b7a','#ff4757','#ff2d3b'].map((c,i) => (
              <div key={i} style={{ ...st.heatLegCell, background: c }} />
            ))}
            <span style={st.heatLegLbl}>More</span>
          </div>
        </div>
      </div>

      {/* Grid: day-labels | cells */}
      <div style={st.heatGrid}>
        {/* Day labels column */}
        <div style={{ ...st.heatDayLabels, rowGap: `${heatCellSize - 18}px` }}>
          {WEEKDAYS.map((d, i) => (
            <div key={i} style={{ ...st.heatDayLabel, height: `${heatCellSize}px` }}>{d}</div>
          ))}
        </div>

        {/* Cells: column-first grid, 7 rows */}
        <div style={{
          display: 'grid',
          gridTemplateRows: `repeat(7, ${heatCellSize}px)`,
          gridAutoFlow: 'column',
          gridAutoColumns: `${heatCellSize}px`,
          gap: '4px',
          overflowX: 'auto',
        }}>
          {calendarCells.map((dayStr, i) => {
            if (!dayStr) return (
              <div key={i} style={{ width: heatCellSize, height: heatCellSize, borderRadius: 5 }} />
            );
            const spend  = heatmapData[dayStr];
            const dayNum = parseInt(dayStr.split('-')[2]);
            const isToday = dayStr === todayStr;
            return (
              <div
                key={i}
                style={{
                  width: heatCellSize, height: heatCellSize,
                  borderRadius: 5,
                  background: getHeatColor(spend, maxHeat),
                  border: isToday ? '2px solid #00f5a0' : '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  boxShadow: spend ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}
                onMouseEnter={e => {
                  const date = new Date(dayStr);
                  const lbl  = date.toLocaleDateString('en-IN',{ weekday:'short', day:'numeric', month:'short' });
                  setTooltip({ x: e.clientX, y: e.clientY, lines: [lbl, spend ? fmt(spend) : 'No spending'] });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <span style={{
                  fontSize: heatCellSize >= 36 ? 11 : 10,
                  fontWeight: 600,
                  color: spend ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
                  userSelect: 'none',
                }}>
                  {dayNum}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div style={st.page}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={st.pageHeader}>
        <div>
          <div style={st.pageTitle}>Analytics</div>
          <div style={st.pageSub}>{year} overview</div>
        </div>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={st.select}>
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ── Cash Flow line chart ─────────────────────────────────────────── */}
      <div style={st.card}>
        <div style={st.cardTitleRow}>
          <div style={st.cardTitle}>Cash Flow Index</div>
          <div style={st.cardBadge}>12 months</div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top:4, right:4, left:-10, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f4566" />
            <XAxis dataKey="name" stroke="#8892b0" fontSize={11} tickLine={false} />
            <YAxis stroke="#8892b0" fontSize={11} tickLine={false}
              tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
            <Tooltip contentStyle={{ background:'#1a1f35', border:'1px solid #2a2f45', borderRadius:'10px', fontSize:'13px' }} formatter={fmt} />
            <Legend wrapperStyle={{ fontSize:'12px' }} />
            <Line type="monotone" dataKey="Income"     stroke="#00f5a0" strokeWidth={2.5} dot={false} activeDot={{ r:5 }} />
            <Line type="monotone" dataKey="Expense"    stroke="#ff4757" strokeWidth={2.5} dot={false} activeDot={{ r:5 }} />
            <Line type="monotone" dataKey="Investment" stroke="#6c5ce7" strokeWidth={2.5} dot={false} activeDot={{ r:5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Insight cards ────────────────────────────────────────────────── */}
      <div style={st.insightRow}>
        <div style={st.insightCard}>
          <div style={{ ...st.insightBadge, background:'#ffa50215', color:'#ffa502' }}>💼 PEAK SPEND</div>
          <div style={st.insightMain}>{peakSpend ? fmt(peakSpend.amount) : '—'}</div>
          <div style={st.insightSub}>
            {peakSpend
              ? `${peakSpend.category_name || 'Misc'} · ${new Date(peakSpend.date).toLocaleDateString('en-IN',{ month:'short', day:'numeric' })}`
              : 'No expenses yet'}
          </div>
        </div>
        <div style={st.insightCard}>
          <div style={{ ...st.insightBadge, background:'#6c5ce715', color:'#6c5ce7' }}>🏆 TOP CATEGORY</div>
          <div style={st.insightMain}>{heavyweight ? heavyweight.name : '—'}</div>
          <div style={st.insightSub}>{hwPct}% of total outflow</div>
        </div>
      </div>

      {/* ── Monthly Insights card ─────────────────────────────────────────── */}
      <div style={st.card}>
        {/* Card header: title + month picker */}
        <div style={st.cardTitleRow}>
          <div style={st.cardTitle}>Monthly Insights</div>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={st.select}>
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>

        {/* ── Pie + Legend section ─────────────────────────────────────── */}
        {pieData.length === 0 ? (
          <div style={st.emptyState}>
            <div style={st.emptyIcon}>📊</div>
            <div style={st.emptyText}>No expense data for {MONTHS_FULL[month-1]}</div>
          </div>
        ) : (
          <>
            {/*
              Layout strategy:
              - Mobile:   Donut full-width stacked above single-col legend
              - Tablet:   Donut left | legend right (2 cols)
              - Desktop:  Donut left | legend fills remaining space (column-first, max MAX_ROWS per col)
            */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '16px' : '24px',
              alignItems: 'flex-start',
              marginBottom: '24px',
            }}>

              {/* Donut — size adapts to numCols on desktop */}
              <div style={{
                position: 'relative',
                flexShrink: 0,
                width: isMobile ? '100%' : `${pieSize}px`,
                height: isMobile ? '220px' : `${pieSize}px`,
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%"
                      innerRadius="52%" outerRadius="82%"
                      paddingAngle={2} dataKey="value"
                    >
                      {pieData.map((e,i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [fmt(val), name]}
                      contentStyle={{ background:'#1a1f35', border:'1px solid #2a2f45', borderRadius:'10px', fontSize:'13px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Centre label */}
                <div style={st.donutCenter}>
                  <div style={st.donutCenterAmt}>{fmt(pieTotalVal)}</div>
                  <div style={st.donutCenterLbl}>total spent</div>
                </div>
              </div>

              {/*
                COLUMN-FIRST LEGEND
                We use a CSS grid with a fixed number of rows (maxRows) and
                grid-auto-flow: column so items fill downward first.
                numCols is computed from pieData.length / maxRows.
              */}
              <div style={{
                flex: 1,
                minWidth: 0,
                display: 'grid',
                gridTemplateRows: `repeat(${isMobile ? pieData.length : Math.min(maxRows, pieData.length)}, auto)`,
                gridAutoFlow: isMobile ? 'row' : 'column',
                gridAutoColumns: isMobile ? '1fr' : '170px',
                gap: '10px 20px',
                alignContent: 'start',
              }}>
                {pieData.map((item, i) => {
                  const pct = pieTotalVal > 0 ? ((item.value / pieTotalVal) * 100).toFixed(1) : 0;
                  return (
                    <div key={i} style={st.legendItem}>
                      <div style={{ ...st.legendSwatch, background: item.color }} />
                      <div style={st.legendDetails}>
                        <div style={{
                          ...st.legendName,
                          whiteSpace: isMobile ? 'normal' : 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {item.icon} {item.name}
                        </div>
                        <div style={st.legendMeta}>
                          <span style={st.legendAmt}>{fmt(item.value)}</span>
                          <span style={{ ...st.legendPct, color: item.color }}>{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Divider between pie section and heatmap */}
            <div style={{ height:'1px', background:'#2a2f45', margin:'0 0 20px' }} />
          </>
        )}

        {/* ── Heatmap (always shown, even if no pie data) ─────────────── */}
        <HeatmapBlock />
      </div>

      {/* ── Monthly Comparison bar chart ──────────────────────────────────── */}
      <div style={st.card}>
        <div style={st.cardTitleRow}>
          <div style={st.cardTitle}>Monthly Comparison</div>
          <div style={st.cardBadge}>bar view</div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top:4, right:4, left:-10, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f4566" />
            <XAxis dataKey="name" stroke="#8892b0" fontSize={11} tickLine={false} />
            <YAxis stroke="#8892b0" fontSize={11} tickLine={false}
              tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
            <Tooltip contentStyle={{ background:'#1a1f35', border:'1px solid #2a2f45', borderRadius:'10px', fontSize:'13px' }} formatter={fmt} />
            <Legend wrapperStyle={{ fontSize:'12px' }} />
            <Bar dataKey="Income"     fill="#00f5a0" radius={[4,4,0,0]} maxBarSize={28} />
            <Bar dataKey="Expense"    fill="#ff4757" radius={[4,4,0,0]} maxBarSize={28} />
            <Bar dataKey="Investment" fill="#6c5ce7" radius={[4,4,0,0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height:'100px' }} />

      {/* ── Hover tooltip (fixed-position) ───────────────────────────────── */}
      {tooltip && (
        <div style={{
          ...st.heatTooltip,
          top:  tooltip.y - 70,
          left: Math.min(tooltip.x - 65, vw - 160),
        }}>
          {tooltip.lines.map((line, i) => (
            <div key={i} style={i === 0 ? st.heatTooltipDate : st.heatTooltipAmt}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Static styles ─────────────────────────────────────────────────────────────
const st = {
  page:          { padding:'20px', background:'#0a0e1a', minHeight:'100vh' },
  loadingScreen: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0e1a', gap:'16px' },
  loadingSpinner:{ width:'36px', height:'36px', borderRadius:'50%', border:'3px solid #2a2f45', borderTopColor:'#00f5a0', animation:'spin 0.8s linear infinite' },
  loadingText:   { color:'#8892b0', fontSize:'14px' },

  pageHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px', paddingTop:'10px' },
  pageTitle:  { fontSize:'24px', fontWeight:'700', color:'#fff' },
  pageSub:    { fontSize:'13px', color:'#8892b0', marginTop:'2px' },

  card:         { background:'#1a1f35', borderRadius:'16px', padding:'20px', marginBottom:'16px', border:'1px solid #2a2f45' },
  cardTitleRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' },
  cardTitle:    { fontSize:'16px', fontWeight:'700', color:'#fff' },
  cardBadge:    { fontSize:'11px', color:'#8892b0', background:'#2a2f45', padding:'4px 10px', borderRadius:'20px' },

  select: { background:'#0a0e1a', border:'1px solid #2a2f45', color:'#fff', padding:'7px 12px', borderRadius:'10px', fontSize:'13px', outline:'none', cursor:'pointer' },

  insightRow:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' },
  insightCard:  { background:'#1a1f35', borderRadius:'16px', padding:'18px 16px', border:'1px solid #2a2f45' },
  insightBadge: { display:'inline-block', fontSize:'10px', fontWeight:'700', letterSpacing:'0.6px', padding:'4px 10px', borderRadius:'20px', marginBottom:'12px' },
  insightMain:  { fontSize:'20px', fontWeight:'700', color:'#fff', marginBottom:'4px', lineHeight:1.2 },
  insightSub:   { fontSize:'12px', color:'#8892b0', lineHeight:1.4 },

  emptyState: { textAlign:'center', padding:'32px 20px' },
  emptyIcon:  { fontSize:'36px', marginBottom:'12px' },
  emptyText:  { fontSize:'14px', color:'#8892b0' },

  // Donut
  donutCenter:    { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' },
  donutCenterAmt: { fontSize:'15px', fontWeight:'700', color:'#fff', whiteSpace:'nowrap' },
  donutCenterLbl: { fontSize:'11px', color:'#8892b0', marginTop:'2px' },

  // Legend
  legendItem:    { display:'flex', alignItems:'flex-start', gap:'10px', minWidth:0 },
  legendSwatch:  { width:'12px', height:'12px', borderRadius:'3px', flexShrink:0, marginTop:'3px' },
  legendDetails: { flex:1, minWidth:0 },
  legendName:    { fontSize:'13px', color:'#fff', fontWeight:'500', marginBottom:'2px' },
  legendMeta:    { display:'flex', gap:'8px', alignItems:'center' },
  legendAmt:     { fontSize:'12px', color:'#8892b0' },
  legendPct:     { fontSize:'12px', fontWeight:'700' },

  // Heatmap
  heatTitleRow:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', flexWrap:'wrap', gap:'8px' },
  heatTitle:     { fontSize:'13px', fontWeight:'600', color:'#8892b0' },
  heatControls:  { display:'flex', alignItems:'center', gap:'10px' },
  heatLegend:    { display:'flex', alignItems:'center', gap:'4px' },
  heatLegLbl:    { fontSize:'11px', color:'#8892b0' },
  heatLegCell:   { width:'13px', height:'13px', borderRadius:'3px' },

  heatGrid:      { display:'flex', gap:'6px', alignItems:'flex-start', width:'100%' },
  heatDayLabels: { display:'grid', gridTemplateRows:'repeat(7, 1fr)', flexShrink:0 },
  heatDayLabel:  { fontSize:'10px', color:'#8892b0', display:'flex', alignItems:'center', paddingRight:'6px', fontWeight:'600', whiteSpace:'nowrap' },

  heatTooltip:     { position:'fixed', background:'#1a1f35', border:'1px solid #2a2f45', borderRadius:'8px', padding:'8px 12px', zIndex:9999, pointerEvents:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.5)', minWidth:'140px' },
  heatTooltipDate: { fontSize:'12px', color:'#8892b0', marginBottom:'2px' },
  heatTooltipAmt:  { fontSize:'14px', fontWeight:'700', color:'#ff4757' },
};
