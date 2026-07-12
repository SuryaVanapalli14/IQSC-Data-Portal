import { useEffect, useState } from 'react';
import axios from 'axios';
import { Sliders, Save, CheckCircle, AlertTriangle, Percent } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Metric {
  id: string;
  category: string;
  name: string;
  value: number;
  formula: string | null;
  period: string | null;
  color: string | null;
}

const ManageMetrics = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/ccrb/metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setErrorMsg('Failed to load metrics from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updatedFields: Partial<Metric>) => {
    setSavingId(id);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const target = metrics.find(m => m.id === id);
      if (!target) return;

      const payload = {
        ...target,
        ...updatedFields,
        value: parseFloat(String(updatedFields.value ?? target.value))
      };

      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/ccrb/metrics/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMetrics(prev => prev.map(m => m.id === id ? res.data : m));
      setSuccessMsg(`Metric "${payload.name}" updated successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to update metric.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-primary)' }}>
        <div className="animate-pulse" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Loading metrics console...</div>
      </div>
    );
  }

  const auditMetrics = metrics.filter(m => m.category === 'IQAC_AUDIT');

  return (
    <div className="container animate-fade" style={{ padding: '2rem 2.5rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', paddingBottom: '6rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders style={{ color: 'var(--accent-primary)' }} /> Manage Academic Oversight Metrics
          </h1>
          <p style={{ opacity: 0.6, fontSize: '0.95rem', marginTop: '4px' }}>Configure evaluation rates and audits displayed in HOD monitoring dashboards.</p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="animate-fade" style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#22c55e', padding: '12px 18px', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="animate-fade" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '12px 18px', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} />
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr', gap: '2.5rem' }}>
        
        {/* Left Side: Audit Metrics List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📊 IQAC Audit Rates
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {auditMetrics.map(m => (
                <div key={m.id} style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontWeight: '800', fontSize: '1.1rem', color: m.color || 'var(--accent-primary)' }}>
                        {m.name.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '6px', opacity: 0.7 }}>Metric Value (%)</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          className="input"
                          min="0"
                          max="100"
                          value={m.value}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMetrics(prev => prev.map(item => item.id === m.id ? { ...item, value: val } : item));
                          }}
                          style={{ padding: '8px 30px 8px 12px', fontSize: '0.9rem', width: '100%', borderRadius: '8px', height: '38px', boxSizing: 'border-box', marginBottom: 0 }}
                        />
                        <Percent size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '6px', opacity: 0.7 }}>Audit Period</label>
                      <input 
                        type="text" 
                        className="input"
                        value={m.period || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMetrics(prev => prev.map(item => item.id === m.id ? { ...item, period: val } : item));
                        }}
                        style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', borderRadius: '8px', height: '38px', boxSizing: 'border-box', marginBottom: 0 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '6px', opacity: 0.7 }}>Description / Calculation Formula</label>
                    <input 
                      type="text" 
                      className="input"
                      value={m.formula || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMetrics(prev => prev.map(item => item.id === m.id ? { ...item, formula: val } : item));
                      }}
                      style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', borderRadius: '8px', height: '38px', boxSizing: 'border-box', marginBottom: 0 }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleUpdate(m.id, { value: m.value, period: m.period, formula: m.formula })}
                      disabled={savingId === m.id}
                      style={{
                        height: '38px',
                        padding: '0 16px',
                        borderRadius: '8px',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        margin: 0
                      }}
                    >
                      <Save size={16} /> Save Changes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '800' }}>ℹ️ HOD Oversight Guide</h3>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.8rem', opacity: 0.8, display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.5' }}>
              <li>Configure dynamically computed audit metrics and compliance indexes.</li>
              <li>Updates saved in this console will reflect instantly on HOD dashboards.</li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
};

export default ManageMetrics;
