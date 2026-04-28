import { useState, useEffect } from 'react';
import { getLendBalances, getPersonTransactions, settlePerson, addTransaction, deleteSettledPerson } from '../services/api';
import toast from 'react-hot-toast';

export default function Lend() {
  const [balances, setBalances] = useState([]);
  const [selected, setSelected] = useState(null);
  const [personTxs, setPersonTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI Tabs
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'settled'

  // Partial Return
  const [returnMode, setReturnMode] = useState(null);
  const [returnAmount, setReturnAmount] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);

  // Bulk Delete
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedToDelete, setSelectedToDelete] = useState([]);

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
      setReturnMode(null);
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

  const handlePartialReturn = async (personName) => {
    if (!returnAmount || Number(returnAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!returnDate) {
      toast.error('Please select a date');
      return;
    }

    // Determine direction: if balance < 0, you owe them → use 'borrow_return'
    // If balance > 0, they owe you → use 'return'
    const personBalance = balances.find(b => b.person_name === personName);
    const txType = personBalance && Number(personBalance.balance) < 0 ? 'borrow_return' : 'return';
    
    try {
      await addTransaction({
        type: txType,
        amount: Number(returnAmount),
        person_name: personName,
        date: returnDate,
        note: 'Partial Return'
      });
      
      toast.success(`Logged ₹${returnAmount} partial return for ${personName}`);
      setReturnAmount('');
      setReturnDate(new Date().toISOString().split('T')[0]);
      setReturnMode(null);
      
      fetchBalances();
      fetchPersonTxs(personName);
    } catch (err) {
      toast.error('Failed to log partial return');
    }
  };

  // --- Bulk Delete Logic ---
  const toggleSelect = (name) => {
    if (selectedToDelete.includes(name)) {
      setSelectedToDelete(prev => prev.filter(n => n !== name));
    } else {
      setSelectedToDelete(prev => [...prev, name]);
    }
  };

  const toggleSelectAll = (settledArr) => {
    if (selectedToDelete.length === settledArr.length) {
      setSelectedToDelete([]); // Deselect all
    } else {
      setSelectedToDelete(settledArr.map(b => b.person_name)); // Select all
    }
  };

  const handleBulkDelete = async () => {
    if (selectedToDelete.length === 0) return;
    if (!window.confirm(`Delete ${selectedToDelete.length} settled record(s)?\n(Transaction history will remain safe in the Transactions tab)`)) return;

    setLoading(true);
    try {
      await Promise.all(selectedToDelete.map(name => deleteSettledPerson(name)));
      toast.success(`Deleted ${selectedToDelete.length} settled record(s)`);
      setDeleteMode(false);
      setSelectedToDelete([]);
      fetchBalances();
    } catch (err) {
      toast.error('Failed to delete some records');
      setLoading(false);
    }
  };

  const formatAmount = (val) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const totalLent = balances.reduce((s, b) => s + Math.max(Number(b.balance), 0), 0);
  const totalOwed = balances.reduce((s, b) => s + Math.min(Number(b.balance), 0), 0);
  const netBalance = totalLent + totalOwed;

  const activeBalances = balances.filter(b => Number(b.balance) !== 0);
  const settledBalances = balances.filter(b => Number(b.balance) === 0);

  if (loading) {
    return <div style={styles.loading}>Loading data...</div>;
  }

  // Card Renderer
  const renderPersonCard = (b, i, isSettledSection = false) => {
    const balance = Number(b.balance);
    const isSettled = balance === 0;
    const isExpanded = selected === b.person_name;
    const isChecked = selectedToDelete.includes(b.person_name);

    return (
      <div key={i} style={{
        ...styles.personCard,
        borderColor: isSettled ? '#2a2f45' : balance > 0 ? '#ffa50244' : '#ff475744',
      }}>
        <div
          style={styles.personHeader}
          onClick={() => {
            if (deleteMode && isSettledSection) {
              toggleSelect(b.person_name);
            } else {
              isExpanded ? setSelected(null) : fetchPersonTxs(b.person_name);
            }
          }}
        >
          <div style={styles.personLeft}>
            {deleteMode && isSettledSection && (
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}} // Handled by parent onClick
                style={styles.checkbox}
              />
            )}
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
          <div style={styles.chevron}>
            {isExpanded && !deleteMode ? '▲' : (!deleteMode ? '▼' : '')}
          </div>
        </div>

        {isExpanded && !deleteMode && (
          <div style={styles.expanded}>
            {personTxs.map((tx, j) => (
              <div key={j} style={styles.txRow}>
                <div style={{
                  ...styles.txDot,
                  background: tx.type === 'lend' ? '#ffa502' : tx.type === 'borrow' ? '#ff4757' : '#00f5a0',
                }} />
                <div style={styles.txInfo}>
                  <div style={styles.txType}>
                    {tx.type === 'lend' ? 'Lent'
                      : tx.type === 'borrow' ? 'Borrowed'
                      : tx.type === 'borrow_return' ? 'You Returned'
                      : 'Returned'}
                  </div>
                  <div style={styles.txDate}>
                    {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div style={{
                  ...styles.txAmount,
                  color: tx.type === 'lend' ? '#ffa502' : tx.type === 'borrow' ? '#ff4757' : '#00f5a0',
                }}>
                  {(tx.type === 'lend' || tx.type === 'borrow') ? '+' : '-'}{formatAmount(tx.amount)}
                </div>
              </div>
            ))}

            {!isSettled && (
              <div style={styles.actionRow}>
                {returnMode === b.person_name ? (
                  <div style={styles.returnForm}>
                    <input
                      type="date"
                      value={returnDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setReturnDate(e.target.value)}
                      style={styles.returnDateInput}
                    />
                    <input
                      type="number"
                      value={returnAmount}
                      onChange={(e) => setReturnAmount(e.target.value)}
                      placeholder="Amount"
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
                  <>
                    <button onClick={() => setReturnMode(b.person_name)} style={styles.partialBtnStyle}>
                      💵 PARTIAL RETURN
                    </button>
                    <button onClick={() => handleSettle(b.person_name)} style={styles.settleBtnStyle}>
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
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Lend, Borrow & Return</div>
      </div>

      {/* --- NEW BLUE UI CARD --- */}
      <div style={styles.blueCard}>
        <div style={styles.blueCardTitle}>TOTAL NET BALANCE</div>
        <div style={styles.blueCardAmount}>
          {formatAmount(netBalance)}
        </div>
        <div style={styles.blueCardRow}>
          <div style={styles.blueCardInnerBox}>
            <div style={styles.blueCardLabel}>Total Lent</div>
            <div style={styles.blueCardVal}>{formatAmount(totalLent)}</div>
          </div>
          <div style={styles.blueCardInnerBox}>
            <div style={styles.blueCardLabel}>Total Owed</div>
            <div style={styles.blueCardVal}>{formatAmount(Math.abs(totalOwed))}</div>
          </div>
        </div>
      </div>

      {/* --- TABS --- */}
      <div style={styles.tabsContainer}>
        <button 
          style={{...styles.tabBtn, borderBottom: activeTab === 'active' ? '3px solid #fff' : '3px solid transparent', color: activeTab === 'active' ? '#fff' : '#8892b0'}}
          onClick={() => { setActiveTab('active'); setDeleteMode(false); }}
        >
          ACTIVE
        </button>
        <button 
          style={{...styles.tabBtn, borderBottom: activeTab === 'settled' ? '3px solid #fff' : '3px solid transparent', color: activeTab === 'settled' ? '#fff' : '#8892b0'}}
          onClick={() => setActiveTab('settled')}
        >
          SETTLED
        </button>
      </div>

      {/* --- TAB CONTENT --- */}
      <div style={{ marginTop: '20px' }}>
        
        {/* ACTIVE TAB */}
        {activeTab === 'active' && (
          <>
            {activeBalances.length === 0 ? (
              <div style={styles.empty}>No active debts.{'\n'}All settled up! 🤝</div>
            ) : (
              activeBalances.map((b, i) => renderPersonCard(b, i, false))
            )}

            {totalLent > 0 && (
              <div style={styles.insightCard}>
                <span>💡</span>
                <span>You have {activeBalances.filter(b => Number(b.balance) > 0).length} outstanding debts to collect totalling {formatAmount(totalLent)}.</span>
              </div>
            )}
            {totalOwed < 0 && (
              <div style={styles.insightCardBorrow}>
                <span>⚠️</span>
                <span>You owe money to {activeBalances.filter(b => Number(b.balance) < 0).length} people totalling {formatAmount(Math.abs(totalOwed))}.</span>
              </div>
            )}
          </>
        )}

        {/* SETTLED TAB */}
        {activeTab === 'settled' && (
          <>
            <div style={styles.settledHeader}>
              {!deleteMode ? (
                <button onClick={() => setDeleteMode(true)} style={styles.deleteModeBtn}>
                  🗑️ Delete Records
                </button>
              ) : (
                <div style={styles.deleteActions}>
                  <button onClick={() => toggleSelectAll(settledBalances)} style={styles.selectAllBtn}>
                    {selectedToDelete.length === settledBalances.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button 
                    onClick={handleBulkDelete} 
                    style={{ ...styles.confirmDeleteBtn, opacity: selectedToDelete.length === 0 ? 0.5 : 1 }}
                    disabled={selectedToDelete.length === 0}
                  >
                    Delete ({selectedToDelete.length})
                  </button>
                  <button onClick={() => { setDeleteMode(false); setSelectedToDelete([]); }} style={styles.cancelDeleteBtn}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {settledBalances.length === 0 ? (
              <div style={styles.empty}>No settled records.</div>
            ) : (
              settledBalances.map((b, i) => renderPersonCard(b, i, true))
            )}
          </>
        )}

      </div>
      <div style={{ height: '20px' }} />
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh', paddingBottom: '80px' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', color: '#00f5a0' },
  header: { marginBottom: '20px', paddingTop: '10px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  
  // NEW BLUE CARD UI
  blueCard: {
    background: 'linear-gradient(135deg, #7aa4ff, #5b87ff)',
    borderRadius: '24px', padding: '24px', marginBottom: '24px',
    color: '#0a1128',
  },
  blueCardTitle: { fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '8px', opacity: 0.8 },
  blueCardAmount: { fontSize: '42px', fontWeight: '800', marginBottom: '20px', letterSpacing: '-1px' },
  blueCardRow: { display: 'flex', gap: '12px' },
  blueCardInnerBox: {
    flex: 1, background: 'rgba(255, 255, 255, 0.25)',
    borderRadius: '16px', padding: '16px',
  },
  blueCardLabel: { fontSize: '12px', fontWeight: '600', opacity: 0.8, marginBottom: '4px' },
  blueCardVal: { fontSize: '18px', fontWeight: '800' },

  // TABS
  tabsContainer: { display: 'flex', borderBottom: '1px solid #2a2f45', marginBottom: '16px' },
  tabBtn: { flex: 1, padding: '12px', background: 'transparent', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.5px' },

  empty: { color: '#8892b0', textAlign: 'center', padding: '40px', whiteSpace: 'pre-line', fontSize: '15px' },
  
  // Person Card Styles
  personCard: { background: '#1a1f35', borderRadius: '14px', marginBottom: '10px', border: '1px solid', overflow: 'hidden' },
  personHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', cursor: 'pointer' },
  personLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px' },
  personName: { fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '3px' },
  settledBadge: { fontSize: '10px', fontWeight: '700', color: '#00f5a0', background: '#00f5a022', padding: '2px 8px', borderRadius: '10px', display: 'inline-block' },
  personBalance: { fontSize: '12px', fontWeight: '600' },
  chevron: { color: '#8892b0', fontSize: '12px' },
  
  // Expanded Styles
  expanded: { padding: '0 16px 16px', borderTop: '1px solid #2a2f45' },
  txRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #2a2f4522' },
  txDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  txInfo: { flex: 1 },
  txType: { fontSize: '13px', fontWeight: '600', color: '#fff' },
  txDate: { fontSize: '11px', color: '#8892b0' },
  txAmount: { fontSize: '14px', fontWeight: '700' },
  
  actionRow: { display: 'flex', gap: '10px', marginTop: '16px' },
  partialBtnStyle: { flex: 1, padding: '12px', background: 'transparent', border: '1px solid #00f5a0', borderRadius: '10px', color: '#00f5a0', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  settleBtnStyle: { flex: 1, padding: '12px', background: '#00f5a0', border: 'none', borderRadius: '10px', color: '#0a0e1a', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  
  returnForm: { display: 'flex', gap: '6px', width: '100%' },
  returnDateInput: { width: '110px', padding: '10px', background: '#0a0e1a', border: '1px solid #2a2f45', borderRadius: '8px', color: '#8892b0', fontSize: '12px', outline: 'none' },
  returnInput: { flex: 1, minWidth: '80px', padding: '10px 12px', background: '#0a0e1a', border: '1px solid #2a2f45', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' },
  confirmBtn: { padding: '0 14px', background: '#00f5a0', border: 'none', borderRadius: '8px', color: '#0a0e1a', fontWeight: '700', cursor: 'pointer' },
  cancelBtn: { padding: '0 12px', background: '#ff475722', border: '1px solid #ff475744', borderRadius: '8px', color: '#ff4757', fontWeight: '700', cursor: 'pointer' },

  // Insight Styles
  insightCard: { background: '#ffa50222', border: '1px solid #ffa50244', borderRadius: '12px', padding: '14px', marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', color: '#ffa502' },
  insightCardBorrow: { background: '#ff475722', border: '1px solid #ff475744', borderRadius: '12px', padding: '14px', marginTop: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', color: '#ff4757' },

  // Bulk Delete Styles
  settledHeader: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px' },
  deleteModeBtn: { background: '#1a1f35', border: '1px solid #2a2f45', color: '#8892b0', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  deleteActions: { display: 'flex', gap: '8px' },
  selectAllBtn: { background: '#2a2f45', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  confirmDeleteBtn: { background: '#ff475722', border: '1px solid #ff475744', color: '#ff4757', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
  cancelDeleteBtn: { background: 'transparent', border: 'none', color: '#8892b0', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  checkbox: { width: '18px', height: '18px', accentColor: '#ff4757', cursor: 'pointer' },
};