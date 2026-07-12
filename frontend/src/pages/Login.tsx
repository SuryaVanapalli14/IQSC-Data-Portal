import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, Moon, Sun, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, toggleTheme, theme } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      backgroundImage: theme === 'dark'
        ? 'radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.05) 0%, transparent 50%)'
        : 'radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.03) 0%, transparent 50%)',
      padding: '1rem',
      fontFamily: 'var(--font-family)'
    }}>

      <div className="animate-fade" style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--card-bg)',
        padding: '2.5rem',
        borderRadius: '24px',
        boxShadow: theme === 'dark' ? '0 20px 40px rgba(0,0,0,0.4)' : '0 20px 40px rgba(0,0,0,0.06)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        <div style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
          <img src="/ap_police.png" alt="AP Police" style={{ height: '64px', width: 'auto' }} />
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)', letterSpacing: '1px' }}>
              POLICE FORMS
            </h1>
            <p style={{ margin: 0, opacity: 0.5, fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>
              Demo Access
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            width: '100%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={18} />
              <input
                type="email"
                className="input"
                placeholder="officer@police.gov"
                style={{ paddingLeft: '42px', marginBottom: 0 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={18} />
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                style={{ paddingLeft: '42px', marginBottom: 0 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {loading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              fontWeight: '700',
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: 0.7
            }}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;


