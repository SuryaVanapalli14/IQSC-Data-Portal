import { useApp } from '../context/AppContext';
import { LayoutDashboard, FileText, Download, History, ClipboardList, ChevronLeft, ChevronRight, LogOut, User, Users, Sliders } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const { user, isSidebarCollapsed, setIsSidebarCollapsed, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const adminLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Audit Logs', path: '/admin/logs', icon: FileText },
    { name: 'Export Data', path: '/admin/export', icon: Download },
  ];

  const facultyLinks = [
    { name: 'Forms', path: '/faculty', icon: ClipboardList },
    { name: 'My History', path: '/faculty/history', icon: History },
  ];

  const hodLinks = [
    { name: 'Dashboard', path: '/hod', icon: LayoutDashboard },
    { name: 'View Responses', path: '/admin', icon: ClipboardList },
    { name: 'Export Records', path: '/admin/export', icon: Download },
  ];

  const links = user.role === 'IQAC_ADMIN' ? adminLinks : (user.role === 'HOD' ? hodLinks : facultyLinks);

  return (
    <aside style={{
      width: isSidebarCollapsed ? '5rem' : '16rem',
      background: 'var(--card-bg)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: '64px',
      height: 'calc(100vh - 64px)',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 100, // Ensure sidebar itself is above main content
      overflow: 'visible' // Allow the toggle button to 'peak' out
    }}>
      {/* Content wrapper with clipping for smooth width transition */}
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '1.5rem 0'
      }}>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;

            return (
              <Link
                key={link.path}
                to={link.path}
                title={isSidebarCollapsed ? link.name : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: isSidebarCollapsed ? '0.75rem 0' : '0.75rem 1.5rem',
                  justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                  background: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                  borderLeft: !isSidebarCollapsed && isActive ? '4px solid var(--accent-primary)' : '4px solid transparent',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? '700' : '500',
                  transition: 'all 0.2s ease',
                  opacity: isActive ? 1 : 0.7,
                  position: 'relative'
                }}
              >
                <Icon size={20} style={{ flexShrink: 0 }} />
                {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{link.name}</span>}

                {isSidebarCollapsed && isActive && (
                  <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: 'var(--accent-primary)', borderRadius: '0 2px 2px 0' }} />
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'rgba(0,0,0,0.02)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            minWidth: 0
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--accent-primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <User size={18} />
            </div>
            {!isSidebarCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>{user.role}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            title="Logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: isSidebarCollapsed ? '8px' : '8px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <LogOut size={18} />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Floating Toggle Button on Right Border Middle */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        style={{
          position: 'absolute',
          right: '-14px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'var(--accent-primary)',
          border: '1px solid var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          color: 'white',
          transition: 'all 0.2s ease',
          padding: 0
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
        }}
      >
        {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
};

export default Sidebar;


