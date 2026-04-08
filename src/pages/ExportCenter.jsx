import { useState } from 'react';
import { getTransactions, getMonthlySummary } from '../services/api';
import toast from 'react-hot-toast';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function ExportCenter() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState('');

  const formatAmount = (val) =>
    '₹' + Number(val || 0).toLocaleString('en-IN');

  // --- CSV Export ---
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
      if (txs.length === 0) {
        toast.error('No transactions found for this month');
        return;
      }

      const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Person'];
      const rows = txs.map(tx => [
        new Date(tx.date).toLocaleDateString('en-IN'),
        tx.type,
        tx.category_name || '',
        tx.amount,
        tx.note || '',
        tx.person_name || '',
      ]);

      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      downloadCSV(csv, `FinFlow_${MONTHS[month-1]}_${year}.csv`);
      toast.success('Monthly CSV downloaded ✅');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setLoading('');
    }
  };

  const exportMonthlySummaryCSV = async () => {
    setLoading('summary_csv');
    try {
      const res = await getMonthlySummary({ month, year });
      const s = res.data.summary;

      const rows = [
        ['FinFlow Monthly Summary'],
        [`${MONTHS[month-1]} ${year}`],
        [''],
        ['Category', 'Amount'],
        ['Income', s.income],
        ['Expense', s.expense],
        ['Investment', s.investment],
        ['Net Savings', s.net],
      ];

      const csv = rows.map(r => r.join(',')).join('\n');
      downloadCSV(csv, `FinFlow_Summary_${MONTHS[month-1]}_${year}.csv`);
      toast.success('Summary CSV downloaded ✅');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setLoading('');
    }
  };

  // --- Premium Export Placeholder ---
  const exportPremiumPDF = async () => {
    setLoading('premium_pdf');
    try {
      // Simulate API delay for UX
      await new Promise(res => setTimeout(res, 1500));
      toast.success('PDF Engine in Beta! Downloading CSV Summary instead 📄', { duration: 4000 });
      // Fallback to CSV summary for now
      await exportMonthlySummaryCSV();
    } finally {
      setLoading('');
    }
  };

  const exportYearlyCSV = async () => {
    setLoading('yearly_csv');
    try {
      const res = await getTransactions({
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
        limit: 5000,
      });

      const txs = res.data.transactions;
      if (txs.length === 0) {
        toast.error('No transactions found for this year');
        return;
      }

      const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Person'];
      const rows = txs.map(tx => [
        new Date(tx.date).toLocaleDateString('en-IN'),
        tx.type,
        tx.category_name || '',
        tx.amount,
        tx.note || '',
        tx.person_name || '',
      ]);

      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      downloadCSV(csv, `FinFlow_Yearly_${year}.csv`);
      toast.success('Yearly CSV downloaded ✅');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setLoading('');
    }
  };

  const exportCustomCSV = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setLoading('custom_csv');
    try {
      const res = await getTransactions({
        start_date: startDate,
        end_date: endDate,
        limit: 5000,
      });

      const txs = res.data.transactions;
      if (txs.length === 0) {
        toast.error('No transactions found for this range');
        return;
      }

      const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Person'];
      const rows = txs.map(tx => [
        new Date(tx.date).toLocaleDateString('en-IN'),
        tx.type,
        tx.category_name || '',
        tx.amount,
        tx.note || '',
        tx.person_name || '',
      ]);

      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      downloadCSV(csv, `FinFlow_${startDate}_to_${endDate}.csv`);
      toast.success('Custom CSV downloaded ✅');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setLoading('');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Export Center</div>
        <div style={styles.subtitle}>Download your financial intelligence.</div>
      </div>

      {/* Month + Year Selector */}
      <div style={styles.selectorRow}>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          style={styles.select}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={styles.select}
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* --- PREMIUM PDF CARD (Matches UI Design) --- */}
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

        <div style={styles.premiumVisualRow}>
          <div style={styles.visualBox}>
            <div style={styles.visualCircle}></div>
            <div style={styles.visualText}>CATEGORIES</div>
          </div>
          <div style={styles.visualBox}>
            <div style={styles.visualBars}>
              <div style={{...styles.bar, width: '80%'}}></div>
              <div style={{...styles.bar, width: '40%'}}></div>
            </div>
            <div style={styles.visualText}>TOP 5</div>
          </div>
          <div style={styles.visualBox}>
            <div style={styles.visualDate}>
              {MONTHS[month-1].slice(0,3)} '{String(year).slice(-2)}
            </div>
            <div style={styles.visualText}>LATEST</div>
          </div>
        </div>

        <button
          onClick={exportPremiumPDF}
          disabled={loading === 'premium_pdf'}
          style={styles.premiumBtn}
        >
          {loading === 'premium_pdf' ? 'Generating Report...' : 'Generate Premium PDF ⬇'}
        </button>
      </div>

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

      {/* Custom Range Export */}
      <div style={styles.customCard}>
        <div style={styles.customHeader}>
          <span style={styles.calendarIcon}>📅</span>
          <span style={styles.customTitle}>Custom Range Export</span>
        </div>
        
        <div style={styles.dateRow}>
          <div style={styles.dateField}>
            <label style={styles.dateLabel}>START DATE</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <div style={styles.dateField}>
            <label style={styles.dateLabel}>END DATE</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>
        </div>
        <button
          onClick={exportCustomCSV}
          disabled={loading === 'custom_csv'}
          style={styles.customExportBtn}
        >
          {loading === 'custom_csv' ? 'Processing...' : 'Process Custom Archive 🔃'}
        </button>
      </div>

      <div style={{ height: '80px' }} /> {/* Bottom Nav Spacing */}
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh', paddingBottom: '80px' },
  header: { marginBottom: '20px', paddingTop: '10px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: '14px', color: '#8892b0', marginTop: '4px' },
  
  selectorRow: {
    display: 'flex', gap: '10px', marginBottom: '24px',
  },
  select: {
    flex: 1, padding: '12px 14px', background: '#1a1f35',
    border: '1px solid #2a2f45', borderRadius: '12px',
    color: '#fff', fontSize: '15px', outline: 'none',
  },
  sectionTitle: {
    fontSize: '14px', fontWeight: '700', color: '#8892b0',
    letterSpacing: '0.5px', marginBottom: '12px', marginTop: '4px',
  },

  // --- Premium Card Styles ---
  premiumCard: {
    background: '#1a1f35',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #ffa502',
    boxShadow: '0 4px 20px rgba(255, 165, 2, 0.1)',
  },
  premiumHeaderRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'
  },
  premiumTag: {
    background: '#ffa50222', color: '#ffa502',
    padding: '4px 8px', borderRadius: '6px',
    fontSize: '10px', fontWeight: '800', letterSpacing: '1px'
  },
  freeBadge: {
    color: '#00f5a0', fontSize: '11px', fontWeight: '600'
  },
  premiumTitleRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'
  },
  premiumTitle: {
    fontSize: '22px', fontWeight: '700', color: '#fff'
  },
  premiumIcon: {
    fontSize: '24px', background: '#ffa50233', padding: '8px', borderRadius: '10px'
  },
  premiumDesc: {
    fontSize: '13px', color: '#8892b0', marginBottom: '20px', lineHeight: '1.4'
  },
  premiumVisualRow: {
    display: 'flex', gap: '10px', marginBottom: '20px'
  },
  visualBox: {
    flex: 1, background: '#0a0e1a', borderRadius: '10px', padding: '14px 10px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    border: '1px solid #2a2f45'
  },
  visualCircle: {
    width: '24px', height: '24px', borderRadius: '50%',
    border: '3px solid #ffa502', borderTopColor: '#2a2f45', marginBottom: '8px'
  },
  visualBars: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', alignItems: 'center'
  },
  bar: {
    height: '6px', background: '#00f5a0', borderRadius: '3px'
  },
  visualDate: {
    fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '8px'
  },
  visualText: {
    fontSize: '9px', color: '#8892b0', fontWeight: '800', letterSpacing: '0.5px'
  },
  premiumBtn: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #ffb142, #ff793f)',
    border: 'none', borderRadius: '12px', color: '#0a0e1a',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer',
  },

  // --- Grid Layout for CSVs ---
  gridRow: {
    display: 'flex', gap: '12px', marginBottom: '24px'
  },
  exportGridCard: {
    flex: 1, background: '#1a1f35', borderRadius: '14px', padding: '16px',
    border: '1px solid #2a2f45', cursor: 'pointer'
  },
  gridIconBlue: {
    width: '36px', height: '36px', background: '#0066ff22', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '12px'
  },
  gridIconPurple: {
    width: '36px', height: '36px', background: '#6c5ce722', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '12px'
  },
  gridTitle: { fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '4px' },
  gridDesc: { fontSize: '12px', color: '#8892b0', marginBottom: '16px', lineHeight: '1.4' },
  gridAction: { fontSize: '11px', fontWeight: '700', color: '#00f5a0', letterSpacing: '0.5px' },

  // --- Custom Range ---
  customCard: {
    background: '#1a1f35', borderRadius: '14px', padding: '20px',
    border: '1px solid #2a2f45',
  },
  customHeader: {
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'
  },
  calendarIcon: { fontSize: '18px' },
  customTitle: { fontSize: '15px', fontWeight: '600', color: '#fff' },
  dateRow: { display: 'flex', gap: '12px', marginBottom: '20px' },
  dateField: { flex: 1 },
  dateLabel: {
    display: 'block', fontSize: '11px', color: '#8892b0',
    fontWeight: '700', letterSpacing: '0.5px', marginBottom: '6px',
  },
  dateInput: {
    width: '100%', padding: '12px', background: '#0a0e1a',
    border: '1px solid #2a2f45', borderRadius: '10px',
    color: '#fff', fontSize: '14px', outline: 'none',
  },
  customExportBtn: {
    width: '100%', padding: '14px',
    background: '#2a2f45',
    border: 'none', borderRadius: '12px', color: '#fff',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
  },
};