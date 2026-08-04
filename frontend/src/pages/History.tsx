import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { History as HistoryIcon, FileCheck, ExternalLink, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const History = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/responses/my-history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="container">Loading History...</div>;

  return (
    <div className="container animate-fade">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2.1rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>Submission History</h1>
        <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>Review all the official forms you have submitted previously.</p>
      </div>

      {history.length === 0 ? (
        <div style={{ 
          background: 'var(--card-bg)', 
          padding: '4rem', 
          borderRadius: '16px', 
          textAlign: 'center', 
          border: '2px dashed var(--border-color)' 
        }}>
          <HistoryIcon size={48} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
          <p style={{ fontSize: '1.1rem', opacity: 0.5 }}>You haven't submitted any forms yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {history.map((item) => (
            <div key={item.id} style={{ 
              background: 'var(--card-bg)', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }} onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
            }} onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
                  <FileCheck size={24} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.form.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', opacity: 0.5, marginTop: '2px' }}>
                    <Calendar size={12} />
                    {format(new Date(item.submittedAt), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '700', 
                  color: item.status === 'APPROVED' ? '#22c55e' : 
                         item.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
                  background: item.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.1)' : 
                              item.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase'
                }}>
                  {item.status === 'PENDING' ? 'Pending Review at HOD' : item.status === 'REJECTED' ? 'Re-Submit' : item.status}
                </span>
                <Link 
                  to={`/faculty/submission/${item.id}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    fontSize: '0.85rem', 
                    fontWeight: 'bold', 
                    color: 'var(--accent-primary)',
                    textDecoration: 'none'
                  }}
                >
                  View Data <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;


