import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowRight } from 'lucide-react';

const Landing = () => {
  const { user } = useApp();

  if (user) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'CCRB') return <Navigate to="/ccrb" replace />;
    return <Navigate to="/officer" replace />;
  }

  const images = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17];

  return (
    <div style={{ 
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: 'var(--font-family)',
      background: 'var(--bg-primary)'
    }}>

      {/* LEFT — Scrolling Gallery */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden', 
        position: 'relative',
        borderRight: '1px solid var(--border-color)'
      }}>
        {/* Fade overlay top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '120px', zIndex: 2,
          background: 'linear-gradient(to bottom, var(--bg-primary), transparent)'
        }} />
        {/* Fade overlay bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px', zIndex: 2,
          background: 'linear-gradient(to top, var(--bg-primary), transparent)'
        }} />

        {/* Two columns scrolling vertically */}
        <div style={{ display: 'flex', gap: '10px', height: '100%', padding: '0 10px' }}>
          {/* Column 1 — scroll up */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="gallery-col-up">
              {[...images, ...images].map((n, i) => (
                <div key={`c1-${i}`} style={{ borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', border: '1px solid var(--border-color)' }}>
                  <img
                    src={`/${n}.jpg`}
                    alt={`AP Police ${n}`}
                    style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Column 2 — scroll down */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="gallery-col-down">
              {[...images, ...images].reverse().map((n, i) => (
                <div key={`c2-${i}`} style={{ borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', border: '1px solid var(--border-color)' }}>
                  <img
                    src={`/${n}.jpg`}
                    alt={`AP Police ${n}`}
                    style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Access Portal */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '3rem',
        textAlign: 'center',
        background: 'var(--bg-primary)'
      }}>
        <div className="animate-fade" style={{ maxWidth: '440px', width: '100%' }}>
          <img 
            src="/ap_police.png" 
            alt="AP Police Logo" 
            style={{ height: '90px', width: 'auto', marginBottom: '1.5rem', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.1))' }} 
          />

          <h1 style={{ 
            fontSize: '2.6rem', 
            fontWeight: '900', 
            marginBottom: '0.75rem', 
            color: 'var(--text-primary)', 
            letterSpacing: '-1px', 
            lineHeight: '1.1' 
          }}>
            Andhra Pradesh <br/>
            <span style={{ color: 'var(--accent-primary)' }}>Police Forms</span>
          </h1>

          <p style={{ 
            fontSize: '1rem', 
            opacity: 0.55, 
            marginBottom: '2.5rem', 
            lineHeight: '1.7',
            maxWidth: '360px',
            margin: '0 auto 2.5rem'
          }}>
            Official digital infrastructure for departmental form management, submissions, and real-time audit tracking.
          </p>

          <Link 
            to="/login" 
            className="btn-primary" 
            style={{ 
              padding: '15px 36px', 
              fontSize: '1rem', 
              fontWeight: '800', 
              textDecoration: 'none', 
              borderRadius: '50px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 10px 25px rgba(37, 99, 235, 0.25)',
              letterSpacing: '0.5px'
            }}
          >
            Access Portal <ArrowRight size={18} />
          </Link>

          <p style={{ marginTop: '3rem', fontSize: '0.75rem', opacity: 0.3, fontWeight: '600' }}>
            © 2026 Government of Andhra Pradesh<br/>Official Personnel Use Only
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
