import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const EyeIcon = ({ show, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    style={styles.eyeBtn}
  >
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

export default function Profile() {
  const { user } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

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
        'https://finflow-backend-production-eb28.up.railway.app/api/auth/change-password',
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

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', {
        month: 'long', year: 'numeric'
      })
    : 'April 2026';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Profile</div>
        <div style={styles.subtitle}>Your account details</div>
      </div>

      {/* Avatar Card */}
      <div style={styles.avatarCard}>
        <div style={styles.avatar}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div style={styles.userName}>{user?.name}</div>
        <div style={styles.userEmail}>{user?.email}</div>
      </div>

      {/* Info Card */}
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

      {/* Security */}
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

            {/* Password strength indicator */}
            {newPassword.length > 0 && (
              <div style={styles.strengthBar}>
                <div style={styles.strengthLabel}>Password strength:</div>
                <div style={styles.strengthTrack}>
                  <div style={{
                    ...styles.strengthFill,
                    width: newPassword.length < 6 ? '33%'
                      : newPassword.length < 10 ? '66%' : '100%',
                    background: newPassword.length < 6 ? '#ff4757'
                      : newPassword.length < 10 ? '#ffa502' : '#00f5a0',
                  }} />
                </div>
                <div style={{
                  ...styles.strengthText,
                  color: newPassword.length < 6 ? '#ff4757'
                    : newPassword.length < 10 ? '#ffa502' : '#00f5a0',
                }}>
                  {newPassword.length < 6 ? 'Weak'
                    : newPassword.length < 10 ? 'Medium' : 'Strong'}
                </div>
              </div>
            )}

            <button
              onClick={handlePasswordChange}
              disabled={saving}
              style={{
                ...styles.saveBtn,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        )}
      </div>

      {/* App Info */}
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
          <span style={styles.appValue}>MySQL 8.0</span>
        </div>
      </div>

      <div style={{ height: '20px' }} />
    </div>
  );
}

const styles = {
  container: { padding: '20px', background: '#0a0e1a', minHeight: '100vh' },
  header: { marginBottom: '24px', paddingTop: '10px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: '13px', color: '#8892b0', marginTop: '4px' },
  avatarCard: {
    background: '#1a1f35', borderRadius: '16px', padding: '30px 20px',
    textAlign: 'center', marginBottom: '16px', border: '1px solid #2a2f45',
  },
  avatar: {
    width: '80px', height: '80px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #00f5a0, #0066ff)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '32px', fontWeight: '700', color: '#0a0e1a',
    margin: '0 auto 16px',
  },
  userName: { fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '4px' },
  userEmail: { fontSize: '14px', color: '#8892b0' },
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
  divider: { height: '1px', background: '#2a2f45' },
  sectionTitle: {
    fontSize: '14px', fontWeight: '700', color: '#8892b0',
    letterSpacing: '0.5px', marginBottom: '12px',
  },
  securityCard: {
    background: '#1a1f35', borderRadius: '16px', padding: '16px 20px',
    marginBottom: '16px', border: '1px solid #2a2f45',
  },
  securityRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
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
  passwordWrapper: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  formInput: {
    width: '100%', padding: '12px 44px 12px 14px', background: '#0a0e1a',
    border: '1px solid #2a2f45', borderRadius: '10px', color: '#fff',
    fontSize: '14px', outline: 'none',
  },
  eyeBtn: {
    position: 'absolute', right: '12px', background: 'transparent',
    border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px',
  },
  strengthBar: {
    marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px',
  },
  strengthLabel: { fontSize: '12px', color: '#8892b0', whiteSpace: 'nowrap' },
  strengthTrack: {
    flex: 1, height: '4px', background: '#2a2f45',
    borderRadius: '2px', overflow: 'hidden',
  },
  strengthFill: {
    height: '100%', borderRadius: '2px', transition: 'all 0.3s',
  },
  strengthText: { fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  saveBtn: {
    width: '100%', padding: '14px', marginTop: '16px',
    background: 'linear-gradient(135deg, #00f5a0, #0066ff)',
    border: 'none', borderRadius: '12px', color: '#0a0e1a',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer',
  },
  appCard: {
    background: '#1a1f35', borderRadius: '16px', padding: '8px 20px',
    border: '1px solid #2a2f45',
  },
  appRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '14px 0',
  },
  appLabel: { fontSize: '14px', color: '#8892b0' },
  appValue: { fontSize: '14px', color: '#fff', fontWeight: '500' },
};