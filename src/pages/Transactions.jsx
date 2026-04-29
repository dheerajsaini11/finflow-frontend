import { useState, useEffect } from 'react';
import { getTransactions, deleteTransaction, updateTransaction, getCategories } from '../services/api';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  expense: '#ff4757',
  income: '#00f5a0',
  investment: '#6c5ce7',
  lend: '#ffa502',
  borrow: '#ff4757', // Added borrow color
  return: '#00f5a0',
  borrow_return: '#00f5a0',
};

const TYPE_ICONS = {
  expense: '💸',
  income: '💰',
  investment: '📈',
  lend: '🤝',
  borrow: '↙️',     // Added borrow icon
  return: '↩️',
  borrow_return: '✅',
};

const TYPE_LABELS = {
  expense: null,
  income: null,
  investment: null,
  lend: 'Lent Money',
  borrow: 'Borrowed',
  return: 'Received Back',
  borrow_return: 'Repaid',
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editTx, setEditTx] = useState(null);
  const [categories, setCategories] = useState([]);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const fetchTransactions = async () => {
    try {
      const params = {};
      if (filter !== 'all') params.type = filter;
      const res = await getTransactions(params);
      setTransactions(res.data.transactions);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (type) => {
    try {
      const typeMap = {
        expense: 'expense',
        income: 'income',
        investment: 'investment',
        lend: 'expense',
        borrow: 'expense', // Added borrow mapping
        return: 'expense',
      };
      const res = await getCategories({ type: typeMap[type] || 'expense' });
      setCategories(res.data.categories);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const handleEdit = (tx) => {
    setEditTx(tx);
    setEditForm({
      amount: tx.amount,
      note: tx.note || '',
      date: new Date(tx.date).toISOString().split('T')[0],
      category_id: tx.category_id || '',
      person_name: tx.person_name || '',
    });
    fetchCategories(tx.type);
  };

  const handleSave = async () => {
    if (!editForm.amount || Number(editForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await updateTransaction(editTx.id, {
        type: editTx.type,
        amount: Number(editForm.amount),
        category_id: editForm.category_id || null,
        note: editForm.note || null,
        date: editForm.date,
        person_name: editForm.person_name || null,
      });
      toast.success('Transaction updated ✅');
      setEditTx(null);
      fetchTransactions();
    } catch (err) {
      toast.error('Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await deleteTransaction(id);
      toast.success('Transaction deleted');
      fetchTransactions();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const formatAmount = (amount) =>
    '₹' + Number(amount || 0).toLocaleString('en-IN');

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  // Helper function to capitalize the first letter
  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const filtered = transactions.filter(tx => {
    if (!search) return true;
    return (
      tx.category_name?.toLowerCase().includes(search.toLowerCase()) ||
      tx.note?.toLowerCase().includes(search.toLowerCase()) ||
      tx.person_name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const grouped = filtered.reduce((acc, tx) => {
    const date = new Date(tx.date).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {});

  // NEW: Added 'borrow' and 'return' to the FILTERS array
  const FILTERS = ['all', 'expense', 'income', 'investment', 'lend', 'borrow', 'return'];

  return (
    <div style={styles.container}>

      {/* Edit Modal */}
      {editTx && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>Edit Transaction</div>
              <button
                onClick={() => setEditTx(null)}
                style={styles.closeBtn}
              >✕</button>
            </div>

            <div style={styles.modalBadge}>
              <span style={{
                ...styles.typeBadge,
                background: TYPE_COLORS[editTx.type] + '22',
                color: TYPE_COLORS[editTx.type],
              }}>
                {/* Capitalized Type in Modal */}
                {TYPE_ICONS[editTx.type]} {capitalize(editTx.type)}
              </span>
            </div>

            <div style={styles.formField}>
              <label style={styles.formLabel}>AMOUNT</label>
              <input
                type="number"
                value={editForm.amount}
                onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                style={styles.formInput}
              />
            </div>

            <div style={styles.formField}>
              <label style={styles.formLabel}>DATE</label>
              <input
                type="date"
                value={editForm.date}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  if (e.target.value > new Date().toISOString().split('T')[0]) {
                    toast.error('Future dates are not allowed');
                    return;
                  }
                  setEditForm({ ...editForm, date: e.target.value })
                }}
                style={styles.formInput}
              />
            </div>

            <div style={styles.formField}>
              <label style={styles.formLabel}>CATEGORY</label>
              <select
                value={editForm.category_id}
                onChange={e => setEditForm({ ...editForm, category_id: e.target.value })}
                style={styles.formInput}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {(editTx.type === 'lend' || editTx.type === 'return' || editTx.type === 'borrow') && (
              <div style={styles.formField}>
                <label style={styles.formLabel}>PERSON NAME</label>
                <input
                  type="text"
                  value={editForm.person_name}
                  onChange={e => setEditForm({ ...editForm, person_name: e.target.value })}
                  style={styles.formInput}
                />
              </div>
            )}

            <div style={styles.formField}>
              <label style={styles.formLabel}>NOTE</label>
              <input
                type="text"
                value={editForm.note}
                onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                placeholder="Optional note"
                style={styles.formInput}
              />
            </div>

            <div style={styles.modalButtons}>
              <button
                onClick={() => setEditTx(null)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...styles.saveBtn,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>Transactions</div>
      </div>

      {/* Search */}
      <div style={styles.searchBar}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Filter Chips */}
      <div style={styles.filterRow}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.filterChip,
              background: filter === f ? '#00f5a0' : '#1a1f35',
              color: filter === f ? '#0a0e1a' : '#8892b0',
            }}
          >
            {capitalize(f)}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>No transactions found 💸</div>
      ) : (
        Object.entries(grouped).map(([date, txs]) => (
          <div key={date} style={styles.group}>
            <div style={styles.dateLabel}>{date}</div>
            {txs.map(tx => (
              <div key={tx.id} style={styles.txCard}>
                <div style={{
                  ...styles.txIcon,
                  background: (TYPE_COLORS[tx.type] || '#8892b0') + '22',
                }}>
                  {tx.category_icon || TYPE_ICONS[tx.type] || '💳'}
                </div>
                <div style={styles.txInfo}>
                  <div style={styles.txName}>
                    {/* Capitalized fallback type */}
                    {TYPE_LABELS[tx.type] || tx.category_name || tx.person_name || capitalize(tx.type)}
                  </div>
                  {tx.note && (
                    <div style={styles.txNote}>{tx.note}</div>
                  )}
                  <div style={styles.txMeta}>
                    {/* Capitalized Meta Type */}
                    {formatDate(tx.date)} • {TYPE_LABELS[tx.type] || capitalize(tx.type)}
                  </div>
                </div>
                <div style={styles.txRight}>
                  <div style={{
                    ...styles.txAmount,
                    color: TYPE_COLORS[tx.type] || '#fff',
                  }}>
                    {(tx.type === 'income' || tx.type === 'return' || tx.type === 'borrow_return') ? '+' : '-'}
                    {formatAmount(tx.amount)}
                  </div>
                  <div style={styles.actionBtns}>
                    <button
                      onClick={() => handleEdit(tx)}
                      style={styles.editBtn}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      style={styles.deleteBtn}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
      <div style={{ height: '80px' }} /> {/* Padded for bottom navigation bar */}
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh' },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)', zIndex: 2000,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    background: '#1a1f35', borderRadius: '20px 20px 0 0',
    padding: '24px', width: '100%', maxWidth: '600px',
    border: '1px solid #2a2f45', maxHeight: '85vh', overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '16px',
  },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#fff' },
  closeBtn: {
    background: '#2a2f45', border: 'none', color: '#fff',
    width: '32px', height: '32px', borderRadius: '50%',
    cursor: 'pointer', fontSize: '14px',
  },
  modalBadge: { marginBottom: '16px' },
  typeBadge: {
    padding: '4px 12px', borderRadius: '20px',
    fontSize: '13px', fontWeight: '600',
  },
  formField: { marginBottom: '14px' },
  formLabel: {
    display: 'block', fontSize: '11px', color: '#8892b0',
    fontWeight: '600', letterSpacing: '0.5px', marginBottom: '6px',
  },
  formInput: {
    width: '100%', padding: '12px 14px', background: '#0a0e1a',
    border: '1px solid #2a2f45', borderRadius: '10px', color: '#fff',
    fontSize: '14px', outline: 'none',
  },
  modalButtons: { display: 'flex', gap: '10px', marginTop: '20px' },
  cancelBtn: {
    flex: 1, padding: '14px', background: '#2a2f45', border: 'none',
    borderRadius: '12px', color: '#fff', fontSize: '15px',
    fontWeight: '600', cursor: 'pointer',
  },
  saveBtn: {
    flex: 2, padding: '14px',
    background: 'linear-gradient(135deg, #00f5a0, #0066ff)',
    border: 'none', borderRadius: '12px', color: '#0a0e1a',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer',
  },
  header: { marginBottom: '20px', paddingTop: '10px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#1a1f35', borderRadius: '12px',
    padding: '12px 16px', marginBottom: '16px',
    border: '1px solid #2a2f45',
  },
  searchIcon: { fontSize: '16px' },
  searchInput: {
    flex: 1, background: 'transparent', border: 'none',
    color: '#fff', fontSize: '14px', outline: 'none',
  },
  filterRow: {
    display: 'flex', gap: '8px', marginBottom: '20px',
    overflowX: 'auto', paddingBottom: '4px',
  },
  filterChip: {
    padding: '6px 14px', borderRadius: '20px', border: 'none',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  loading: { color: '#8892b0', textAlign: 'center', padding: '40px' },
  empty: { color: '#8892b0', textAlign: 'center', padding: '40px', fontSize: '16px' },
  group: { marginBottom: '20px' },
  dateLabel: {
    fontSize: '12px', color: '#8892b0', fontWeight: '600',
    marginBottom: '10px', letterSpacing: '0.5px',
  },
  txCard: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: '#1a1f35', borderRadius: '14px',
    padding: '14px', marginBottom: '8px',
    border: '1px solid #2a2f45',
  },
  txIcon: {
    width: '44px', height: '44px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '20px', flexShrink: 0,
  },
  txInfo: { flex: 1, minWidth: 0 },
  txName: { fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '2px' },
  txNote: { fontSize: '12px', color: '#8892b0', marginBottom: '2px' },
  txMeta: { fontSize: '11px', color: '#8892b0' },
  txRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },
  txAmount: { fontSize: '15px', fontWeight: '700' },
  actionBtns: { display: 'flex', gap: '6px' },
  editBtn: {
    background: '#2a2f45', border: 'none',
    cursor: 'pointer', fontSize: '14px',
    padding: '4px 8px', borderRadius: '6px',
  },
  deleteBtn: {
    background: 'transparent', border: 'none',
    cursor: 'pointer', fontSize: '14px', padding: '2px',
  },
};