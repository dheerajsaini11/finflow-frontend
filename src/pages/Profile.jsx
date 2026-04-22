import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  updateProfileName,
  updateProfilePicture,
  deleteAccount,
  getDashboard,
  getStreak,
} from '../services/api';

// ─── Sub-components ───────────────────────────────────────────────────────────

const EyeIcon = ({ show, onToggle }) => (
  <button type="button" onClick={onToggle} style={styles.eyeBtn}>
    {show ? '👁️' : '🙈'}
  </button>
);

const PasswordInput = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={styles.passwordWrapper}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={styles.formInput}
      />
      <EyeIcon show={show} onToggle={() => setShow(!show)} />
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Stats
  const [stats, setStats] = useState(null);

  // Preferences (localStorage)
  const [defaultTxType, setDefaultTxType] = useState(
    localStorage.getItem('finflow_default_tx_type') || 'expense'
  );
  const [weekStart, setWeekStart] = useState(
    localStorage.getItem('finflow_week_start') || 'monday'
  );

  // Danger zone
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Fetch stats on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [dashRes, streakRes] = await Promise.all([
          getDashboard(),
          getStreak(),
        ]);
        setStats({
          streak: streakRes.data?.streak ?? 0,
          longestStreak: streakRes.data?.longest_streak ?? streakRes.data?.streak ?? 0,
          totalTransactions: dashRes.data?.total_transactions ?? '—',
        });
      } catch {
        // Non-critical — silently fail
      }
    };
    fetchStats();
  }, []);

  // ── Password change ───────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('finflow_token');
      await axios.put(
        'https://finflow-backend-production-f752.up.railway.app/api/auth/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Password changed successfully ✅');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  // ── Name update ───────────────────────────────────────────────────────────
  const handleNameSave = async () => {
    if (!nameValue.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSavingName(true);
    try {
      await updateProfileName({ name: nameValue.trim() });
      updateUser({ name: nameValue.trim() });
      toast.success('Name updated ✅');
      setEditingName(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e) => {
    const file = e.target.files.item(0);
    if (!file) return;
    const formData = new FormData();
    formData.append('profile', file);
    setUploadingAvatar(true);
    try {
      const res = await updateProfilePicture(formData);
      updateUser({ avatars_url: res.data.avatars_url });
      toast.success('Profile picture updated ✅');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Preferences ───────────────────────────────────────────────────────────
  const handlePrefChange = (key, value) => {
    if (key === 'defaultTxType') {
      setDefaultTxType(value);
      localStorage.setItem('finflow_default_tx_type', value);
    } else {
      setWeekStart(value);
      localStorage.setItem('finflow_week_start', value);
    }
    toast.success('Preference saved');
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Enter your password to confirm');
      return;
    }
    setDeletingAccount(true);
    try {
      await deleteAccount({ password: deletePassword });
      toast.success('Account deleted. Goodbye 👋');
      logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : 'April 2026';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Profile</div>
        <div style={styles.subtitle}>Your account details</div>
      </div>

      {/* ── Avatar Card ──────────────────────────────────────────────────── */}
      <div style={styles.avatarCard}>
        <div style={styles.avatarWrapper}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
          {user?.avatars_url ? (
            <img src={user.avatars_url} alt="Profile" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatarInitial}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={styles.avatarEditBtn}
            disabled={uploadingAvatar}
            title="Change profile picture"
          >
            {uploadingAvatar ? '⏳' : '📷'}
          </button>
        </div>

        {/* Editable name */}
        {editingName ? (
          <div style={styles.nameEditRow}>
            <input
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              style={styles.nameInput}
              maxLength={100}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleNameSave();
                if (e.key === 'Escape') setEditingName(false);
              }}
            />
            <button onClick={handleNameSave} disabled={savingName} style={styles.nameSaveBtn}>
              {savingName ? '...' : '✓'}
            </button>
            <button
              onClick={() => { setEditingName(false); setNameValue(user?.name || ''); }}
              style={styles.nameCancelBtn}
            >
              ✕
            </button>
          </div>
        ) : (
          <div style={styles.nameRow}>
            <div style={styles.userName}>{user?.name}</div>
            <button
              onClick={() => { setEditingName(true); setNameValue(user?.name || ''); }}
              style={styles.editNameBtn}
              title="Edit name"
            >
              ✏️
            </button>
          </div>
        )}

        <div style={styles.userEmail}>{user?.email}</div>
      </div>

      {/* ── Stats Card ───────────────────────────────────────────────────── */}
      <div style={styles.sectionTitle}>Your Activity</div>
      <div style={styles.statsCard}>
        <div style={styles.statItem}>
          <div style={styles.statValue}>{memberSince}</div>
          <div style={styles.statLabel}>📅 Member Since</div>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <div style={styles.statValue}>
            {stats ? stats.totalTransactions : '—'}
          </div>
          <div style={styles.statLabel}>📊 Transactions</div>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <div style={styles.statValue}>
            {stats ? `${stats.longestStreak}d` : '—'}
          </div>
          <div style={styles.statLabel}>🔥 Best Streak</div>
        </div>
      </div>

      {/* ── Account Details ──────────────────────────────────────────────── */}
      <div style={styles.sectionTitle}>Account</div>
      <div style={styles.infoCard}>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Full Name</span>
          <span style={styles.infoValue}>{user?.name}</span>
        </div>
        <div style={styles.divider} />
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Email</span>
          <span style={styles.infoValue}>{user?.email}</span>
        </div>
        <div style={styles.divider} />
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Member Since</span>
          <span style={styles.infoValue}>{memberSince}</span>
        </div>
      </div>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <div style={styles.sectionTitle}>Security</div>
      <div style={styles.securityCard}>
        <div style={styles.securityRow}>
          <div style={styles.securityLeft}>
            <div style={styles.securityIcon}>🔒</div>
            <div>
              <div style={styles.securityTitle}>Password</div>
              <div style={styles.securitySub}>Keep your account secure</div>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            style={styles.changeBtn}
          >
            {showPasswordForm ? 'Cancel' : 'Change'}
          </button>
        </div>

        {showPasswordForm && (
          <div style={styles.passwordForm}>
            <div style={styles.divider} />
            <div style={styles.formField}>
              <label style={styles.formLabel}>CURRENT PASSWORD</label>
              <PasswordInput
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>NEW PASSWORD</label>
              <PasswordInput
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>CONFIRM NEW PASSWORD</label>
              <PasswordInput
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
            {newPassword.length > 0 && (
              <div style={styles.strengthBar}>
                <div style={styles.strengthLabel}>Password strength:</div>
                <div style={styles.strengthTrack}>
                  <div style={{
                    ...styles.strengthFill,
                    width: newPassword.length < 6 ? '33%' : newPassword.length < 10 ? '66%' : '100%',
                    background: newPassword.length < 6 ? '#ff4757' : newPassword.length < 10 ? '#ffa502' : '#00f5a0',
                  }} />
                </div>
                <div style={{
                  ...styles.strengthText,
                  color: newPassword.length < 6 ? '#ff4757' : newPassword.length < 10 ? '#ffa502' : '#00f5a0',
                }}>
                  {newPassword.length < 6 ? 'Weak' : newPassword.length < 10 ? 'Medium' : 'Strong'}
                </div>
              </div>
            )}
            <button
              onClick={handlePasswordChange}
              disabled={saving}
              style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        )}
      </div>

      {/* ── App Preferences ──────────────────────────────────────────────── */}
      <div style={styles.sectionTitle}>Preferences</div>
      <div style={styles.prefsCard}>
        <div style={styles.prefRow}>
          <div>
            <div style={styles.prefTitle}>Default transaction type</div>
            <div style={styles.prefSub}>Pre-selected tab on Quick Entry</div>
          </div>
          <select
            value={defaultTxType}
            onChange={e => handlePrefChange('defaultTxType', e.target.value)}
            style={styles.prefSelect}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="investment">Investment</option>
            <option value="lend">Lend</option>
          </select>
        </div>
        <div style={styles.divider} />
        <div style={styles.prefRow}>
          <div>
            <div style={styles.prefTitle}>Week starts on</div>
            <div style={styles.prefSub}>Affects analytics heatmap</div>
          </div>
          <select
            value={weekStart}
            onChange={e => handlePrefChange('weekStart', e.target.value)}
            style={styles.prefSelect}
          >
            <option value="monday">Monday</option>
            <option value="sunday">Sunday</option>
          </select>
        </div>
      </div>

      {/* ── About ────────────────────────────────────────────────────────── */}
      <div style={styles.sectionTitle}>About</div>
      <div style={styles.appCard}>
        <div style={styles.appRow}>
          <span style={styles.appLabel}>App Version</span>
          <span style={styles.appValue}>FinFlow v1.0.0</span>
        </div>
        <div style={styles.divider} />
        <div style={styles.appRow}>
          <span style={styles.appLabel}>Built with</span>
          <span style={styles.appValue}>React + Node.js</span>
        </div>
        <div style={styles.divider} />
        <div style={styles.appRow}>
          <span style={styles.appLabel}>Database</span>
          <span style={styles.appValue}>PostgreSQL (Supabase)</span>
        </div>
      </div>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      <div style={styles.sectionTitle}>Danger Zone</div>
      <div style={styles.dangerCard}>
        <div style={styles.dangerRow}>
          <div>
            <div style={styles.dangerTitle}>Delete Account</div>
            <div style={styles.dangerSub}>
              Permanently delete your account and all data. This cannot be undone.
            </div>
          </div>
          <button
            onClick={() => {
              setShowDangerZone(!showDangerZone);
              setShowDeleteConfirm(false);
              setDeletePassword('');
            }}
            style={styles.dangerToggleBtn}
          >
            {showDangerZone ? 'Cancel' : 'Delete'}
          </button>
        </div>

        {showDangerZone && (
          <div style={styles.dangerForm}>
            <div style={styles.divider} />
            <div style={styles.dangerWarning}>
              ⚠️ This will permanently delete your account, all transactions, categories, budgets, and lend records.
            </div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={styles.dangerConfirmBtn}
              >
                I understand, continue →
              </button>
            ) : (
              <>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>CONFIRM WITH YOUR PASSWORD</label>
                  <PasswordInput
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    placeholder="Enter your current password"
                  />
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  style={{ ...styles.dangerDeleteBtn, opacity: deletingAccount ? 0.7 : 1 }}
                >
                  {deletingAccount ? 'Deleting...' : '🗑️ Permanently Delete My Account'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ height: '40px' }} />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh' },
  header: { marginBottom: '24px', paddingTop: '10px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: '13px', color: '#8892b0', marginTop: '4px' },

  // Avatar card
  avatarCard: {
    background: '#1a1f35', borderRadius: '16px', padding: '30px 20px',
    textAlign: 'center', marginBottom: '24px', border: '1px solid #2a2f45',
  },
  avatarWrapper: {
    position: 'relative', width: '90px', height: '90px',
    margin: '0 auto 16px',
  },
  avatarImg: {
    width: '90px', height: '90px', borderRadius: '50%',
    objectFit: 'cover', border: '3px solid #2a2f45',
  },
  avatarInitial: {
    width: '90px', height: '90px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #00f5a0, #0066ff)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '36px', fontWeight: '700', color: '#0a0e1a',
    border: '3px solid #2a2f45',
  },
  avatarEditBtn: {
    position: 'absolute', bottom: '-2px', right: '-2px',
    background: '#2a2f45', border: '2px solid #1a1f35',
    borderRadius: '50%', width: '30px', height: '30px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: '13px',
  },
  nameRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', marginBottom: '4px',
  },
  userName: { fontSize: '22px', fontWeight: '700', color: '#fff' },
  editNameBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: '16px', padding: '2px', opacity: 0.7,
  },
  nameEditRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', marginBottom: '4px',
  },
  nameInput: {
    background: '#0a0e1a', border: '1px solid #00f5a0', borderRadius: '8px',
    color: '#fff', fontSize: '18px', fontWeight: '700',
    padding: '6px 12px', textAlign: 'center', outline: 'none',
    width: '200px',
  },
  nameSaveBtn: {
    background: '#00f5a0', border: 'none', borderRadius: '8px',
    color: '#0a0e1a', fontWeight: '700', fontSize: '16px',
    cursor: 'pointer', padding: '6px 12px',
  },
  nameCancelBtn: {
    background: '#2a2f45', border: 'none', borderRadius: '8px',
    color: '#8892b0', fontWeight: '700', fontSize: '14px',
    cursor: 'pointer', padding: '6px 12px',
  },
  userEmail: { fontSize: '14px', color: '#8892b0' },

  // Stats
  statsCard: {
    background: '#1a1f35', borderRadius: '16px', padding: '20px',
    marginBottom: '24px', border: '1px solid #2a2f45',
    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
  },
  statItem: { textAlign: 'center', flex: 1 },
  statValue: { fontSize: '16px', fontWeight: '700', color: '#00f5a0', marginBottom: '4px' },
  statLabel: { fontSize: '11px', color: '#8892b0' },
  statDivider: { width: '1px', height: '40px', background: '#2a2f45' },

  // Shared
  sectionTitle: {
    fontSize: '14px', fontWeight: '700', color: '#8892b0',
    letterSpacing: '0.5px', marginBottom: '12px',
  },
  divider: { height: '1px', background: '#2a2f45' },

  // Info card
  infoCard: {
    background: '#1a1f35', borderRadius: '16px', padding: '8px 20px',
    marginBottom: '24px', border: '1px solid #2a2f45',
  },
  infoRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '16px 0',
  },
  infoLabel: { fontSize: '14px', color: '#8892b0' },
  infoValue: { fontSize: '14px', color: '#fff', fontWeight: '500' },

  // Security
  securityCard: {
    background: '#1a1f35', borderRadius: '16px', padding: '16px 20px',
    marginBottom: '24px', border: '1px solid #2a2f45',
  },
  securityRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  securityLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  securityIcon: { fontSize: '24px' },
  securityTitle: { fontSize: '15px', fontWeight: '600', color: '#fff' },
  securitySub: { fontSize: '12px', color: '#8892b0', marginTop: '2px' },
  changeBtn: {
    padding: '8px 16px', background: '#2a2f45', border: 'none',
    borderRadius: '8px', color: '#fff', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer',
  },
  passwordForm: { marginTop: '16px' },
  formField: { marginTop: '14px' },
  formLabel: {
    display: 'block', fontSize: '11px', color: '#8892b0',
    fontWeight: '600', letterSpacing: '0.5px', marginBottom: '6px',
  },
  passwordWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  formInput: {
    width: '100%', padding: '12px 44px 12px 14px', background: '#0a0e1a',
    border: '1px solid #2a2f45', borderRadius: '10px', color: '#fff',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute', right: '12px', background: 'transparent',
    border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px',
  },
  strengthBar: { marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' },
  strengthLabel: { fontSize: '12px', color: '#8892b0', whiteSpace: 'nowrap' },
  strengthTrack: {
    flex: 1, height: '4px', background: '#2a2f45',
    borderRadius: '2px', overflow: 'hidden',
  },
  strengthFill: { height: '100%', borderRadius: '2px', transition: 'all 0.3s' },
  strengthText: { fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  saveBtn: {
    width: '100%', padding: '14px', marginTop: '16px',
    background: 'linear-gradient(135deg, #00f5a0, #0066ff)',
    border: 'none', borderRadius: '12px', color: '#0a0e1a',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer',
  },

  // Preferences
  prefsCard: {
    background: '#1a1f35', borderRadius: '16px', padding: '8px 20px',
    marginBottom: '24px', border: '1px solid #2a2f45',
  },
  prefRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 0',
  },
  prefTitle: { fontSize: '14px', color: '#fff', fontWeight: '500', marginBottom: '2px' },
  prefSub: { fontSize: '12px', color: '#8892b0' },
  prefSelect: {
    background: '#0a0e1a', border: '1px solid #2a2f45', borderRadius: '8px',
    color: '#fff', fontSize: '13px', padding: '8px 12px',
    cursor: 'pointer', outline: 'none',
  },

  // About
  appCard: {
    background: '#1a1f35', borderRadius: '16px', padding: '8px 20px',
    border: '1px solid #2a2f45', marginBottom: '24px',
  },
  appRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '14px 0',
  },
  appLabel: { fontSize: '14px', color: '#8892b0' },
  appValue: { fontSize: '14px', color: '#fff', fontWeight: '500' },

  // Danger zone
  dangerCard: {
    background: '#1a0a0a', borderRadius: '16px', padding: '16px 20px',
    border: '1px solid #ff475733', marginBottom: '16px',
  },
  dangerRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: '12px',
  },
  dangerTitle: { fontSize: '15px', fontWeight: '600', color: '#ff4757', marginBottom: '4px' },
  dangerSub: { fontSize: '12px', color: '#8892b0', lineHeight: '1.4' },
  dangerToggleBtn: {
    padding: '8px 16px', background: 'transparent',
    border: '1px solid #ff4757', borderRadius: '8px',
    color: '#ff4757', fontSize: '13px', fontWeight: '600',
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  },
  dangerForm: { marginTop: '16px' },
  dangerWarning: {
    background: '#ff47570f', border: '1px solid #ff475733',
    borderRadius: '10px', padding: '12px 14px',
    fontSize: '13px', color: '#ff4757', lineHeight: '1.5',
    marginTop: '16px',
  },
  dangerConfirmBtn: {
    width: '100%', padding: '12px', marginTop: '14px',
    background: 'transparent', border: '1px solid #ff4757',
    borderRadius: '10px', color: '#ff4757', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer',
  },
  dangerDeleteBtn: {
    width: '100%', padding: '14px', marginTop: '16px',
    background: '#ff4757', border: 'none', borderRadius: '12px',
    color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
  },
};
