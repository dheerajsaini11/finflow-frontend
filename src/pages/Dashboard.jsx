import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await getDashboard();
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  };

  const getHealthLabel = (score) => {
    if (score >= 80) return { label: 'Excellent', color: '#00f5a0' };
    if (score >= 60) return { label: 'Good', color: '#fdcb6e' };
    if (score >= 40) return { label: 'Fair', color: '#e17055' };
    return { label: 'Poor', color: '#ff4757' };
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>Loading your finances...</div>
      </div>
    );
  }

  const health = getHealthLabel(data?.healthScore || 0);
  const summary = data?.currentMonth || {};
  const last = data?.lastMonth || {};

  const incomeChange = last.income > 0
    ? (((summary.income - last.income) / last.income) * 100).toFixed(1)
    : 0;
  const expenseChange = last.expense > 0
    ? (((summary.expense - last.expense) / last.expense) * 100).toFixed(1)
    : 0;

  const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
  };  

  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.greeting}>{getGreeting()} 👋</div>
          <div style={styles.userName}>{user?.name}</div>
        </div>
        <div style={styles.menuHint}>Tap ··· for more options</div>
      </div>

      {/* Summary Cards */}
      <div style={styles.cardsRow}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>TOTAL INCOME</div>
          <div style={{ ...styles.cardAmount, color: '#00f5a0' }}>
            {formatAmount(summary.income)}
          </div>
          <div style={{
            ...styles.cardChange,
            color: incomeChange >= 0 ? '#00f5a0' : '#ff4757'
          }}>
            {incomeChange >= 0 ? '↑' : '↓'} {Math.abs(incomeChange)}% vs last month
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>TOTAL EXPENSE</div>
          <div style={{ ...styles.cardAmount, color: '#ff4757' }}>
            {formatAmount(summary.expense)}
          </div>
          <div style={{
            ...styles.cardChange,
            color: expenseChange <= 0 ? '#00f5a0' : '#ff4757'
          }}>
            {expenseChange >= 0 ? '↑' : '↓'} {Math.abs(expenseChange)}% vs last month
          </div>
        </div>
      </div>

      {/* Second row cards */}
      <div style={styles.cardsRow}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>INVESTMENT</div>
          <div style={{ ...styles.cardAmount, color: '#6c5ce7' }}>
            {formatAmount(summary.investment)}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>NET SAVINGS</div>
          <div style={{
            ...styles.cardAmount,
            color: summary.net >= 0 ? '#00f5a0' : '#ff4757'
          }}>
            {formatAmount(summary.net)}
          </div>
        </div>
      </div>

      {/* Health Score */}
      <div style={styles.healthCard}>
        <div style={styles.healthCircle}>
          <svg viewBox="0 0 100 100" style={{ width: '100px', height: '100px' }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#2a2f45" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke={health.color} strokeWidth="8"
              strokeDasharray={`${(data?.healthScore || 0) * 2.51} 251`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="45" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold">
              {data?.healthScore || 0}
            </text>
            <text x="50" y="62" textAnchor="middle" fill={health.color} fontSize="9">
              {health.label.toUpperCase()}
            </text>
          </svg>
        </div>
        <div style={styles.healthInfo}>
          <div style={styles.healthTitle}>Financial Health Score</div>
          <div style={styles.healthSub}>
            Burn Rate: {formatAmount(data?.burnRate)}/day
          </div>
          <div style={styles.healthSub}>
            Projected: {formatAmount(data?.projectedExpense)} this month
          </div>
        </div>
      </div>

      {/* Budget Utilization */}
      <div style={styles.budgetCard}>
        <div style={styles.budgetHeader}>
          <span style={styles.sectionTitle}>BUDGET UTILIZATION</span>
          <span style={styles.budgetPercent}>
            {data?.budgetUtilization?.budgetProgress || 0}%
          </span>
        </div>
        {data?.budgetUtilization?.isOverPacing && (
          <div style={styles.overPacingBadge}>OVER-PACING</div>
        )}
        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${Math.min(data?.budgetUtilization?.budgetProgress || 0, 100)}%`,
            background: data?.budgetUtilization?.isOverPacing
              ? '#ff4757' : '#00f5a0'
          }} />
        </div>
        <div style={styles.budgetSub}>
          {data?.budgetUtilization?.budgetProgress || 0}% budget used,{' '}
          {data?.budgetUtilization?.monthProgress || 0}% of month passed
        </div>
      </div>

      {/* Recent Activity */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>Recent Activity</span>
          <span
            style={styles.viewAll}
            onClick={() => navigate('/transactions')}
          >
            VIEW ALL
          </span>
        </div>

        {data?.recentTransactions?.length === 0 && (
          <div style={styles.empty}>No transactions yet. Add your first one! 💰</div>
        )}

        {data?.recentTransactions?.map(tx => (
          <div key={tx.id} style={styles.txRow}>
            <div style={{
              ...styles.txIcon,
              background: tx.category_color + '22',
            }}>
              {tx.category_icon || '💳'}
            </div>
            <div style={styles.txInfo}>
              <div style={styles.txName}>{tx.category_name || tx.type}</div>
              <div style={styles.txDate}>
                {new Date(tx.date).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short'
                })}
                {tx.note ? ` • ${tx.note}` : ''}
              </div>
            </div>
            <div style={{
              ...styles.txAmount,
              color: tx.type === 'income' ? '#00f5a0' :
                tx.type === 'investment' ? '#6c5ce7' : '#ff4757'
            }}>
              {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
            </div>
          </div>
        ))}
      </div>

      {/* Who Owes Me */}
      {data?.debtors?.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>WHO OWES ME</span>
            <span style={styles.viewAll} onClick={() => navigate('/lend')}>
              VIEW ALL
            </span>
          </div>
          {data.debtors.map((d, i) => (
            <div key={i} style={styles.debtorRow}>
              <div style={styles.debtorAvatar}>
                {d.person_name?.charAt(0).toUpperCase()}
              </div>
              <div style={styles.debtorName}>{d.person_name}</div>
              <div style={styles.debtorAmount}>{formatAmount(d.balance)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: '20px' }} />
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a' },
  loadingText: { color: '#00f5a0', fontSize: '16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '10px' },
  greeting: { fontSize: '13px', color: '#8892b0' },
  userName: { fontSize: '22px', fontWeight: '700', color: '#fff' },
  logoutBtn: { background: 'transparent', border: '1px solid #2a2f45', color: '#8892b0', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  cardsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' },
  card: { background: '#1a1f35', borderRadius: '16px', padding: '16px', border: '1px solid #2a2f45' },
  cardLabel: { fontSize: '10px', color: '#8892b0', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' },
  cardAmount: { fontSize: '20px', fontWeight: '700', marginBottom: '6px' },
  cardChange: { fontSize: '11px' },
  healthCard: { background: '#1a1f35', borderRadius: '16px', padding: '20px', border: '1px solid #2a2f45', display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px' },
  healthCircle: {},
  healthInfo: { flex: 1 },
  healthTitle: { fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  healthSub: { fontSize: '12px', color: '#8892b0', marginBottom: '4px' },
  budgetCard: { background: '#1a1f35', borderRadius: '16px', padding: '20px', border: '1px solid #2a2f45', marginBottom: '24px' },
  budgetHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  budgetPercent: { color: '#fff', fontWeight: '600' },
  overPacingBadge: { display: 'inline-block', background: '#ff475722', color: '#ff4757', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', marginBottom: '8px' },
  progressBar: { height: '8px', background: '#2a2f45', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' },
  progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' },
  budgetSub: { fontSize: '12px', color: '#8892b0' },
  section: { marginBottom: '24px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  sectionTitle: { fontSize: '16px', fontWeight: '700', color: '#fff' },
  viewAll: { fontSize: '12px', color: '#00f5a0', fontWeight: '600', cursor: 'pointer' },
  empty: { color: '#8892b0', fontSize: '14px', textAlign: 'center', padding: '20px' },
  txRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #1a1f35' },
  txIcon: { width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 },
  txInfo: { flex: 1 },
  txName: { fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '3px' },
  txDate: { fontSize: '12px', color: '#8892b0' },
  txAmount: { fontSize: '15px', fontWeight: '700' },
  debtorRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #1a1f35' },
  debtorAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#2a2f45', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00f5a0', fontWeight: '700', fontSize: '14px' },
  debtorName: { flex: 1, fontSize: '14px', color: '#fff', fontWeight: '500' },
  debtorAmount: { fontSize: '14px', fontWeight: '700', color: '#ffa502' },
  menuHint: { fontSize: '12px', color: '#8892b0' },
};