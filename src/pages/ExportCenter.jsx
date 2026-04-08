import { useState, useRef } from 'react';
import { getTransactions, getMonthlySummary } from '../services/api';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const COLORS = ['#00f5a0', '#0066ff', '#ff4757', '#ffa502', '#6c5ce7', '#ff6b81', '#7bed9f'];

export default function ExportCenter() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState('');
  
  // State to hold data temporarily for the PDF generation
  const [pdfData, setPdfData] = useState(null);
  const reportRef = useRef(null);

  const formatAmount = (val) => '₹' + Number(val || 0).toLocaleString('en-IN');

  // --- CSV Export Logic ---
  const downloadCSV = (data, filename) => {
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMonthlyCSV = async () => {
    setLoading('monthly_csv');
    try {
      const lastDay = new Date(year, month, 0).getDate();
      const res = await getTransactions({
        start_date: `${year}-${String(month).padStart(2, '0')}-01`,
        end_date: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
        limit: 1000,
      });

      const txs = res.data.transactions;
      if (txs.length === 0) return toast.error('No transactions found');

      const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Person'];
      const rows = txs.map(tx => [
        new Date(tx.date).toLocaleDateString('en-IN'),
        tx.type, tx.category_name || '', tx.amount, tx.note || '', tx.person_name || ''
      ]);

      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      downloadCSV(csv, `FinFlow_${MONTHS[month-1]}_${year}.csv`);
      toast.success('Monthly CSV downloaded ✅');
    } catch (err) { toast.error('Export failed'); } finally { setLoading(''); }
  };

  const exportMonthlySummaryCSV = async () => { /* Kept standard for CSV fallback if needed */
    setLoading('summary_csv');
    try {
      const res = await getMonthlySummary({ month, year });
      const s = res.data.summary;
      const rows = [
        ['FinFlow Monthly Summary'], [`${MONTHS[month-1]} ${year}`], [''],
        ['Category', 'Amount'], ['Income', s.income], ['Expense', s.expense],
        ['Investment', s.investment], ['Net Savings', s.net],
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      downloadCSV(csv, `FinFlow_Summary_${MONTHS[month-1]}_${year}.csv`);
      toast.success('Summary CSV downloaded ✅');
    } catch (err) { toast.error('Export failed'); } finally { setLoading(''); }
  };

  // --- PREMIUM RICH PDF EXPORT ---
  const exportPremiumPDF = async () => {
    setLoading('premium_pdf');
    try {
      const lastDay = new Date(year, month, 0).getDate();
      
      // 1. Fetch both Summary and Transactions
      const [sumRes, txRes] = await Promise.all([
        getMonthlySummary({ month, year }),
        getTransactions({
          start_date: `${year}-${String(month).padStart(2, '0')}-01`,
          end_date: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
          limit: 1000,
        })
      ]);

      const txs = txRes.data.transactions;
      if (txs.length === 0) {
        toast.error(`No data for ${MONTHS[month-1]} ${year}`);
        setLoading('');
        return;
      }

      // 2. Calculate Chart Data (Expenses by Category)
      const expenseTxs = txs.filter(t => t.type === 'expense');
      const categoryMap = {};
      expenseTxs.forEach(tx => {
        const cat = tx.category_name || 'Other';
        categoryMap[cat] = (categoryMap[cat] || 0) + Number(tx.amount);
      });
      const chartData = Object.keys(categoryMap).map(key => ({
        name: key, value: categoryMap[key]
      })).sort((a, b) => b.value - a.value);

      // 3. Find Top 5 Transactions
      const topTxs = [...txs].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5);

      // 4. Set state to trigger hidden render
      setPdfData({
        summary: sumRes.data.summary,
        chartData,
        topTxs,
        monthName: MONTHS[month-1],
        year
      });

      // 5. Wait for React to render the hidden DOM and Recharts to draw
      setTimeout(async () => {
        if (!reportRef.current) return;
        
        toast.loading('Compiling Premium PDF...', { id: 'pdf_toast' });
        
        const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`FinFlow_Premium_Report_${MONTHS[month-1]}_${year}.pdf`);
        
        toast.success('Premium PDF Downloaded! ✨', { id: 'pdf_toast' });
        setPdfData(null); // Clear hidden DOM
        setLoading('');
      }, 1500); // 1.5s delay to ensure chart renders completely

    } catch (err) {
      toast.error('Failed to generate PDF');
      setLoading('');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Export Center</div>
        <div style={styles.subtitle}>Download your financial intelligence.</div>
      </div>

      <div style={styles.selectorRow}>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} style={styles.select}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={styles.select}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* --- PREMIUM PDF CARD --- */}
      <div style={styles.premiumCard}>
        <div style={styles.premiumHeaderRow}>
          <div style={styles.premiumTag}>PREMIUM FEATURE</div>
          <div style={styles.freeBadge}>✨ Unlocked Free for Early Users</div>
        </div>
        
        <div style={styles.premiumTitleRow}>
          <div style={styles.premiumTitle}>Monthly PDF Report</div>
          <div style={styles.premiumIcon}>📄</div>
        </div>
        
        <div style={styles.premiumDesc}>
          Visual summary with category analysis and top expense trends.
        </div>

        <button
          onClick={exportPremiumPDF}
          disabled={loading === 'premium_pdf'}
          style={styles.premiumBtn}
        >
          {loading === 'premium_pdf' ? 'Generating Rich PDF...' : 'Generate Premium PDF ⬇'}
        </button>
      </div>

      {/* HIDDEN REPORT DOM FOR HTML2CANVAS (Only renders during generation) */}
      {pdfData && (
        <div style={styles.hiddenWrapper}>
          <div ref={reportRef} style={styles.pdfDocument}>
            
            <div style={styles.pdfHeader}>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#0a0e1a' }}>FinFlow</h1>
              <p style={{ margin: 0, fontSize: '16px', color: '#8892b0' }}>
                Financial Intelligence Report • {pdfData.monthName} {pdfData.year}
              </p>
            </div>

            <div style={styles.pdfMetricsGrid}>
              <div style={styles.pdfMetricBox}>
                <p style={styles.pdfMetricLabel}>TOTAL INCOME</p>
                <h2 style={{...styles.pdfMetricValue, color: '#00B894'}}>{formatAmount(pdfData.summary.income)}</h2>
              </div>
              <div style={styles.pdfMetricBox}>
                <p style={styles.pdfMetricLabel}>TOTAL EXPENSE</p>
                <h2 style={{...styles.pdfMetricValue, color: '#FF6B6B'}}>{formatAmount(pdfData.summary.expense)}</h2>
              </div>
              <div style={styles.pdfMetricBox}>
                <p style={styles.pdfMetricLabel}>NET SAVINGS</p>
                <h2 style={{...styles.pdfMetricValue, color: '#6C5CE7'}}>{formatAmount(pdfData.summary.net)}</h2>
              </div>
            </div>

            <h3 style={styles.pdfSectionTitle}>Expense Breakdown</h3>
            <div style={{ width: '100%', height: '300px', marginBottom: '40px' }}>
              <ResponsiveContainer width="100%" height="100%">
                {/* isAnimationActive={false} is REQUIRED for html2canvas to capture the chart properly */}
                <PieChart>
                  <Pie
                    data={pdfData.chartData}
                    cx="50%" cy="50%"
                    innerRadius={80} outerRadius={120}
                    paddingAngle={5} dataKey="value"
                    isAnimationActive={false} 
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pdfData.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <h3 style={styles.pdfSectionTitle}>Top Transactions</h3>
            <table style={styles.pdfTable}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={styles.pdfTh}>Date</th>
                  <th style={styles.pdfTh}>Category</th>
                  <th style={styles.pdfTh}>Type</th>
                  <th style={styles.pdfTh}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {pdfData.topTxs.map((tx, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={styles.pdfTd}>{new Date(tx.date).toLocaleDateString()}</td>
                    <td style={styles.pdfTd}>{tx.category_name || '-'}</td>
                    <td style={styles.pdfTd}>{tx.type.toUpperCase()}</td>
                    <td style={{...styles.pdfTd, fontWeight: 'bold'}}>{formatAmount(tx.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ marginTop: '50px', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>
              Generated securely by FinFlow • {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Standard Monthly CSV Exports */}
      <div style={styles.sectionTitle}>Standard Exports</div>
      <div style={styles.gridRow}>
        <div style={styles.exportGridCard} onClick={exportMonthlyCSV}>
          <div style={styles.gridIconBlue}>📊</div>
          <div style={styles.gridTitle}>Raw Data</div>
          <div style={styles.gridDesc}>Full transaction ledger.</div>
          <div style={styles.gridAction}>{loading === 'monthly_csv' ? '...' : 'EXPORT CSV →'}</div>
        </div>
        <div style={styles.exportGridCard} onClick={exportMonthlySummaryCSV}>
          <div style={styles.gridIconPurple}>📉</div>
          <div style={styles.gridTitle}>Summary</div>
          <div style={styles.gridDesc}>Income & Expense totals.</div>
          <div style={styles.gridAction}>{loading === 'summary_csv' ? '...' : 'PREPARE CSV →'}</div>
        </div>
      </div>

      <div style={{ height: '80px' }} />
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh', paddingBottom: '80px' },
  header: { marginBottom: '20px', paddingTop: '10px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: '14px', color: '#8892b0', marginTop: '4px' },
  selectorRow: { display: 'flex', gap: '10px', marginBottom: '24px' },
  select: { flex: 1, padding: '12px 14px', background: '#1a1f35', border: '1px solid #2a2f45', borderRadius: '12px', color: '#fff', fontSize: '15px', outline: 'none' },
  sectionTitle: { fontSize: '14px', fontWeight: '700', color: '#8892b0', letterSpacing: '0.5px', marginBottom: '12px', marginTop: '4px' },

  // --- Premium Card ---
  premiumCard: { background: '#1a1f35', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '1px solid #ffa502', boxShadow: '0 4px 20px rgba(255, 165, 2, 0.1)' },
  premiumHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  premiumTag: { background: '#ffa50222', color: '#ffa502', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', letterSpacing: '1px' },
  freeBadge: { color: '#00f5a0', fontSize: '11px', fontWeight: '600' },
  premiumTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  premiumTitle: { fontSize: '22px', fontWeight: '700', color: '#fff' },
  premiumIcon: { fontSize: '24px', background: '#ffa50233', padding: '8px', borderRadius: '10px' },
  premiumDesc: { fontSize: '13px', color: '#8892b0', marginBottom: '20px', lineHeight: '1.4' },
  premiumBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #ffb142, #ff793f)', border: 'none', borderRadius: '12px', color: '#0a0e1a', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },

  // --- Grid Exports ---
  gridRow: { display: 'flex', gap: '12px', marginBottom: '24px' },
  exportGridCard: { flex: 1, background: '#1a1f35', borderRadius: '14px', padding: '16px', border: '1px solid #2a2f45', cursor: 'pointer' },
  gridIconBlue: { width: '36px', height: '36px', background: '#0066ff22', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '12px' },
  gridIconPurple: { width: '36px', height: '36px', background: '#6c5ce722', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '12px' },
  gridTitle: { fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '4px' },
  gridDesc: { fontSize: '12px', color: '#8892b0', marginBottom: '16px', lineHeight: '1.4' },
  gridAction: { fontSize: '11px', fontWeight: '700', color: '#00f5a0', letterSpacing: '0.5px' },

  // --- HIDDEN PDF DOM STYLING (A4 Light Theme) ---
  hiddenWrapper: { position: 'absolute', top: '-9999px', left: '-9999px' }, // Hides it from the user
  pdfDocument: { width: '794px', minHeight: '1123px', background: '#ffffff', padding: '40px', boxSizing: 'border-box', fontFamily: 'sans-serif' },
  pdfHeader: { borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '30px' },
  pdfMetricsGrid: { display: 'flex', gap: '20px', marginBottom: '40px' },
  pdfMetricBox: { flex: 1, background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e9ecef' },
  pdfMetricLabel: { fontSize: '12px', color: '#6c757d', fontWeight: 'bold', margin: '0 0 10px 0' },
  pdfMetricValue: { margin: 0, fontSize: '24px', fontWeight: '800' },
  pdfSectionTitle: { fontSize: '20px', color: '#212529', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  pdfTable: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  pdfTh: { padding: '12px', borderBottom: '2px solid #dee2e6', color: '#495057' },
  pdfTd: { padding: '12px', color: '#212529' }
};