import { useApp } from '../context/AppContext';
import { Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, theme, toggleTheme, fontSize, setFontSize } = useApp();

  if (!user) return null;

  return (
    <nav style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '64px',
      background: 'var(--card-bg)', 
      borderBottom: '1px solid var(--border-color)', 
      padding: '0 2rem', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      zIndex: 1000,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <img src="/ap_police.png" alt="AP Police" style={{ height: '52px', width: 'auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ 
              fontSize: '20px', 
              fontWeight: '900', 
              color: 'var(--text-primary)', 
              letterSpacing: '1px',
              lineHeight: '1.2'
            }}>
              POLICE FORMS
            </span>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 'bold', 
              color: 'var(--accent-primary)', 
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>
              Official Portal
            </span>
          </div>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--card-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setFontSize(14)} 
            style={{ background: fontSize === 14 ? 'var(--accent-primary)' : 'none', color: fontSize === 14 ? 'white' : 'var(--text-primary)', padding: '4px 8px', fontSize: '12px' }}
            title="Small Text"
          >
            A
          </button>
          <button 
            onClick={() => setFontSize(16)} 
            style={{ background: fontSize === 16 ? 'var(--accent-primary)' : 'none', color: fontSize === 16 ? 'white' : 'var(--text-primary)', padding: '4px 8px', fontSize: '14px' }}
            title="Default Text"
          >
            A+
          </button>
          <button 
            onClick={() => setFontSize(20)} 
            style={{ background: fontSize === 20 ? 'var(--accent-primary)' : 'none', color: fontSize === 20 ? 'white' : 'var(--text-primary)', padding: '4px 8px', fontSize: '16px' }}
            title="Large Text"
          >
            A++
          </button>
        </div>

        <button onClick={toggleTheme} style={{ background: 'none', color: 'var(--text-primary)' }}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;


