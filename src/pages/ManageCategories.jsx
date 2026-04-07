import { useState, useEffect } from 'react';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../services/api';
import toast from 'react-hot-toast';

const TYPES = ['expense', 'income', 'investment'];

const PRESET_ICONS = [
  '🍕','🚗','🏠','💊','🎬','⚡','🛍️','✈️','🎓','💪',
  '🐕','🌿','🎮','📱','☕','🍺','🎵','📚','🏋️','🚌',
  '💈','🧴','🎁','🍜','🏖️','🎯','💡','🔧','🏦','💰',
];

const PRESET_COLORS = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FF6348',
  '#A29BFE','#FD79A8','#00B894','#FDCB6E','#6C5CE7',
  '#e17055','#00cec9','#0984e3','#fd79a8','#55efc4',
];

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('expense');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [form, setForm] = useState({
    name: '', icon: '📦', color: '#6C63FF', type: 'expense'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [activeType]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await getCategories({ type: activeType });
      setCategories(res.data.categories);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm({ name: '', icon: '📦', color: '#6C63FF', type: activeType });
    setEditCat(null);
    setShowAddModal(true);
  };

  const openEdit = (cat) => {
    setForm({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
    });
    setEditCat(cat);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSaving(true);
    try {
      if (editCat) {
        await updateCategory(editCat.id, form);
        toast.success('Category updated ✅');
      } else {
        await addCategory(form);
        toast.success('Category added ✅');
      }
      setShowAddModal(false);
      fetchCategories();
    } catch (err) {
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    try {
      await deleteCategory(cat.id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div style={styles.container}>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                {editCat ? 'Edit Category' : 'Add Category'}
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={styles.closeBtn}
              >✕</button>
            </div>

            {/* Icon Preview */}
            <div style={styles.iconPreview}>
              <div style={{
                ...styles.previewCircle,
                background: form.color + '33',
              }}>
                <span style={styles.previewEmoji}>{form.icon}</span>
              </div>
              <div style={{ ...styles.previewName, color: form.color }}>
                {form.name || 'Preview'}
              </div>
            </div>

            {/* Name */}
            <div style={styles.formField}>
              <label style={styles.formLabel}>CATEGORY NAME</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Specialty Coffee"
                style={styles.formInput}
                maxLength={30}
              />
            </div>

            {/* Type */}
            {!editCat && (
              <div style={styles.formField}>
                <label style={styles.formLabel}>TYPE</label>
                <div style={styles.typeRow}>
                  {TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, type: t })}
                      style={{
                        ...styles.typeBtn,
                        background: form.type === t ? '#00f5a0' : '#0a0e1a',
                        color: form.type === t ? '#0a0e1a' : '#8892b0',
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Icon Picker */}
            <div style={styles.formField}>
              <label style={styles.formLabel}>CHOOSE ICON</label>
              <div style={styles.iconGrid}>
                {PRESET_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setForm({ ...form, icon })}
                    style={{
                      ...styles.iconBtn,
                      background: form.icon === icon ? '#00f5a022' : '#0a0e1a',
                      border: `1px solid ${form.icon === icon ? '#00f5a0' : '#2a2f45'}`,
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div style={styles.formField}>
              <label style={styles.formLabel}>CHOOSE COLOR</label>
              <div style={styles.colorGrid}>
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    style={{
                      ...styles.colorBtn,
                      background: color,
                      border: form.color === color
                        ? '3px solid #fff'
                        : '3px solid transparent',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                ...styles.saveBtn,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : editCat ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Manage Categories</div>
          <div style={styles.subtitle}>Customize your tracking</div>
        </div>
        <button onClick={openAdd} style={styles.addBtn}>
          + Add
        </button>
      </div>

      {/* Type Tabs */}
      <div style={styles.typeTabs}>
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            style={{
              ...styles.typeTab,
              background: activeType === t ? '#00f5a0' : '#1a1f35',
              color: activeType === t ? '#0a0e1a' : '#8892b0',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Categories List */}
      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : categories.length === 0 ? (
        <div style={styles.empty}>
          No {activeType} categories yet.{'\n'}
          Tap + Add to create one!
        </div>
      ) : (
        categories.map(cat => (
          <div key={cat.id} style={styles.catCard}>
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
                  ...styles.catType,
                  color: cat.color,
                }}>
                  {cat.type}
                </div>
              </div>
            </div>
            <div style={styles.catActions}>
              <button
                onClick={() => openEdit(cat)}
                style={styles.editBtn}
              >
                ✏️
              </button>
              <button
                onClick={() => handleDelete(cat)}
                style={styles.deleteBtn}
              >
                🗑️
              </button>
            </div>
          </div>
        ))
      )}

      <div style={{ height: '20px' }} />
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh' },
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)', zIndex: 2000,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    background: '#1a1f35', borderRadius: '20px 20px 0 0',
    padding: '24px', width: '100%', maxWidth: '600px',
    border: '1px solid #2a2f45', maxHeight: '90vh', overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '20px',
  },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#fff' },
  closeBtn: {
    background: '#2a2f45', border: 'none', color: '#fff',
    width: '32px', height: '32px', borderRadius: '50%',
    cursor: 'pointer', fontSize: '14px',
  },
  iconPreview: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    marginBottom: '20px', gap: '8px',
  },
  previewCircle: {
    width: '70px', height: '70px', borderRadius: '20px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  previewEmoji: { fontSize: '32px' },
  previewName: { fontSize: '16px', fontWeight: '700' },
  formField: { marginBottom: '16px' },
  formLabel: {
    display: 'block', fontSize: '11px', color: '#8892b0',
    fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px',
  },
  formInput: {
    width: '100%', padding: '12px 14px', background: '#0a0e1a',
    border: '1px solid #2a2f45', borderRadius: '10px', color: '#fff',
    fontSize: '14px', outline: 'none',
  },
  typeRow: { display: 'flex', gap: '8px' },
  typeBtn: {
    flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  },
  iconGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px',
  },
  iconBtn: {
    padding: '8px', borderRadius: '8px', cursor: 'pointer',
    fontSize: '18px', textAlign: 'center',
  },
  colorGrid: {
    display: 'flex', flexWrap: 'wrap', gap: '10px',
  },
  colorBtn: {
    width: '32px', height: '32px', borderRadius: '50%',
    cursor: 'pointer',
  },
  saveBtn: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #00f5a0, #0066ff)',
    border: 'none', borderRadius: '12px', color: '#0a0e1a',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer',
    marginTop: '8px',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '20px', paddingTop: '10px',
  },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: '13px', color: '#8892b0', marginTop: '4px' },
  addBtn: {
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #00f5a0, #0066ff)',
    border: 'none', borderRadius: '12px', color: '#0a0e1a',
    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
  },
  typeTabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
  typeTab: {
    flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  },
  loading: { color: '#8892b0', textAlign: 'center', padding: '40px' },
  empty: {
    color: '#8892b0', textAlign: 'center', padding: '40px',
    whiteSpace: 'pre-line', fontSize: '15px',
  },
  catCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#1a1f35', borderRadius: '14px', padding: '14px 16px',
    marginBottom: '10px', border: '1px solid #2a2f45',
  },
  catLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  catIcon: {
    width: '44px', height: '44px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '22px',
  },
  catName: { fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '2px' },
  catType: { fontSize: '12px', fontWeight: '500' },
  catActions: { display: 'flex', gap: '8px' },
  editBtn: {
    background: '#2a2f45', border: 'none', cursor: 'pointer',
    fontSize: '14px', padding: '6px 10px', borderRadius: '8px',
  },
  deleteBtn: {
    background: 'transparent', border: 'none',
    cursor: 'pointer', fontSize: '16px', padding: '4px',
  },
};