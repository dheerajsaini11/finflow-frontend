import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { updateProfilePicture } from '../services/api';

export default function Header() {
  const { user, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  
  // NEW: Track hover state for menu items
  const [hoveredItem, setHoveredItem] = useState(null);
  
  const navigate = useNavigate();
  // NEW: Get current location to highlight active tab
  const location = useLocation();

  const handleNavigate = (path) => {
    setIsDrawerOpen(false);
    setIsProfileOpen(false);
    navigate(path);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        toast.success('Profile picture updated!');
      };
      reader.readAsDataURL(file);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  // NEW: Helper function to generate dynamic styles for menu items
  const getMenuItemStyle = (path, isLogout = false) => {
    const isActive = location.pathname === path;
    const isHovered = hoveredItem === path;
    
    let baseStyle = {
      padding: '16px 24px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      borderRadius: '12px', // Added border radius for nice hover effect
      margin: '4px 12px',   // Added margin to float it slightly inside the drawer
      transition: 'all 0.2s ease',
    };

  // Change your useAuth hook to include updateUser:
  const { user, logout, updateUser } = useAuth();

  const handleImageUpload = async (e) => {
    // Exactly target the first file in the array by adding  here:
    const file = e.target.files; 
    
    if (file) {
      const formData = new FormData();
      formData.append('profile', file); 

      try {
        const toastId = toast.loading('Uploading to Supabase...');
        const res = await updateProfilePicture(formData);
        
        // Globally update user context
        updateUser({ avatars_url: res.data.avatars_url });
        toast.success('Profile picture updated!', { id: toastId });
      } catch (error) {
        toast.dismiss();
        toast.error('Upload failed. Please try again.');
      }
    }
  };

    if (isLogout) {
      baseStyle.color = '#ff4757';
      baseStyle.background = isHovered ? '#ff475711' : 'transparent';
    } else {
      baseStyle.color = isActive ? '#00f5a0' : (isHovered ? '#fff' : '#8892b0');
      // Glass effect on hover/active
      baseStyle.background = isActive ? 'rgba(0, 245, 160, 0.1)' : (isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent');
      // Slight border for active state
      if (isActive) baseStyle.border = '1px solid rgba(0, 245, 160, 0.2)';
    }

    return baseStyle;
  };

  return (
    <>
      <div style={styles.topBar}>
        <div style={styles.leftSection}>
          <button onClick={() => setIsDrawerOpen(true)} style={styles.iconBtn}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div>
            <div style={styles.greeting}>{getGreeting()} 👋</div>
            <div style={styles.userName}>{user?.name || 'User'}</div>
          </div>
        </div>

        <button onClick={() => setIsProfileOpen(!isProfileOpen)} style={styles.profileBtn}>
          {user?.avatars_url? (
            <img src={user.avatars_url} alt="Profile" style={styles.profileAvatar} />
          ) : (
            <div style={styles.profileAvatar}>
              {user?.name? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </button>
      </div>

      {isDrawerOpen && <div style={styles.overlay} onClick={() => setIsDrawerOpen(false)} />}
      <div style={{ ...styles.drawer, transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
        <div style={styles.drawerHeader}>
          <span style={styles.logoText}>Options</span>
          <button onClick={() => setIsDrawerOpen(false)} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.drawerMenu}>
          
          <div 
            onClick={() => handleNavigate('/budget')} 
            style={getMenuItemStyle('/budget')}
            onMouseEnter={() => setHoveredItem('/budget')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <span style={styles.menuIcon}>💰</span> Budget Planner
          </div>

          <div 
            onClick={() => handleNavigate('/lend')} 
            style={getMenuItemStyle('/lend')}
            onMouseEnter={() => setHoveredItem('/lend')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <span style={styles.menuIcon}>🤝</span> Lend, Borrow & Return
          </div>

          <div 
            onClick={() => handleNavigate('/categories')} 
            style={getMenuItemStyle('/categories')}
            onMouseEnter={() => setHoveredItem('/categories')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <span style={styles.menuIcon}>🏷️</span> Manage Categories
          </div>

          <div 
            onClick={() => handleNavigate('/export')} 
            style={getMenuItemStyle('/export')}
            onMouseEnter={() => setHoveredItem('/export')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <span style={styles.menuIcon}>📥</span> Export Center
          </div>

        </div>
      </div>

      {isProfileOpen && (
        <>
          <div style={{...styles.overlay, background: 'transparent'}} onClick={() => setIsProfileOpen(false)} />
          <div style={styles.profileDropdown}>
            <div style={styles.profileHeaderRow}>
              <label style={styles.profileUploadWrapper}>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                {user?.avatars_url? (
                  <img src={user.avatars_url} alt="Profile" style={styles.profileAvatarLarge} />
                ) : (
                  <div style={styles.profileAvatarLarge}>
                    {user?.name? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div style={styles.uploadIconBadge}>📷</div>
              </label>
              <div>
                <div style={styles.profileNameLarge}>{user?.name || 'User'}</div>
                <div style={styles.profileEmail}>{user?.email || 'user@example.com'}</div>
              </div>
            </div>
            
            {/* Updated Manage Button */}
            <button 
              onClick={() => handleNavigate('/profile')} 
              style={styles.manageBtn}
            >
              Manage your account
            </button>

            <div style={styles.divider}></div>

            <div style={styles.profileActions}>
              <div 
                onClick={logout} 
                style={{
                  ...styles.actionItem,
                  background: hoveredItem === 'sign_out' ? '#ff475711' : 'transparent',
                  color: '#ff4757'
                }}
                onMouseEnter={() => setHoveredItem('sign_out')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                🚪 Sign out
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const styles = {
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '10px' },
  leftSection: { display: 'flex', alignItems: 'center', gap: '16px' },
  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' },
  greeting: { fontSize: '13px', color: '#8892b0', marginBottom: '2px' },
  userName: { fontSize: '22px', fontWeight: '700', color: '#fff', lineHeight: '1' },
  profileBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 },
  profileAvatar: { width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #00f5a0, #0066ff)', color: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '18px', objectFit: 'cover' },
  
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 },
  drawer: { position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', background: '#1a1f35', zIndex: 1000, transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', borderRight: '1px solid #2a2f45', display: 'flex', flexDirection: 'column' },
  drawerHeader: { padding: '24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2f45', marginBottom: '8px' },
  logoText: { fontSize: '20px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' },
  closeBtn: { background: '#2a2f45', border: 'none', color: '#8892b0', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  drawerMenu: { padding: '8px 0', overflowY: 'auto' },
  menuIcon: { fontSize: '18px' },
  divider: { height: '1px', background: '#2a2f45', margin: '16px 20px' },

  profileDropdown: { position: 'absolute', top: '75px', right: '20px', background: '#1a1f35', borderRadius: '16px', width: '320px', border: '1px solid #2a2f45', zIndex: 1000, padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  profileHeaderRow: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' },
  profileUploadWrapper: { position: 'relative', cursor: 'pointer' },
  profileAvatarLarge: { width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #00f5a0, #0066ff)', color: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '24px', objectFit: 'cover' },
  uploadIconBadge: { position: 'absolute', bottom: '-4px', right: '-4px', background: '#2a2f45', borderRadius: '50%', padding: '4px', fontSize: '10px', border: '2px solid #1a1f35', color: '#fff' },
  profileNameLarge: { fontSize: '16px', fontWeight: '700', color: '#fff' },
  profileEmail: { fontSize: '13px', color: '#8892b0', marginTop: '2px' },
  manageBtn: { width: '100%', padding: '10px', background: 'transparent', border: '1px solid #2a2f45', borderRadius: '20px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '8px', transition: 'background 0.2s' },
  profileActions: { paddingTop: '8px' },
  actionItem: { padding: '12px', fontSize: '14px', color: '#fff', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s', fontWeight: '500' },
};