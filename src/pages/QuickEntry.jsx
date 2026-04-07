import { useState, useEffect } from 'react';
import { getCategories, addTransaction, getStreak, getMonthlySummary } from '../services/api';
import toast from 'react-hot-toast';

const TYPES = ['expense', 'income', 'investment', 'lend'];

const TYPE_COLORS = {
  expense: '#ff4757',
  income: '#00f5a0',
  investment: '#6c5ce7',
  lend: '#ffa502',
};

const TYPE_ICONS = {
  expense: '💸',
  income: '💰',
  investment: '📈',
  lend: '🤝',
};

export default function QuickEntry() {
  const today = new Date().toISOString().split('T')[0];

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);
  const [personName, setPersonName] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchStreak();
    fetchTodayTotal();
  }, [type]);

  const fetchCategories = async () => {
    try {
      const typeMap = {
        expense: 'expense',
        income: 'income',
        investment: 'investment',
        lend: 'expense',
      };
      const res = await getCategories({ type: typeMap[type] });
      setCategories(res.data.categories);
      setCategoryId('');
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const fetchStreak = async () => {
    try {
      const res = await getStreak();
      setStreak(res.data.streak);
    } catch (err) {
      console.error('Failed to load streak');
    }
  };

  const fetchTodayTotal = async () => {
    try {
      const now = new Date();
      const res = await getMonthlySummary({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      setTodayTotal(res.data.summary.expense || 0);
    } catch (err) {
      console.error('Failed to load today total');
    }
  };

  const handleDateChange = (val) => {
    if (val > today) {
      toast.error('Future dates are not allowed');
      return;
    }
    setDate(val);
  };

  const handleNumber = (num) => {
    if (num === 'backspace') {
      setAmount(prev => prev.slice(0, -1));
      return;
    }
    if (num === '.' && amount.includes('.')) return;
    if (amount.length >= 10) return;
    setAmount(prev => prev + num);
  };

  const checkAndSubmit = () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!date) {
      toast.error('Please select a date');
      return;
    }
    if (date > today) {
      toast.error('Future dates are not allowed');
      return;
    }
    if (type === 'lend' && !personName.trim()) {
      toast.error('Please enter person name');
      return;
    }

    // Unusual amount warning
    if (type === 'expense' && Number(amount) > 10000) {
      setWarningMsg(
        `₹${Number(amount).toLocaleString('en-IN')} is a large expense. Are you sure?`
      );
      setShowWarning(true);
      return;
    }

    handleSubmit();
  };

  const handleSubmit = async () => {
    setShowWarning(false);
    setLoading(true);

    try {
      await addTransaction({
        type,
        amount: Number(amount),
        category_id: categoryId || null,
        note: note.trim() || null,
        date,
        person_name: personName.trim() || null,
      });

      const selectedCat = categories.find(
        c => String(c.id) === String(categoryId)
      );
      toast.success(
        `✅ ${selectedCat?.icon || ''} ₹${Number(amount).toLocaleString('en-IN')} logged`
      );

      setAmount('');
      setNote('');
      setPersonName('');
      setDate(today);
      setCategoryId('');

      fetchStreak();
      fetchTodayTotal();

    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const accentColor = TYPE_COLORS[type];

  const getTimeSuggestion = () => {
    const hour = new Date().getHours();
    if (type !== 'expense') return null;
    if (hour >= 6 && hour <= 9) return '☕ Morning — logging breakfast?';
    if (hour >= 12 && hour <= 14) return '🍱 Lunch time — logging food?';
    if (hour >= 17 && hour <= 20) return '🌆 Evening — logging dinner or travel?';
    return null;
  };

  const suggestion = getTimeSuggestion();

  return (
    <div style={styles.container}>

      {/* Warning Modal */}
      {showWarning && (
        <div style={styles.warningOverlay}>
          <div style={styles.warningModal}>
            <div style={styles.warningIcon}>⚠️</div>
            <div style={styles.warningTitle}>Unusual Amount</div>
            <div style={styles.warningText}>{warningMsg}</div>
            <div style={styles.warningBtns}>
              <button
                onClick={() => setShowWarning(false)}
                style={styles.warningCancel}
              >
                Edit Amount
              </button>
              <button
                onClick={handleSubmit}
                style={styles.warningConfirm}
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Streak Banner */}
      {streak > 0 && (
        <div style={styles.streakBanner}>
          <span style={styles.streakFire}>🔥</span>
          <div>
            <div style={styles.streakText}>
              {streak} day streak! Keep it going!
            </div>
            <div style={styles.streakSub}>
              Logged every day for {streak} days straight
            </div>
          </div>
          {todayTotal > 0 && (
            <div style={styles.todayTotal}>
              <div style={styles.todayLabel}>Today</div>
              <div style={styles.todayAmount}>
                ₹{Number(todayTotal).toLocaleString('en-IN')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's Spend Card (when no streak) */}
      {streak === 0 && todayTotal > 0 && (
        <div style={styles.todayCard}>
          <span style={styles.todayCardLabel}>Today's Expense</span>
          <span style={styles.todayCardAmount}>
            ₹{Number(todayTotal).toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>Quick Entry</div>
        <div style={styles.headerSub}>Log your transaction</div>
      </div>

      {/* Type Selector */}
      <div style={styles.typeRow}>
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            style={{
              ...styles.typeBtn,
              background: type === t ? TYPE_COLORS[t] : '#1a1f35',
              color: type === t ? '#0a0e1a' : '#8892b0',
              border: `1px solid ${type === t ? TYPE_COLORS[t] : '#2a2f45'}`,
            }}
          >
            {TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Smart Suggestion */}
      {suggestion && (
        <div style={styles.suggestionBar}>
          <span>{suggestion}</span>
        </div>
      )}

      {/* Date and Category Row */}
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>DATE</label>
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => handleDateChange(e.target.value)}
            style={{
              ...styles.input,
              borderColor: accentColor + '44',
            }}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>CATEGORY</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            style={{
              ...styles.input,
              borderColor: accentColor + '44',
            }}
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Person Name for Lend */}
      {type === 'lend' && (
        <div style={styles.fullField}>
          <label style={styles.label}>PERSON NAME</label>
          <input
            type="text"
            value={personName}
            onChange={e => setPersonName(e.target.value)}
            placeholder="Who are you lending to?"
            style={{
              ...styles.input,
              borderColor: accentColor + '44',
            }}
          />
        </div>
      )}

      {/* Amount Display */}
      <div style={styles.amountContainer}>
        <div style={styles.currencySymbol}>₹</div>
        <div style={{
          ...styles.amountDisplay,
          color: amount ? accentColor : '#2a2f45',
        }}>
          {amount ? Number(amount).toLocaleString('en-IN') : '0'}
        </div>
      </div>

      {/* Note */}
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add a note... (optional)"
        maxLength={100}
        style={styles.noteInput}
      />

      {/* Save Button */}
      <button
        onClick={checkAndSubmit}
        disabled={loading}
        style={{
          ...styles.saveBtn,
          background: loading ? '#2a2f45' : accentColor,
          color: loading ? '#8892b0' : '#0a0e1a',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading
          ? 'Saving...'
          : `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`}
      </button>

      {/* Numpad */}
      <div style={styles.numpad}>
        {['1','2','3','4','5','6','7','8','9','.','0','backspace'].map(key => (
          <button
            key={key}
            onClick={() => handleNumber(key)}
            style={{
              ...styles.numKey,
              background: key === 'backspace' ? '#1a1f35' : '#1e2440',
              fontSize: key === 'backspace' ? '18px' : '22px',
            }}
          >
            {key === 'backspace' ? '⌫' : key}
          </button>
        ))}
      </div>

    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh' },
  warningOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)', zIndex: 2000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  },
  warningModal: {
    background: '#1a1f35', borderRadius: '20px', padding: '28px',
    width: '100%', maxWidth: '360px', textAlign: 'center',
    border: '1px solid #ff475744',
  },
  warningIcon: { fontSize: '40px', marginBottom: '12px' },
  warningTitle: { fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  warningText: { fontSize: '14px', color: '#8892b0', marginBottom: '24px', lineHeight: '1.5' },
  warningBtns: { display: 'flex', gap: '10px' },
  warningCancel: {
    flex: 1, padding: '12px', background: '#2a2f45', border: 'none',
    borderRadius: '12px', color: '#fff', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer',
  },
  warningConfirm: {
    flex: 1, padding: '12px', background: '#ff4757', border: 'none',
    borderRadius: '12px', color: '#fff', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer',
  },
  streakBanner: {
    background: 'linear-gradient(135deg, #2d1f00, #1a1200)',
    border: '1px solid #ffa50244', borderRadius: '14px',
    padding: '14px 16px', display: 'flex',
    alignItems: 'center', gap: '12px', marginBottom: '20px',
  },
  streakFire: { fontSize: '32px' },
  streakText: { fontSize: '15px', fontWeight: '700', color: '#ffa502' },
  streakSub: { fontSize: '12px', color: '#8892b0', marginTop: '2px' },
  todayTotal: { marginLeft: 'auto', textAlign: 'right' },
  todayLabel: { fontSize: '10px', color: '#8892b0', fontWeight: '600' },
  todayAmount: { fontSize: '16px', fontWeight: '700', color: '#ff4757' },
  todayCard: {
    background: '#1a1f35', border: '1px solid #2a2f45',
    borderRadius: '12px', padding: '12px 16px',
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '16px',
  },
  todayCardLabel: { fontSize: '13px', color: '#8892b0' },
  todayCardAmount: { fontSize: '16px', fontWeight: '700', color: '#ff4757' },
  header: { marginBottom: '16px' },
  headerTitle: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: '13px', color: '#8892b0', marginTop: '4px' },
  typeRow: {
    display: 'flex', gap: '8px',
    marginBottom: '16px', flexWrap: 'wrap',
  },
  typeBtn: {
    padding: '8px 14px', borderRadius: '20px',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s',
  },
  suggestionBar: {
    background: '#1a1f35', border: '1px solid #2a2f45',
    borderRadius: '10px', padding: '10px 14px',
    fontSize: '13px', color: '#8892b0', marginBottom: '16px',
  },
  row: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '12px', marginBottom: '16px',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  fullField: {
    display: 'flex', flexDirection: 'column',
    gap: '6px', marginBottom: '16px',
  },
  label: {
    fontSize: '11px', color: '#8892b0',
    fontWeight: '600', letterSpacing: '0.5px',
  },
  input: {
    padding: '10px 12px', background: '#1a1f35',
    border: '1px solid #2a2f45', borderRadius: '10px',
    color: '#fff', fontSize: '14px', outline: 'none', width: '100%',
  },
  amountContainer: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '8px',
    padding: '20px 0 12px',
  },
  currencySymbol: { fontSize: '32px', color: '#8892b0', fontWeight: '300' },
  amountDisplay: {
    fontSize: '52px', fontWeight: '700',
    transition: 'color 0.2s', minWidth: '100px', textAlign: 'center',
  },
  noteInput: {
    width: '100%', padding: '12px 16px',
    background: '#1a1f35', border: '1px solid #2a2f45',
    borderRadius: '10px', color: '#fff', fontSize: '14px',
    outline: 'none', marginBottom: '16px',
  },
  saveBtn: {
    width: '100%', padding: '16px', borderRadius: '14px',
    border: 'none', fontSize: '16px', fontWeight: '700',
    marginBottom: '20px', transition: 'all 0.2s',
  },
  numpad: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
  },
  numKey: {
    padding: '18px', borderRadius: '12px',
    border: '1px solid #2a2f45', color: '#fff',
    fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
  },
};