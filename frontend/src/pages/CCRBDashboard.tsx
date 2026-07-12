import { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, ClipboardList, ShieldAlert, CheckCircle, FileText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface Metric {
  category: string;
  name: string;
  value: number;
  period: string;
  color: string;
  totalFiled?: number | null;
  totalSheets?: number | null;
  formula?: string | null;
}

interface Form {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  _count?: { responses: number };
}

const CCRBDashboard = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        const formsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms`, { headers });
        setForms(formsRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>Loading Dashboard...</div>;

  return (
    <div className="container animate-fade" style={{ 
      height: 'calc(100vh - 64px)', 
      padding: '1.25rem 2rem', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      overflow: 'hidden'
    }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '2.1rem', fontWeight: '700', margin: 0, letterSpacing: '-0.01em' }}>HOD Page</h1>
            <span style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981'
            }}>
              HOD Access
            </span>
          </div>
          <p style={{ opacity: 0.6, fontSize: '0.95rem', margin: '4px 0 0 0' }}>Welcome, department HOD. Real-time overview of academic forms and review tracking.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', lineHeight: '1' }}>
            <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', opacity: 0.5, marginTop: '2px' }}>
            {format(currentTime, 'EEEE, do MMMM yyyy')}
          </div>
        </div>
      </div>

      {/* Row 1: KPI Cards removed */}

      {/* Main Secondary Area - Form Summary Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        <div style={{ 
          background: 'var(--card-bg)', 
          borderRadius: '16px', 
          border: '1px solid var(--border-color)', 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1 
        }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.01)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Departmental Forms Overview</h2>
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', opacity: 0.6 }}>Form Details</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', opacity: 0.6 }}>Created Date</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', opacity: 0.6, textAlign: 'center' }}>Submissions</th>
                  <th style={{ padding: '1rem', fontSize: '0.85rem', opacity: 0.6, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map(form => (
                  <tr key={form.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-primary)', padding: '8px', borderRadius: '8px' }}>
                          <ClipboardList size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{form.title}</div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.5, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {form.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
                      {format(new Date(form.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold', 
                        background: 'rgba(37, 99, 235, 0.1)', 
                        color: 'var(--accent-primary)' 
                      }}>
                        {form._count?.responses || 0}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <Link 
                        to={`/admin/responses/${form.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--accent-primary)',
                          textDecoration: 'none',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}
                      >
                        Review Submissions <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {forms.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                      No academic forms available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CCRBDashboard;
