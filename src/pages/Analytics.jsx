import { useState, useEffect } from 'react';
import { getYearlyAnalytics, getTransactions } from '../services/api';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS_MON = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const WEEKDAYS_SUN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const CELL  = 28;  // px — fixed desktop heat-cell size
const GAP   =  4;  // px — gap between cells
const MAX_LEGEND_ROWS = 5;

// Heatmap desktop width = day-label col + gap + 7 cols of cells
// April has 5 weeks = 5 columns → max cols = 6 (blanks + 5 full weeks)
// We allow up to 6 columns: 6*CELL + 5*GAP = 168+20=188, +label(38)+gap(6) = 232
// Use 240px as the fixed heatmap area width on desktop so it never expands
const HEAT_LABEL_W = 38;

const getHeatColor = (val, max) => {
  if (!val) return '#1e2440';
  const r = val / max;
  if (r > 0.80) return '#ff2d3b';
  if (r > 0.60) return '#ff4757';
  if (r > 0.40) return '#ff6b7a';
  if (r > 0.15) return '#ff9fa8';
  return '#ffd0d4';
};

// ── Responsive hook ───────────────────────────────────────────────────────────
const useWidth = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [data,     setData]     = useState(null);
  const [monthTxs, setMonthTxs] = useState([]);
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [month,    setMonth]    = useState(new Date().getMonth() + 1);
  const [loading,  setLoading]  = useState(true);
  const [tip,      setTip]      = useState(null); // { x, y, lines[] }

  const vw          = useWidth();
  const isMobile    = vw < 640;   // ≤ 639 → stacked
  const isDesktop   = vw >= 640;

  const weekStart      = localStorage.getItem('finflow_week_start') || 'monday';
  const startsOnMonday = weekStart === 'monday';
  const WEEKDAYS       = startsOnMonday ? WEEKDAYS_MON : WEEKDAYS_SUN;

  useEffect(() => { load(); }, [year, month]);

  const load = async () => {
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
    } catch { toast.error('Failed to load analytics'); }
    finally  { setLoading(false); }
  };

  const fmt = v => '₹' + Number(v || 0).toLocaleString('en-IN');

  const chartData = data?.months?.map((m, i) => ({
    name: MONTHS[i], Income: m.income, Expense: m.expense, Investment: m.investment,
  })) || [];

  // Null-safe pie (filters deleted categories with SET NULL)
  const pieData = (data?.categoryBreakdown || [])
    .filter(c => c.name)
    .map(c => ({ name: c.name, value: Number(c.total), color: c.color || '#6c5ce7', icon: c.icon || '📦' }));

  // Heatmap lookup
  const heatMap = {};
  monthTxs.forEach(tx => {
    if (tx.type === 'expense') {
      const d = tx.date.split('T')[0].substring(0, 10);
      heatMap[d] = (heatMap[d] || 0) + Number(tx.amount);
    }
  });
  const maxHeat = Math.max(...Object.values(heatMap), 1);

  // Calendar (week-start aware, column-first: fills Mon→Sun then next week)
  const buildCal = () => {
    const dim = new Date(year, month, 0).getDate();
    const fwd = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const blanks = startsOnMonday ? (fwd + 6) % 7 : fwd;
    return [
      ...Array(blanks).fill(null),
      ...Array.from({ length: dim }, (_, i) =>
        `${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`),
    ];
  };

  // Insights
  const sorted    = [...pieData].sort((a,b) => b.value - a.value);
  const hw        = sorted[0] || null;
  const totExp    = sorted.reduce((s,c) => s + c.value, 0);
  const hwPct     = hw && totExp > 0 ? ((hw.value/totExp)*100).toFixed(0) : 0;
  const expenses  = monthTxs.filter(t => t.type === 'expense');
  const peak      = expenses.length
    ? expenses.reduce((mx,t) => +t.amount > +mx.amount ? t : mx, expenses[0])
    : null;

  const cells       = buildCal();
  const pieTotalVal = pieData.reduce((s,p) => s + p.value, 0);
  const todayStr    = new Date().toISOString().split('T')[0];

  // ── How many legend columns fit between donut and heatmap ─────────────────
  // On mobile: 1 col legend beside the donut (donut=160px, legend fills rest)
  // On desktop: legend fills remaining space between donut(180px)+gap and heatmap
  //   Each legend column is ~170px wide; use auto-fill so it decides naturally.
  const numLegendRows = Math.min(MAX_LEGEND_ROWS, pieData.length);

  // ── Mobile heat-cell size: fill full card width ───────────────────────────
  const cardPad    = 20;  // card padding (each side)
  const availW     = vw - cardPad * 2 - 2; // card content width
  // label col + gap + 7 cells + 6 inter-cell gaps = HEAT_LABEL_W+6 + 7*cell + 6*4
  // cell = (availW - HEAT_LABEL_W - 6 - 24) / 7
  const mobileCellPx = Math.max(30, Math.min(44, Math.floor((availW - HEAT_LABEL_W - 6 - 24) / 7)));
  const cellPx = isMobile ? mobileCellPx : CELL;

  if (loading) return (
    <div style={s.loader}>
      <div style={s.loaderSpinner} />
      <span style={s.loaderTxt}>Loading analytics...</span>
    </div>
  );

  // ── Heatmap (reusable, width adapts) ─────────────────────────────────────
  const Heatmap = () => (
    <div>
      {/* Title row */}
      <div style={s.heatHead}>
        <span style={s.heatTitle}>
          Spending Intensity — {MONTHS_FULL[month-1]} {year}
        </span>
        {/* Legend: Less ░░▒▓█ More */}
        <div style={s.heatLegRow}>
          <span style={s.heatLegLbl}>Less</span>
          {['#1e2440','#ffd0d4','#ff9fa8','#ff6b7a','#ff4757','#ff2d3b'].map((c,i) => (
            <div key={i} style={{ ...s.heatLegBox, background: c }} />
          ))}
          <span style={s.heatLegLbl}>More</span>
        </div>
      </div>

      {/* Day-labels + cell grid side by side */}
      <div style={{ display:'flex', gap:'6px', alignItems:'flex-start' }}>

        {/* Day labels — MUST match cell height + gap pixel-perfect */}
        <div style={{
          display: 'grid',
          gridTemplateRows: `repeat(7, ${cellPx}px)`,
          gap: `${GAP}px`,
          flexShrink: 0,
          width: `${HEAT_LABEL_W}px`,
        }}>
          {WEEKDAYS.map((d,i) => (
            <div key={i} style={{
              height: cellPx,
              display: 'flex',
              alignItems: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#8892b0',
              whiteSpace: 'nowrap',
            }}>{d}</div>
          ))}
        </div>

        {/* Cells — column-first (fills Mon→Sun, then next week column) */}
        <div style={{
          display: 'grid',
          gridTemplateRows: `repeat(7, ${cellPx}px)`,
          gridAutoFlow: 'column',
          gridAutoColumns: `${cellPx}px`,
          gap: `${GAP}px`,
          // On mobile: allow horizontal scroll if month has 6 week-columns
          overflowX: isMobile ? 'auto' : 'visible',
        }}>
          {cells.map((dayStr, i) => {
            if (!dayStr) return (
              <div key={i} style={{ width: cellPx, height: cellPx, borderRadius: 5 }} />
            );
            const spend   = heatMap[dayStr];
            const dayNum  = parseInt(dayStr.split('-')[2]);
            const isToday = dayStr === todayStr;
            return (
              <div
                key={i}
                style={{
                  width: cellPx, height: cellPx,
                  borderRadius: 5,
                  background: getHeatColor(spend, maxHeat),
                  border: isToday ? '2px solid #00f5a0' : '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: spend ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  const lbl = new Date(dayStr).toLocaleDateString('en-IN',{
                    weekday:'short', day:'numeric', month:'short',
                  });
                  setTip({ x: e.clientX, y: e.clientY,
                    lines: [lbl, spend ? fmt(spend) : 'No spending'] });
                }}
                onMouseLeave={() => setTip(null)}
              >
                <span style={{
                  fontSize: cellPx >= 36 ? 11 : 10,
                  fontWeight: 600,
                  color: spend ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.22)',
                  userSelect: 'none',
                }}>{dayNum}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.pageHead}>
        <div>
          <div style={s.pageTitle}>Analytics</div>
          <div style={s.pageSub}>{year} overview</div>
        </div>
        <select value={year} onChange={e => setYear(+e.target.value)} style={s.sel}>
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Cash Flow */}
      <div style={s.card}>
        <div style={s.cardHeadRow}>
          <span style={s.cardTitle}>Cash Flow Index</span>
          <span style={s.cardBadge}>12 months</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top:4, right:4, left:-10, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f4566" />
            <XAxis dataKey="name" stroke="#8892b0" fontSize={11} tickLine={false} />
            <YAxis stroke="#8892b0" fontSize={11} tickLine={false}
              tickFormatter={v => v>=1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
            <Tooltip contentStyle={{ background:'#1a1f35', border:'1px solid #2a2f45', borderRadius:'10px', fontSize:'13px' }} formatter={fmt} />
            <Legend wrapperStyle={{ fontSize:'12px' }} />
            <Line type="monotone" dataKey="Income"     stroke="#00f5a0" strokeWidth={2.5} dot={false} activeDot={{ r:5 }} />
            <Line type="monotone" dataKey="Expense"    stroke="#ff4757" strokeWidth={2.5} dot={false} activeDot={{ r:5 }} />
            <Line type="monotone" dataKey="Investment" stroke="#6c5ce7" strokeWidth={2.5} dot={false} activeDot={{ r:5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Insight cards */}
      <div style={s.insightRow}>
        <div style={s.insightCard}>
          <div style={{ ...s.badge, background:'#ffa50215', color:'#ffa502' }}>💼 PEAK SPEND</div>
          <div style={s.insightVal}>{peak ? fmt(peak.amount) : '—'}</div>
          <div style={s.insightSub}>
            {peak ? `${peak.category_name||'Misc'} · ${new Date(peak.date).toLocaleDateString('en-IN',{ month:'short', day:'numeric' })}` : 'No expenses yet'}
          </div>
        </div>
        <div style={s.insightCard}>
          <div style={{ ...s.badge, background:'#6c5ce715', color:'#6c5ce7' }}>🏆 TOP CATEGORY</div>
          <div style={s.insightVal}>{hw ? hw.name : '—'}</div>
          <div style={s.insightSub}>{hwPct}% of total outflow</div>
        </div>
      </div>

      {/* Monthly Insights */}
      <div style={s.card}>
        <div style={s.cardHeadRow}>
          <span style={s.cardTitle}>Monthly Insights</span>
          <select value={month} onChange={e => setMonth(+e.target.value)} style={s.sel}>
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>

        {pieData.length === 0 ? (
          <>
            <div style={s.empty}>
              <div style={{ fontSize:36, marginBottom:12 }}>📊</div>
              <div style={{ fontSize:14, color:'#8892b0' }}>No expense data for {MONTHS_FULL[month-1]}</div>
            </div>
            <div style={{ height:1, background:'#2a2f45', margin:'16px 0' }} />
            <Heatmap />
          </>
        ) : (
          <>
            {/*
              ═══════════════════════════════════════════════════════════════
              LAYOUT:
              Mobile  (<640px): flex column → donut+legend row → heatmap
              Desktop (≥640px): 3-column CSS grid
                col1: donut (180px fixed)
                col2: legend (1fr — fills available space, col-first)
                col3: heatmap (auto — sized by content)
              ═══════════════════════════════════════════════════════════════
            */}
            {isMobile ? (
              /* ── Mobile layout ── */
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

                {/* Row 1: donut + single-col legend side by side */}
                <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>

                  {/* Donut */}
                  <div style={{ position:'relative', flexShrink:0, width:150, height:150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%"
                          innerRadius="50%" outerRadius="82%"
                          paddingAngle={2} dataKey="value">
                          {pieData.map((e,i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                        </Pie>
                        <Tooltip formatter={(v,n) => [fmt(v),n]}
                          contentStyle={{ background:'#1a1f35', border:'1px solid #2a2f45', borderRadius:'10px', fontSize:'12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={s.donutCtr}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>{fmt(pieTotalVal)}</div>
                      <div style={{ fontSize:10, color:'#8892b0' }}>total spent</div>
                    </div>
                  </div>

                  {/* Single-col legend */}
                  <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:8 }}>
                    {pieData.map((item,i) => {
                      const pct = pieTotalVal > 0 ? ((item.value/pieTotalVal)*100).toFixed(1) : 0;
                      return (
                        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                          <div style={{ ...s.swatch, background:item.color }} />
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {item.icon} {item.name}
                            </div>
                            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                              <span style={{ fontSize:11, color:'#8892b0' }}>{fmt(item.value)}</span>
                              <span style={{ fontSize:11, fontWeight:700, color:item.color }}>{pct}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2: heatmap full width */}
                <div style={{ height:1, background:'#2a2f45' }} />
                <Heatmap />
              </div>

            ) : (
              /* ── Desktop 3-column grid ── */
              <div style={{
                display: 'grid',
                // col1=donut, col2=legend fills space, col3=heatmap hugs content
                gridTemplateColumns: '180px 1fr auto',
                gridTemplateAreas: '"donut legend heatmap"',
                gap: '24px',
                alignItems: 'start',
              }}>

                {/* Col 1 — Donut */}
                <div style={{ gridArea:'donut', position:'relative', width:180, height:180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%"
                        innerRadius="50%" outerRadius="82%"
                        paddingAngle={2} dataKey="value">
                        {pieData.map((e,i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip formatter={(v,n) => [fmt(v),n]}
                        contentStyle={{ background:'#1a1f35', border:'1px solid #2a2f45', borderRadius:'10px', fontSize:'13px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={s.donutCtr}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>{fmt(pieTotalVal)}</div>
                    <div style={{ fontSize:10, color:'#8892b0', marginTop:2 }}>total spent</div>
                  </div>
                </div>

                {/* Col 2 — Legend, column-first fill */}
                <div style={{
                  gridArea: 'legend',
                  display: 'grid',
                  // Fixed row count → items fill downward first, then new column auto-creates
                  gridTemplateRows: `repeat(${numLegendRows}, auto)`,
                  gridAutoFlow: 'column',
                  gridAutoColumns: '165px',
                  gap: '10px 20px',
                  alignContent: 'start',
                }}>
                  {pieData.map((item,i) => {
                    const pct = pieTotalVal > 0 ? ((item.value/pieTotalVal)*100).toFixed(1) : 0;
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:9, minWidth:0 }}>
                        <div style={{ ...s.swatch, background:item.color, marginTop:3, flexShrink:0 }} />
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2 }}>
                            {item.icon} {item.name}
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                            <span style={{ fontSize:12, color:'#8892b0' }}>{fmt(item.value)}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:item.color }}>{pct}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Col 3 — Heatmap (auto width = content width) */}
                <div style={{ gridArea:'heatmap' }}>
                  <Heatmap />
                </div>

              </div>
            )}
          </>
        )}
      </div>

      {/* Bar Chart */}
      <div style={s.card}>
        <div style={s.cardHeadRow}>
          <span style={s.cardTitle}>Monthly Comparison</span>
          <span style={s.cardBadge}>bar view</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top:4, right:4, left:-10, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f4566" />
            <XAxis dataKey="name" stroke="#8892b0" fontSize={11} tickLine={false} />
            <YAxis stroke="#8892b0" fontSize={11} tickLine={false}
              tickFormatter={v => v>=1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
            <Tooltip contentStyle={{ background:'#1a1f35', border:'1px solid #2a2f45', borderRadius:'10px', fontSize:'13px' }} formatter={fmt} />
            <Legend wrapperStyle={{ fontSize:'12px' }} />
            <Bar dataKey="Income"     fill="#00f5a0" radius={[4,4,0,0]} maxBarSize={28} />
            <Bar dataKey="Expense"    fill="#ff4757" radius={[4,4,0,0]} maxBarSize={28} />
            <Bar dataKey="Investment" fill="#6c5ce7" radius={[4,4,0,0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height:100 }} />

      {/* Hover tooltip */}
      {tip && (
        <div style={{
          position:'fixed',
          top: tip.y - 70,
          left: Math.min(tip.x - 65, vw - 170),
          background:'#1a1f35', border:'1px solid #2a2f45',
          borderRadius:8, padding:'8px 12px',
          zIndex:9999, pointerEvents:'none',
          boxShadow:'0 4px 20px rgba(0,0,0,0.5)',
          minWidth:140,
        }}>
          <div style={{ fontSize:12, color:'#8892b0', marginBottom:2 }}>{tip.lines[0]}</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#ff4757' }}>{tip.lines[1]}</div>
        </div>
      )}
    </div>
  );
}

// ── Static styles ─────────────────────────────────────────────────────────────
const s = {
  page:   { padding:'20px', background:'#0a0e1a', minHeight:'100vh' },
  loader: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0e1a', gap:16 },
  loaderSpinner: { width:36, height:36, borderRadius:'50%', border:'3px solid #2a2f45', borderTopColor:'#00f5a0' },
  loaderTxt: { color:'#8892b0', fontSize:14 },

  pageHead:  { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, paddingTop:10 },
  pageTitle: { fontSize:24, fontWeight:700, color:'#fff' },
  pageSub:   { fontSize:13, color:'#8892b0', marginTop:2 },

  card:        { background:'#1a1f35', borderRadius:16, padding:20, marginBottom:16, border:'1px solid #2a2f45' },
  cardHeadRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  cardTitle:   { fontSize:16, fontWeight:700, color:'#fff' },
  cardBadge:   { fontSize:11, color:'#8892b0', background:'#2a2f45', padding:'4px 10px', borderRadius:20 },

  sel: { background:'#0a0e1a', border:'1px solid #2a2f45', color:'#fff', padding:'7px 12px', borderRadius:10, fontSize:13, outline:'none', cursor:'pointer' },

  insightRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 },
  insightCard:{ background:'#1a1f35', borderRadius:16, padding:'18px 16px', border:'1px solid #2a2f45' },
  badge:      { display:'inline-block', fontSize:10, fontWeight:700, letterSpacing:'0.6px', padding:'4px 10px', borderRadius:20, marginBottom:12 },
  insightVal: { fontSize:20, fontWeight:700, color:'#fff', marginBottom:4, lineHeight:1.2 },
  insightSub: { fontSize:12, color:'#8892b0', lineHeight:1.4 },

  empty:    { textAlign:'center', padding:'32px 20px' },

  donutCtr: { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' },

  swatch: { width:11, height:11, borderRadius:3, flexShrink:0 },

  heatHead:   { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 },
  heatTitle:  { fontSize:12, fontWeight:600, color:'#8892b0' },
  heatLegRow: { display:'flex', alignItems:'center', gap:4 },
  heatLegLbl: { fontSize:11, color:'#8892b0' },
  heatLegBox: { width:13, height:13, borderRadius:3 },
};
