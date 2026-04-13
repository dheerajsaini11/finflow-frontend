import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    setIsDrawerOpen(false);
    setIsProfileOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* --- TOP NAVIGATION BAR --- */}
      <div style={styles.topBar}>
        <div style={styles.leftSection}>
          <button onClick={() => setIsDrawerOpen(true)} style={styles.iconBtn}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <span style={styles.logoText}>FinFlow</span>
        </div>

        <button onClick={() => setIsProfileOpen(!isProfileOpen)} style={styles.profileBtn}>
          {/* Replace 'D' with actual user initial or image */}
          <div style={styles.profileAvatar}>D</div>
        </button>
      </div>

      {/* --- SIDEBAR DRAWER (MORE OPTIONS) --- */}
      {isDrawerOpen && <div style={styles.overlay} onClick={() => setIsDrawerOpen(false)} />}
      
      <div style={{ ...styles.drawer, transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
        <div style={styles.drawerHeader}>
          <span style={styles.logoText}>Options</span>
          <button onClick={() => setIsDrawerOpen(false)} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.drawerMenu}>
          <div onClick={() => handleNavigate('/budgets')} style={styles.menuItem}>
            <span style={styles.menuIcon}>💰</span> Budget Planner
          </div>
          <div onClick={() => handleNavigate('/lend')} style={styles.menuItem}>
            <span style={styles.menuIcon}>🤝</span> Lend & Return
          </div>
          <div onClick={() => handleNavigate('/categories')} style={styles.menuItem}>
            <span style={styles.menuIcon}>🏷️</span> Manage Categories
          </div>
          <div onClick={() => handleNavigate('/export')} style={styles.menuItem}>
            <span style={styles.menuIcon}>📥</span> Export Center
          </div>
          <div style={styles.divider}></div>
          <div onClick={() => handleNavigate('/logout')} style={{ ...styles.menuItem, color: '#ff4757' }}>
            <span style={styles.menuIcon}>🚪</span> Logout
          </div>
        </div>
      </div>

      {/* --- GMAIL-STYLE PROFILE DROPDOWN --- */}
      {isProfileOpen && (
        <>
          <div style={{...styles.overlay, background: 'transparent'}} onClick={() => setIsProfileOpen(false)} />
          <div style={styles.profileDropdown}>
            <div style={styles.profileHeader}>
              <div style={styles.profileAvatarLarge}>D</div>
              <div>
                <div style={styles.profileName}>Dheeraj Saini</div>
                <div style={styles.profileEmail}>dheeraj@example.com</div>
              </div>
            </div>
            <button style={styles.manageBtn}>Manage your account</button>
            <div style={styles.divider}></div>
            <div style={styles.profileActions}>
              <div style={styles.actionItem}>➕ Add another account</div>
              <div onClick={() => handleNavigate('/logout')} style={styles.actionItem}>🚪 Sign out</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const styles = {
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', background: '#0a0e1a', position: 'sticky', top: 0, zIndex: 100,
    borderBottom: '1px solid #1a1f35'
  },
  leftSection: { display: 'flex', alignItems: 'center', gap: '16px' },
  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' },
  logoText: { fontSize: '20px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' },
  profileBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 },
  profileAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #00f5a0, #0066ff)', color: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px' },
  
  // Drawer Styles
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 },
  drawer: { position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', background: '#1a1f35', zIndex: 1000, transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', borderRight: '1px solid #2a2f45', display: 'flex', flexDirection: 'column' },
  drawerHeader: { padding: '24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2f45' },
  closeBtn: { background: '#2a2f45', border: 'none', color: '#8892b0', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  drawerMenu: { padding: '16px 0', overflowY: 'auto' },
  menuItem: { padding: '16px 24px', fontSize: '15px', color: '#fff', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' },
  menuIcon: { fontSize: '18px' },
  divider: { height: '1px', background: '#2a2f45', margin: '8px 0' },

  // Profile Dropdown Styles
  profileDropdown: { position: 'absolute', top: '70px', right: '16px', background: '#1a1f35', borderRadius: '16px', width: '320px', border: '1px solid #2a2f45', zIndex: 1000, padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  profileHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' },
  profileAvatarLarge: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #00f5a0, #0066ff)', color: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '20px' },
  profileName: { fontSize: '16px', fontWeight: '700', color: '#fff' },
  profileEmail: { fontSize: '13px', color: '#8892b0', marginTop: '2px' },
  manageBtn: { width: '100%', padding: '10px', background: 'transparent', border: '1px solid #2a2f45', borderRadius: '20px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '8px' },
  profileActions: { paddingTop: '8px' },
  actionItem: { padding: '12px', fontSize: '14px', color: '#fff', cursor: 'pointer', borderRadius: '8px' }
};