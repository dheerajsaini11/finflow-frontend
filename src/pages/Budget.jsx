import { useState, useEffect } from 'react';
import { getCategories, getBudgetSummary, setBudget, getDashboard } from '../services/api';
import toast from 'react-hot-toast';

export default function Budget() {
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [budgetInputs, setBudgetInputs] = useState({});

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, sumRes, dashRes] = await Promise.all([
        getCategories({ type: 'expense' }),
        getBudgetSummary({ month, year }),
        getDashboard(),
      ]);
      setCategories(catRes.data.categories);
      setSummary(sumRes.data.summary);
      setDashboard(dashRes.data);

      // Pre-fill budget inputs from DB
      const inputs = {};
      sumRes.data.summary.forEach(s => {
        inputs[s.category_id] = s.budget_amount;
      });
      setBudgetInputs(inputs);
    } catch (err) {
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async (categoryId) => {
    const amount = budgetInputs[categoryId];
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSavingId(categoryId);
    try {
      await setBudget({ category_id: categoryId, amount: Number(amount), month, year });
      toast.success('Budget saved ✅');
      // Refresh summary
      const res = await getBudgetSummary({ month, year });
      setSummary(res.data.summary);
    } catch (err) {
      toast.error('Failed to save budget');
    } finally {
      setSavingId(null);
    }
  };

  const formatAmount = (val) =>
    '₹' + Number(val || 0).toLocaleString('en-IN');

  const currentMonthData = dashboard?.currentMonth || {};

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = now.getDate();
  const totalBudget = summary.reduce((s, b) => s + Number(b.budget_amount), 0);
  const totalSpent = summary.reduce((s, b) => s + Number(b.spent_amount), 0);

  const safeToSpend = totalBudget > 0
    ? Math.max(0, totalBudget - totalSpent)
    : 0;

  // Merge categories with summary
  const categoryBudgets = categories.map(cat => {
    const budgetData = summary.find(s => s.category_id === cat.id);
    return {
      ...cat,
      budget_amount: budgetData?.budget_amount || 0,
      spent_amount: budgetData?.spent_amount || 0,
      budget_id: budgetData?.id || null,
    };
  });

  if (loading) {
    return <div style={styles.loading}>Loading budget...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Budget Planner</div>
        <div style={styles.subtitle}>
          {now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Safe to Spend */}
      <div style={styles.safeCard}>
        <div style={styles.safeLabel}>SAFE TO SPEND</div>
        <div style={styles.safeAmount}>{formatAmount(safeToSpend)}</div>
        <div style={styles.safeSub}>Remaining from total budget</div>
        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%`,
            background: totalSpent > totalBudget ? '#ff4757' : '#00f5a0',
          }} />
        </div>
        <div style={styles.safeSub}>
          {totalBudget > 0
            ? `${formatAmount(totalSpent)} spent of ${formatAmount(totalBudget)} budget`
            : 'Set budgets below to track spending'}
        </div>
      </div>

      {/* Overspent Alert */}
      {totalBudget > 0 && totalSpent > totalBudget && (
        <div style={styles.alertCard}>
          <span>⚠️</span>
          <span>
            You have exceeded your budget by{' '}
            {formatAmount(totalSpent - totalBudget)} this month.
          </span>
        </div>
      )}

      {/* Category Budgets */}
      <div style={styles.sectionTitle}>Set Category Budgets</div>

      {categoryBudgets.map(cat => {
        const budget = Number(cat.budget_amount);
        const spent = Number(cat.spent_amount);
        const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
        const isOver = spent > budget && budget > 0;

        return (
          <div key={cat.id} style={styles.catCard}>
            <div style={styles.catTop}>
              <div style={styles.catLeft}>
                <div style={{
                  ...styles.catIcon,
                  background: cat.color + '22',
                }}>
                  {cat.icon}
                </div>
                <div>
                  <div style={styles.catName}>{cat.name}</div>
                  <div style={{
                    ...styles.catStatus,
                    color: budget === 0 ? '#8892b0' : isOver ? '#ff4757' : '#00f5a0',
                  }}>
                    {budget === 0
                      ? 'No budget set'
                      : isOver
                        ? `Overspent by ${formatAmount(spent - budget)}`
                        : `${formatAmount(budget - spent)} remaining`}
                  </div>
                </div>
              </div>

              <div style={styles.catRight}>
                <div style={styles.spentLabel}>
                  {formatAmount(spent)} spent
                </div>
              </div>
            </div>

            {/* Budget Input Row */}
            <div style={styles.inputRow}>
              <input
                type="number"
                placeholder="Set budget amount"
                value={budgetInputs[cat.id] || ''}
                onChange={e => setBudgetInputs({
                  ...budgetInputs,
                  [cat.id]: e.target.value
                })}
                style={styles.budgetInput}
              />
              <button
                onClick={() => handleSaveBudget(cat.id)}
                disabled={savingId === cat.id}
                style={styles.saveBtn}
              >
                {savingId === cat.id ? '...' : 'Save'}
              </button>
            </div>

            {/* Progress Bar */}
            {budget > 0 && (
              <div style={styles.catProgress}>
                <div style={{
                  ...styles.catProgressFill,
                  width: `${pct}%`,
                  background: isOver ? '#ff4757' : cat.color,
                }} />
              </div>
            )}
          </div>
        );
      })}

      {/* Tip */}
      <div style={styles.tipCard}>
        <span style={styles.tipIcon}>💡</span>
        <div>
          <div style={styles.tipTitle}>Pro Tip</div>
          <div style={styles.tipText}>
            Reducing your top expense category by 10% could save you{' '}
            {formatAmount((currentMonthData.expense || 0) * 0.1 * 12)} per year.
          </div>
        </div>
      </div>

      <div style={{ height: '20px' }} />
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', color: '#00f5a0' },
  header: { marginBottom: '20px', paddingTop: '10px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: '13px', color: '#8892b0', marginTop: '4px' },
  safeCard: {
    background: 'linear-gradient(135deg, #1a1f35, #0d1526)',
    borderRadius: '16px', padding: '24px', marginBottom: '16px',
    border: '1px solid #00f5a044',
  },
  safeLabel: { fontSize: '11px', color: '#00f5a0', fontWeight: '700', letterSpacing: '1px', marginBottom: '8px' },
  safeAmount: { fontSize: '42px', fontWeight: '700', color: '#fff', marginBottom: '4px' },
  safeSub: { fontSize: '12px', color: '#8892b0', marginBottom: '12px' },
  progressBar: { height: '6px', background: '#2a2f45', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' },
  progressFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
  alertCard: {
    background: '#ff475722', border: '1px solid #ff475744',
    borderRadius: '12px', padding: '14px', marginBottom: '16px',
    display: 'flex', gap: '10px', fontSize: '13px', color: '#ff4757',
  },
  sectionTitle: { fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '12px' },
  catCard: {
    background: '#1a1f35', borderRadius: '14px', padding: '16px',
    marginBottom: '10px', border: '1px solid #2a2f45',
  },
  catTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  catLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  catIcon: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
  catName: { fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '2px' },
  catStatus: { fontSize: '12px' },
  catRight: { textAlign: 'right' },
  spentLabel: { fontSize: '13px', color: '#8892b0', fontWeight: '500' },
  inputRow: { display: 'flex', gap: '8px', marginBottom: '10px' },
  budgetInput: {
    flex: 1, padding: '10px 12px', background: '#0a0e1a',
    border: '1px solid #2a2f45', borderRadius: '10px',
    color: '#fff', fontSize: '14px', outline: 'none',
  },
  saveBtn: {
    padding: '10px 16px', background: '#00f5a022',
    border: '1px solid #00f5a044', borderRadius: '10px',
    color: '#00f5a0', fontSize: '13px', fontWeight: '700',
    cursor: 'pointer',
  },
  catProgress: { height: '4px', background: '#2a2f45', borderRadius: '2px', overflow: 'hidden' },
  catProgressFill: { height: '100%', borderRadius: '2px', transition: 'width 0.5s' },
  tipCard: {
    background: '#1a1f35', borderRadius: '14px', padding: '16px',
    marginTop: '8px', border: '1px solid #2a2f45',
    display: 'flex', gap: '12px', alignItems: 'flex-start',
  },
  tipIcon: { fontSize: '20px' },
  tipTitle: { fontSize: '13px', fontWeight: '700', color: '#ffa502', marginBottom: '4px' },
  tipText: { fontSize: '13px', color: '#8892b0', lineHeight: '1.5' },
};