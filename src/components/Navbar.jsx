import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const mainTabs = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/analytics', icon: '📊', label: 'Analytics' },
  { path: '/entry', icon: '➕', label: '' },
  { path: '/transactions', icon: '📋', label: 'Transactions' },
  { path: '/insights', icon: '💡', label: 'Insights' },
];

const moreTabs = [
  { path: '/budget', icon: '💰', label: 'Budget Planner', desc: 'Set and track category budgets' },
  { path: '/lend', icon: '🤝', label: 'Lend, Borrow & Return', desc: 'Track money lent, borrowed, or returned' },
  { path: '/categories', icon: '🏷️', label: 'Manage Categories', desc: 'Add and edit your categories' },
  { path: '/profile', icon: '👤', label: 'Profile', desc: 'Account settings and details' },
  { path: '/export', icon: '📤', label: 'Export Center', desc: 'Download reports and data' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const handleMoreTab = (path) => {
    setShowMore(false);
    navigate(path);
  };

  const isMoreActive = moreTabs.some(t => t.path === location.pathname);

  return (
    <>
      {/* More Drawer Overlay */}
      {showMore && (
        <div
          style={styles.overlay}
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More Drawer */}
      <div style={{
        ...styles.drawer,
        transform: showMore ? 'translateY(0)' : 'translateY(100%)',
      }}>
        <div style={styles.drawerHandle} />
        <div style={styles.drawerTitle}>More Options</div>

        {moreTabs.map(tab => (
          <div
            key={tab.path}
            onClick={() => handleMoreTab(tab.path)}
            style={{
              ...styles.drawerItem,
              background: location.pathname === tab.path ? '#00f5a011' : 'transparent',
              borderColor: location.pathname === tab.path ? '#00f5a033' : '#2a2f45',
            }}
          >
            <div style={styles.drawerIcon}>{tab.icon}</div>
            <div style={styles.drawerInfo}>
              <div style={{
                ...styles.drawerLabel,
                color: location.pathname === tab.path ? '#00f5a0' : '#fff',
              }}>
                {tab.label}
              </div>
              <div style={styles.drawerDesc}>{tab.desc}</div>
            </div>
            <div style={styles.drawerArrow}>›</div>
          </div>
        ))}

        {/* Logout inside More */}
        <div
          onClick={() => { logout(); navigate('/login'); setShowMore(false); }}
          style={{ ...styles.drawerItem, borderColor: '#ff475733', marginTop: '8px' }}
        >
          <div style={styles.drawerIcon}>🚪</div>
          <div style={styles.drawerInfo}>
            <div style={{ ...styles.drawerLabel, color: '#ff4757' }}>Logout</div>
            <div style={styles.drawerDesc}>Sign out of your account</div>
          </div>
        </div>
      </div>

      {/* Bottom Navbar */}
      <nav style={styles.nav}>
        {mainTabs.map(tab => {
          const isActive = location.pathname === tab.path;
          const isEntry = tab.path === '/entry';

          return (
            <Link
              key={tab.path}
              to={tab.path}
              style={{
                ...styles.tab,
                ...(isEntry ? styles.entryTab : {}),
              }}
            >
              <span style={{
                ...styles.icon,
                ...(isEntry ? styles.entryIcon : {}),
              }}>
                {tab.icon}
              </span>
              {!isEntry && (
                <span style={{
                  ...styles.label,
                  color: isActive ? '#00f5a0' : '#8892b0',
                }}>
                  {tab.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* More Tab */}
        <div
          onClick={() => setShowMore(!showMore)}
          style={styles.tab}
        >
          <span style={styles.icon}>
            {isMoreActive ? '●●●' : '···'}
          </span>
          <span style={{
            ...styles.label,
            color: isMoreActive || showMore ? '#00f5a0' : '#8892b0',
          }}>
            More
          </span>
        </div>
      </nav>
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 998,
  },
  drawer: {
    position: 'fixed',
    bottom: '70px',
    left: 0, right: 0,
    background: '#1a1f35',
    borderTop: '1px solid #2a2f45',
    borderRadius: '20px 20px 0 0',
    padding: '12px 20px 20px',
    zIndex: 999,
    transition: 'transform 0.3s ease',
  },
  drawerHandle: {
    width: '40px', height: '4px',
    background: '#2a2f45', borderRadius: '2px',
    margin: '0 auto 16px',
  },
  drawerTitle: {
    fontSize: '13px', fontWeight: '700',
    color: '#8892b0', letterSpacing: '1px',
    marginBottom: '12px',
  },
  drawerItem: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px', borderRadius: '14px',
    border: '1px solid #2a2f45', marginBottom: '8px',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  drawerIcon: {
    fontSize: '24px', width: '44px', height: '44px',
    background: '#0a0e1a', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  drawerInfo: { flex: 1 },
  drawerLabel: { fontSize: '15px', fontWeight: '600', marginBottom: '2px' },
  drawerDesc: { fontSize: '12px', color: '#8892b0' },
  drawerArrow: { fontSize: '20px', color: '#8892b0' },
  nav: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    height: '70px',
    background: '#1a1f35',
    borderTop: '1px solid #2a2f45',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0 10px',
    zIndex: 1000,
  },
  tab: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '4px',
    textDecoration: 'none', padding: '8px 10px',
    borderRadius: '12px', cursor: 'pointer',
    transition: 'all 0.2s', border: 'none',
    background: 'transparent',
  },
  entryTab: {
    background: 'linear-gradient(135deg, #00f5a0, #0066ff)',
    borderRadius: '50%', width: '52px', height: '52px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginTop: '-20px',
    boxShadow: '0 4px 20px rgba(0, 245, 160, 0.4)',
  },
  icon: { fontSize: '22px' },
  entryIcon: { fontSize: '24px' },
  label: { fontSize: '10px', fontWeight: '500' },
};