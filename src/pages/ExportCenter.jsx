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
    // Calculate correct last day of selected month
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Export Center</div>
        <div style={styles.subtitle}>Download your financial intelligence</div>
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

      {/* Monthly Exports */}
      <div style={styles.sectionTitle}>Monthly Reports</div>

      <div style={styles.exportCard}>
        <div style={styles.exportLeft}>
          <div style={styles.exportIcon}>📋</div>
          <div>
            <div style={styles.exportTitle}>Monthly Transactions</div>
            <div style={styles.exportDesc}>
              All transactions for {MONTHS[month-1]} {year}
            </div>
          </div>
        </div>
        <button
          onClick={exportMonthlyCSV}
          disabled={loading === 'monthly_csv'}
          style={styles.exportBtn}
        >
          {loading === 'monthly_csv' ? '...' : '⬇️ CSV'}
        </button>
      </div>

      <div style={styles.exportCard}>
        <div style={styles.exportLeft}>
          <div style={styles.exportIcon}>📊</div>
          <div>
            <div style={styles.exportTitle}>Monthly Summary</div>
            <div style={styles.exportDesc}>
              Income, Expense, Investment totals
            </div>
          </div>
        </div>
        <button
          onClick={exportMonthlySummaryCSV}
          disabled={loading === 'summary_csv'}
          style={styles.exportBtn}
        >
          {loading === 'summary_csv' ? '...' : '⬇️ CSV'}
        </button>
      </div>

      {/* Yearly Export */}
      <div style={styles.sectionTitle}>Yearly Report</div>

      <div style={styles.exportCard}>
        <div style={styles.exportLeft}>
          <div style={styles.exportIcon}>📅</div>
          <div>
            <div style={styles.exportTitle}>Full Year {year}</div>
            <div style={styles.exportDesc}>
              All transactions for the entire year
            </div>
          </div>
        </div>
        <button
          onClick={exportYearlyCSV}
          disabled={loading === 'yearly_csv'}
          style={styles.exportBtn}
        >
          {loading === 'yearly_csv' ? '...' : '⬇️ CSV'}
        </button>
      </div>

      {/* Custom Range */}
      <div style={styles.sectionTitle}>Custom Date Range</div>

      <div style={styles.customCard}>
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
          {loading === 'custom_csv' ? 'Preparing...' : '⬇️ Export Custom Range'}
        </button>
      </div>

      {/* Info Note */}
      <div style={styles.infoCard}>
        <span>ℹ️</span>
        <span>
          All exports are in CSV format which can be opened in Excel,
          Google Sheets, or any spreadsheet app.
        </span>
      </div>

      <div style={{ height: '20px' }} />
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh' },
  header: { marginBottom: '20px', paddingTop: '10px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: '13px', color: '#8892b0', marginTop: '4px' },
  selectorRow: {
    display: 'flex', gap: '10px', marginBottom: '24px',
  },
  select: {
    flex: 1, padding: '10px 12px', background: '#1a1f35',
    border: '1px solid #2a2f45', borderRadius: '10px',
    color: '#fff', fontSize: '14px', outline: 'none',
  },
  sectionTitle: {
    fontSize: '14px', fontWeight: '700', color: '#8892b0',
    letterSpacing: '0.5px', marginBottom: '12px', marginTop: '4px',
  },
  exportCard: {
    background: '#1a1f35', borderRadius: '14px', padding: '16px',
    marginBottom: '10px', border: '1px solid #2a2f45',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  exportLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  exportIcon: {
    width: '44px', height: '44px', background: '#0a0e1a',
    borderRadius: '12px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '20px', flexShrink: 0,
  },
  exportTitle: { fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '3px' },
  exportDesc: { fontSize: '12px', color: '#8892b0' },
  exportBtn: {
    padding: '10px 16px', background: '#00f5a022',
    border: '1px solid #00f5a044', borderRadius: '10px',
    color: '#00f5a0', fontSize: '13px', fontWeight: '600',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  customCard: {
    background: '#1a1f35', borderRadius: '14px', padding: '16px',
    marginBottom: '16px', border: '1px solid #2a2f45',
  },
  dateRow: { display: 'flex', gap: '10px', marginBottom: '14px' },
  dateField: { flex: 1 },
  dateLabel: {
    display: 'block', fontSize: '11px', color: '#8892b0',
    fontWeight: '600', letterSpacing: '0.5px', marginBottom: '6px',
  },
  dateInput: {
    width: '100%', padding: '10px 12px', background: '#0a0e1a',
    border: '1px solid #2a2f45', borderRadius: '10px',
    color: '#fff', fontSize: '13px', outline: 'none',
  },
  customExportBtn: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #00f5a0, #0066ff)',
    border: 'none', borderRadius: '12px', color: '#0a0e1a',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer',
  },
  infoCard: {
    background: '#1a1f3588', borderRadius: '12px', padding: '14px',
    display: 'flex', gap: '10px', alignItems: 'flex-start',
    fontSize: '12px', color: '#8892b0', border: '1px solid #2a2f45',
  },
};