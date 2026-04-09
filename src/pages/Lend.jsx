import { useState, useEffect } from 'react';
import { getLendBalances, getPersonTransactions, settlePerson, addTransaction } from '../services/api';
import toast from 'react-hot-toast';

export default function Lend() {
  const [balances, setBalances] = useState([]);
  const [selected, setSelected] = useState(null);
  const [personTxs, setPersonTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New state for Partial Returns
  const [returnMode, setReturnMode] = useState(null);
  const [returnAmount, setReturnAmount] = useState('');

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      const res = await getLendBalances();
      setBalances(res.data.balances);
    } catch (err) {
      toast.error('Failed to load lend data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonTxs = async (name) => {
    try {
      const res = await getPersonTransactions(encodeURIComponent(name));
      setPersonTxs(res.data.transactions);
      setSelected(name);
      setReturnMode(null); // Reset partial return UI if open
    } catch (err) {
      toast.error('Failed to load transactions');
    }
  };

  const handleSettle = async (name) => {
    if (!window.confirm(`Mark ${name} as fully settled?`)) return;
    try {
      await settlePerson(encodeURIComponent(name));
      toast.success(`${name} settled ✅`);
      fetchBalances();
      setSelected(null);
    } catch (err) {
      toast.error('Failed to settle');
    }
  };

  // --- NEW: Partial Return Logic ---
  const handlePartialReturn = async (personName) => {
    if (!returnAmount || Number(returnAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      // Create a standard 'return' transaction
      await addTransaction({
        type: 'return',
        amount: Number(returnAmount),
        person_name: personName,
        date: new Date().toISOString().split('T')[0], // Today's date
        note: 'Partial Return'
      });
      
      toast.success(`Logged ₹${returnAmount} return from ${personName}`);
      setReturnAmount('');
      setReturnMode(null);
      
      // Refresh the UI
      fetchBalances();
      fetchPersonTxs(personName);
    } catch (err) {
      toast.error('Failed to log partial return');
    }
  };

  const formatAmount = (val) =>
    '₹' + Number(val || 0).toLocaleString('en-IN');

  const totalLent = balances.reduce((s, b) => s + Math.max(Number(b.balance), 0), 0);
  const totalOwed = balances.reduce((s, b) => s + Math.min(Number(b.balance), 0), 0);

  if (loading) {
    return <div style={styles.loading}>Loading lend data...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Lend & Return</div>
      </div>

      {/* Summary Card */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryTitle}>TOTAL NET BALANCE</div>
        <div style={styles.summaryAmount}>
          {formatAmount(totalLent + totalOwed)}
        </div>
        <div style={styles.summaryRow}>
          <div>
            <div style={styles.summaryLabel}>Total Lent</div>
            <div style={{ ...styles.summaryVal, color: '#ffa502' }}>
              {formatAmount(totalLent)}
            </div>
          </div>
          <div>
            <div style={styles.summaryLabel}>Total Owed</div>
            <div style={{ ...styles.summaryVal, color: '#ff4757' }}>
              {formatAmount(Math.abs(totalOwed))}
            </div>
          </div>
        </div>
      </div>

      {/* Person List */}
      <div style={styles.sectionTitle}>Active Counterparties</div>

      {balances.length === 0 ? (
        <div style={styles.empty}>
          No lend/return entries yet.{'\n'}
          Add one from Quick Entry! 🤝
        </div>
      ) : (
        balances.map((b, i) => {
          const balance = Number(b.balance);
          const isSettled = balance === 0;
          const isExpanded = selected === b.person_name;

          return (
            <div key={i} style={{
              ...styles.personCard,
              borderColor: isSettled ? '#2a2f45' : balance > 0 ? '#ffa50244' : '#ff475744',
            }}>
              <div
                style={styles.personHeader}
                onClick={() => isExpanded ? setSelected(null) : fetchPersonTxs(b.person_name)}
              >
                <div style={styles.personLeft}>
                  <div style={{
                    ...styles.avatar,
                    background: isSettled ? '#2a2f45' : balance > 0 ? '#ffa50222' : '#ff475722',
                    color: isSettled ? '#8892b0' : balance > 0 ? '#ffa502' : '#ff4757',
                  }}>
                    {b.person_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={styles.personName}>{b.person_name}</div>
                    {isSettled ? (
                      <div style={styles.settledBadge}>SETTLED</div>
                    ) : (
                      <div style={{
                        ...styles.personBalance,
                        color: balance > 0 ? '#ffa502' : '#ff4757',
                      }}>
                        {balance > 0 ? 'Owes you' : 'You owe'} {formatAmount(Math.abs(balance))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.chevron}>{isExpanded ? '▲' : '▼'}</div>
              </div>

              {/* Expanded Transactions */}
              {isExpanded && (
                <div style={styles.expanded}>
                  {personTxs.map((tx, j) => (
                    <div key={j} style={styles.txRow}>
                      <div style={{
                        ...styles.txDot,
                        background: tx.type === 'lend' ? '#ffa502' : '#00f5a0',
                      }} />
                      <div style={styles.txInfo}>
                        <div style={styles.txType}>
                          {tx.type === 'lend' ? 'Lent' : 'Returned'}
                        </div>
                        <div style={styles.txDate}>
                          {new Date(tx.date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div style={{
                        ...styles.txAmount,
                        color: tx.type === 'lend' ? '#ffa502' : '#00f5a0',
                      }}>
                        {tx.type === 'lend' ? '+' : '-'}{formatAmount(tx.amount)}
                      </div>
                    </div>
                  ))}

                  {/* Action Buttons (Matches UI Design structure) */}
                  {!isSettled && (
                    <div style={styles.actionRow}>
                      {returnMode === b.person_name ? (
                        // Inline Input Form for Partial Return
                        <div style={styles.returnForm}>
                          <input
                            type="number"
                            value={returnAmount}
                            onChange={(e) => setReturnAmount(e.target.value)}
                            placeholder="Enter amount..."
                            style={styles.returnInput}
                            autoFocus
                          />
                          <button onClick={() => handlePartialReturn(b.person_name)} style={styles.confirmBtn}>
                            Save
                          </button>
                          <button onClick={() => setReturnMode(null)} style={styles.cancelBtn}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        // Standard 2-Button Row
                        <>
                          <button
                            onClick={() => setReturnMode(b.person_name)}
                            style={styles.returnBtn}
                          >
                            💵 PARTIAL RETURN
                          </button>
                          <button
                            onClick={() => handleSettle(b.person_name)}
                            style={styles.settleBtnHalf}
                          >
                            ✅ SETTLE
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Insight */}
      {balances.filter(b => Number(b.balance) > 0).length > 0 && (
        <div style={styles.insightCard}>
          <span>💡</span>
          <span>
            You have {balances.filter(b => Number(b.balance) > 0).length} outstanding
            debts to collect totalling {formatAmount(totalLent)}.
          </span>
        </div>
      )}

      <div style={{ height: '20px' }} />
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh', paddingBottom: '80px' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', color: '#00f5a0' },
  header: { marginBottom: '20px', paddingTop: '10px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  summaryCard: {
    background: 'linear-gradient(135deg, #1a2a4a, #0d1526)',
    borderRadius: '16px', padding: '24px', marginBottom: '24px',
    border: '1px solid #2a4a7a',
  },
  summaryTitle: { fontSize: '11px', color: '#8892b0', fontWeight: '600', letterSpacing: '1px', marginBottom: '8px' },
  summaryAmount: { fontSize: '36px', fontWeight: '700', color: '#fff', marginBottom: '16px' },
  summaryRow: { display: 'flex', gap: '40px' },
  summaryLabel: { fontSize: '12px', color: '#8892b0', marginBottom: '4px' },
  summaryVal: { fontSize: '18px', fontWeight: '700' },
  sectionTitle: { fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '12px' },
  empty: { color: '#8892b0', textAlign: 'center', padding: '40px', whiteSpace: 'pre-line', fontSize: '15px' },
  personCard: {
    background: '#1a1f35', borderRadius: '14px', marginBottom: '10px',
    border: '1px solid', overflow: 'hidden',
  },
  personHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px', cursor: 'pointer',
  },
  personLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: {
    width: '40px', height: '40px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '16px',
  },
  personName: { fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '3px' },
  settledBadge: {
    fontSize: '10px', fontWeight: '700', color: '#00f5a0',
    background: '#00f5a022', padding: '2px 8px', borderRadius: '10px', display: 'inline-block',
  },
  personBalance: { fontSize: '12px', fontWeight: '600' },
  chevron: { color: '#8892b0', fontSize: '12px' },
  expanded: { padding: '0 16px 16px', borderTop: '1px solid #2a2f45' },
  txRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #2a2f4522' },
  txDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  txInfo: { flex: 1 },
  txType: { fontSize: '13px', fontWeight: '600', color: '#fff' },
  txDate: { fontSize: '11px', color: '#8892b0' },
  txAmount: { fontSize: '14px', fontWeight: '700' },
  
  // --- NEW: Action Buttons & Form Styles ---
  actionRow: { display: 'flex', gap: '10px', marginTop: '16px' },
  returnBtn: { 
    flex: 1, padding: '12px', background: '#2a2f45', border: 'none', 
    borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' 
  },
  settleBtnHalf: { 
    flex: 1, padding: '12px', background: '#00f5a022', border: '1px solid #00f5a044', 
    borderRadius: '10px', color: '#00f5a0', fontSize: '13px', fontWeight: '600', cursor: 'pointer' 
  },
  returnForm: { display: 'flex', gap: '8px', width: '100%' },
  returnInput: { 
    flex: 1, padding: '10px 12px', background: '#0a0e1a', border: '1px solid #2a2f45', 
    borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' 
  },
  confirmBtn: { padding: '0 16px', background: '#00f5a0', border: 'none', borderRadius: '8px', color: '#0a0e1a', fontWeight: '700', cursor: 'pointer' },
  cancelBtn: { padding: '0 16px', background: '#ff475722', border: '1px solid #ff475744', borderRadius: '8px', color: '#ff4757', fontWeight: '700', cursor: 'pointer' },

  insightCard: {
    background: '#ffa50222', border: '1px solid #ffa50244',
    borderRadius: '12px', padding: '14px', marginTop: '8px',
    display: 'flex', gap: '10px', alignItems: 'flex-start',
    fontSize: '13px', color: '#ffa502',
  },
};