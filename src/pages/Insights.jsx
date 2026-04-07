import { useState, useEffect } from 'react';
import { getDashboard, getMonthlySummary, getTransactions } from '../services/api';
import toast from 'react-hot-toast';

export default function Insights() {
  const [dashboard, setDashboard] = useState(null);
  const [lastMonth, setLastMonth] = useState(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const lastMonthNum = month === 1 ? 12 : month - 1;
  const lastMonthYear = month === 1 ? year - 1 : year;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, lastRes] = await Promise.all([
        getDashboard(),
        getMonthlySummary({ month: lastMonthNum, year: lastMonthYear }),
      ]);
      setDashboard(dashRes.data);
      setLastMonth(lastRes.data.summary);
    } catch (err) {
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (val) =>
    '₹' + Number(val || 0).toLocaleString('en-IN');

  if (loading) {
    return <div style={styles.loading}>Loading insights...</div>;
  }

  const current = dashboard?.currentMonth || {};
  const last = lastMonth || {};
  const health = dashboard?.healthScore || 0;

  const expenseChange = last.expense > 0
    ? (((current.expense - last.expense) / last.expense) * 100).toFixed(1)
    : 0;

  const savingsRate = current.income > 0
    ? (((current.income - current.expense) / current.income) * 100).toFixed(1)
    : 0;

  const getHealthColor = (score) => {
    if (score >= 80) return '#00f5a0';
    if (score >= 60) return '#fdcb6e';
    if (score >= 40) return '#e17055';
    return '#ff4757';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Insights</div>
        <div style={styles.subtitle}>AI-driven financial intelligence</div>
      </div>

      {/* Spend Forecast */}
      <div style={styles.forecastCard}>
        <div style={styles.forecastLabel}>
          SPEND FORECAST <span style={styles.predictedBadge}>PREDICTED</span>
        </div>
        <div style={styles.forecastAmount}>
          {formatAmount(dashboard?.projectedExpense)}
          <span style={styles.forecastSub}> this month</span>
        </div>
        <div style={styles.forecastBar}>
          <div style={{
            ...styles.forecastFill,
            width: `${Math.min((current.expense / (dashboard?.projectedExpense || 1)) * 100, 100)}%`,
          }} />
        </div>
        <div style={styles.forecastCurrent}>
          {formatAmount(current.expense)} current
        </div>
      </div>

      {/* Burn Rate + Savings Rate */}
      <div style={styles.twoCol}>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>⚡</div>
          <div style={styles.metricLabel}>BURN RATE</div>
          <div style={styles.metricValue}>
            {formatAmount(dashboard?.burnRate)}<span style={styles.metricUnit}>/day</span>
          </div>
          <div style={styles.metricSub}>
            Remaining: {formatAmount(current.income - current.expense)}
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>🐷</div>
          <div style={styles.metricLabel}>SAVINGS RATE</div>
          <div style={{
            ...styles.metricValue,
            color: Number(savingsRate) >= 20 ? '#00f5a0' : '#ff4757',
          }}>
            {savingsRate}%
          </div>
          <div style={styles.metricSub}>Avg industry: 20%</div>
        </div>
      </div>

      {/* Health Score */}
      <div style={styles.healthCard}>
        <div style={styles.healthLeft}>
          <div style={styles.healthLabel}>FINANCIAL HEALTH</div>
          <div style={{
            ...styles.healthScore,
            color: getHealthColor(health),
          }}>
            {health}
            <span style={styles.healthMax}>/100</span>
          </div>
          <div style={styles.healthBar}>
            <div style={{
              ...styles.healthFill,
              width: `${health}%`,
              background: getHealthColor(health),
            }} />
          </div>
        </div>
      </div>

      {/* Expense Change Alert */}
      {Number(expenseChange) !== 0 && (
        <div style={{
          ...styles.alertCard,
          background: Number(expenseChange) > 0 ? '#ff475722' : '#00f5a022',
          borderColor: Number(expenseChange) > 0 ? '#ff475744' : '#00f5a044',
        }}>
          <div style={styles.alertIcon}>
            {Number(expenseChange) > 0 ? '⚠️' : '✅'}
          </div>
          <div>
            <div style={styles.alertTitle}>AI Observation</div>
            <div style={styles.alertText}>
              You spent{' '}
              <span style={{
                fontWeight: '700',
                color: Number(expenseChange) > 0 ? '#ff4757' : '#00f5a0',
              }}>
                {Math.abs(expenseChange)}% {Number(expenseChange) > 0 ? 'more' : 'less'}
              </span>
              {' '}on expenses vs last month.
            </div>
            <div style={styles.alertSub}>
              Last month: {formatAmount(last.expense)} →
              This month: {formatAmount(current.expense)}
            </div>
          </div>
        </div>
      )}

      {/* Unusual Spend */}
      {dashboard?.projectedExpense > current.income && current.income > 0 && (
        <div style={styles.dangerCard}>
          <div style={styles.dangerIcon}>🚨</div>
          <div>
            <div style={styles.dangerTitle}>Unusual Spend Alert</div>
            <div style={styles.dangerText}>
              At current pace, your expenses will exceed income by{' '}
              {formatAmount(dashboard.projectedExpense - current.income)} this month.
            </div>
          </div>
        </div>
      )}

      {/* Potential Savings */}
      <div style={styles.savingsCard}>
        <div style={styles.savingsHeader}>
          <span>💡</span>
          <span style={styles.savingsLabel}>PRO OPTIMIZATION</span>
        </div>
        <div style={styles.savingsTitle}>Potential Savings</div>
        <div style={styles.savingsText}>
          If you reduce expenses by{' '}
          <span style={styles.highlight}>
            {formatAmount(current.expense * 0.1)}/month
          </span>
          , you save{' '}
          <span style={styles.highlight}>
            {formatAmount(current.expense * 0.1 * 12)}/year
          </span>.
        </div>
      </div>

      {/* Investment Tip */}
      <div style={styles.investCard}>
        <div style={styles.investIcon}>📈</div>
        <div>
          <div style={styles.investTitle}>Investment Insight</div>
          <div style={styles.investText}>
            {current.investment > 0
              ? `Great job! You invested ${formatAmount(current.investment)} this month. Keep it up!`
              : `You haven't invested this month. Consider starting a SIP for long-term wealth.`}
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
  forecastCard: {
    background: 'linear-gradient(135deg, #1a2a6a, #0d1526)',
    borderRadius: '16px', padding: '24px', marginBottom: '16px',
    border: '1px solid #2a4a9a',
  },
  forecastLabel: { fontSize: '11px', color: '#8892b0', fontWeight: '600', letterSpacing: '1px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
  predictedBadge: { background: '#2a4a9a', color: '#8892b0', padding: '2px 8px', borderRadius: '10px', fontSize: '10px' },
  forecastAmount: { fontSize: '36px', fontWeight: '700', color: '#fff', marginBottom: '12px' },
  forecastSub: { fontSize: '16px', color: '#8892b0', fontWeight: '400' },
  forecastBar: { height: '6px', background: '#2a2f45', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' },
  forecastFill: { height: '100%', background: '#fff', borderRadius: '3px' },
  forecastCurrent: { fontSize: '12px', color: '#8892b0' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' },
  metricCard: { background: '#1a1f35', borderRadius: '14px', padding: '16px', border: '1px solid #2a2f45' },
  metricIcon: { fontSize: '20px', marginBottom: '8px' },
  metricLabel: { fontSize: '10px', color: '#8892b0', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '6px' },
  metricValue: { fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '4px' },
  metricUnit: { fontSize: '12px', color: '#8892b0', fontWeight: '400' },
  metricSub: { fontSize: '11px', color: '#8892b0' },
  healthCard: { background: '#1a1f35', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid #2a2f45' },
  healthLeft: {},
  healthLabel: { fontSize: '11px', color: '#8892b0', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px' },
  healthScore: { fontSize: '42px', fontWeight: '700', marginBottom: '12px' },
  healthMax: { fontSize: '20px', color: '#8892b0', fontWeight: '400' },
  healthBar: { height: '8px', background: '#2a2f45', borderRadius: '4px', overflow: 'hidden' },
  healthFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s' },
  alertCard: { borderRadius: '14px', padding: '16px', marginBottom: '16px', border: '1px solid', display: 'flex', gap: '12px', alignItems: 'flex-start' },
  alertIcon: { fontSize: '20px', flexShrink: 0 },
  alertTitle: { fontSize: '12px', fontWeight: '700', color: '#8892b0', marginBottom: '4px' },
  alertText: { fontSize: '15px', color: '#fff', marginBottom: '4px' },
  alertSub: { fontSize: '12px', color: '#8892b0' },
  dangerCard: { background: '#ff475722', border: '1px solid #ff475744', borderRadius: '14px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' },
  dangerIcon: { fontSize: '20px' },
  dangerTitle: { fontSize: '14px', fontWeight: '700', color: '#ff4757', marginBottom: '4px' },
  dangerText: { fontSize: '13px', color: '#ff9f9f' },
  savingsCard: { background: '#1a1f35', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid #2a2f45' },
  savingsHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  savingsLabel: { fontSize: '11px', color: '#ffa502', fontWeight: '700', letterSpacing: '0.5px' },
  savingsTitle: { fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  savingsText: { fontSize: '14px', color: '#8892b0', lineHeight: '1.6' },
  highlight: { color: '#00f5a0', fontWeight: '700' },
  investCard: { background: '#1a1f35', borderRadius: '14px', padding: '16px', border: '1px solid #2a2f45', display: 'flex', gap: '12px', alignItems: 'flex-start' },
  investIcon: { fontSize: '24px' },
  investTitle: { fontSize: '14px', fontWeight: '700', color: '#6c5ce7', marginBottom: '4px' },
  investText: { fontSize: '13px', color: '#8892b0', lineHeight: '1.5' },
};