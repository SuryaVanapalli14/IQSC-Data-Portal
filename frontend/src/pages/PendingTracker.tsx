import { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, Search, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface PendingResponse {
  id: string;
  submittedAt: string;
  form: { id: string; title: string };
  respondent: { name: string; email: string; department: string };
}

const PendingTracker = () => {
  const [pendingItems, setPendingItems] = useState<PendingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPendingData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/pending-tracker`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPendingItems(res.data);
      } catch (err) {
        console.error('Failed to fetch pending tracker:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPendingData();
  }, []);

  const filteredItems = pendingItems.filter(item => {
    const matchesSearch = item.form?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.respondent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.respondent?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || item.respondent?.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const availableDepts = Array.from(new Set(pendingItems.map(i => i.respondent?.department).filter(Boolean)));

  if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading HOD Pending Submissions Tracker...</div>;

  return (
    <div className="container animate-fade" style={{ paddingBottom: '4rem' }}>
      <button 
        onClick={() => navigate('/admin')} 
        style={{ 
          background: 'none', 
          border: 'none',
          padding: 0,
          color: 'var(--text-primary)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          marginBottom: '1.5rem',
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontWeight: '500'
        }}
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '2.1rem', fontWeight: '700', margin: 0, letterSpacing: '-0.01em' }}>
              ⏳ HOD Pending Tracker
            </h1>
            <span style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              background: pendingItems.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: pendingItems.length > 0 ? '#d97706' : '#22c55e',
              border: pendingItems.length > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              {pendingItems.length} Pending at HOD
            </span>
          </div>
          <p style={{ opacity: 0.7, fontSize: '1rem', marginTop: '6px' }}>
            Track faculty submissions currently stopped/pending at HOD level awaiting review and approval.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          <input
            type="text"
            placeholder="Search by form, faculty name, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input"
            style={{ width: '100%', paddingLeft: '40px' }}
          />
        </div>

        <select
          value={selectedDept}
          onChange={e => setSelectedDept(e.target.value)}
          className="input"
          style={{ padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          <option value="ALL">All Departments</option>
          {availableDepts.map(dept => (
            <option key={dept} value={dept}>{dept} Department</option>
          ))}
        </select>
      </div>

      {/* Main Table */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>Form Title</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>Faculty Member</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>Department</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>Submitted Date</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>Pending Duration</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const elapsedMs = new Date().getTime() - new Date(item.submittedAt).getTime();
              const hoursAgo = Math.floor(elapsedMs / (1000 * 60 * 60));
              const daysAgo = Math.floor(hoursAgo / 24);
              const pendingText = daysAgo > 0 ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago` : hoursAgo > 0 ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago` : 'Just now';

              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '1rem', fontWeight: '700' }}>{item.form?.title}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600' }}>{item.respondent?.name || 'Anonymous'}</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.55 }}>{item.respondent?.email}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(37, 99, 235, 0.1)',
                      color: 'var(--accent-primary)',
                      fontWeight: 'bold',
                      fontSize: '0.78rem'
                    }}>
                      {item.respondent?.department}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', opacity: 0.8 }}>
                    {new Date(item.submittedAt).toLocaleDateString()} {new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      background: daysAgo >= 2 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      color: daysAgo >= 2 ? '#ef4444' : '#d97706',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontWeight: 'bold',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={12} /> {pendingText}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <Link
                      to={`/admin/responses/${item.form?.id}`}
                      style={{
                        color: 'var(--accent-primary)',
                        textDecoration: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Review Form <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem', opacity: 0.5 }}>
                  No pending submissions found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingTracker;
