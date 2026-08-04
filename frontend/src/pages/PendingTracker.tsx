import { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, Search, ArrowRight, ArrowLeft, ShieldAlert, User, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface PendingResponse {
  id: string;
  submittedAt: string;
  form: { id: string; title: string };
  respondent: { name: string; email: string; department: string };
}

interface HodUser {
  id: string;
  name: string;
  email: string;
  department: string;
}

const PendingTracker = () => {
  const [responses, setResponses] = useState<PendingResponse[]>([]);
  const [hods, setHods] = useState<HodUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptTile, setSelectedDeptTile] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPendingData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/pending-tracker`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.responses) {
          setResponses(res.data.responses);
          setHods(res.data.hods || []);
        } else {
          setResponses(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch pending tracker:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPendingData();
  }, []);

  if (loading) return <div className="container" style={{ padding: '3rem', textAlign: 'center', opacity: 0.7 }}>Loading HOD Pending Submissions Tracker...</div>;

  // Group pending responses by department
  const deptsWithPending = Array.from(new Set(responses.map(r => r.respondent?.department).filter(Boolean)));

  const getHodForDept = (dept: string) => {
    const hod = hods.find(h => h.department === dept);
    if (hod) return hod;
    return { name: `${dept} HOD`, email: `hod_${dept.toLowerCase()}@mail.com`, department: dept };
  };

  const getDepartmentStats = (dept: string) => {
    const deptResponses = responses.filter(r => r.respondent?.department === dept);
    const count = deptResponses.length;
    const sorted = [...deptResponses].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    const oldest = sorted[0];
    return { count, oldest, responses: deptResponses };
  };

  const selectedHodObj = selectedDeptTile ? getHodForDept(selectedDeptTile) : null;
  const selectedDeptStats = selectedDeptTile ? getDepartmentStats(selectedDeptTile) : null;

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
              background: responses.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: responses.length > 0 ? '#d97706' : '#22c55e',
              border: responses.length > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              {responses.length} Total Pending at HODs
            </span>
          </div>
          <p style={{ opacity: 0.7, fontSize: '1rem', marginTop: '6px' }}>
            Track faculty requests stopped/pending at each department HOD awaiting review.
          </p>
        </div>
      </div>

      {/* VIEW LEVEL 1: HOD TILES GRID */}
      {!selectedDeptTile && (
        <>
          {deptsWithPending.length === 0 ? (
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '16px',
              border: '2px dashed var(--border-color)',
              padding: '4rem 2rem',
              textAlign: 'center'
            }}>
              <CheckCircle2 size={48} style={{ color: '#22c55e', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>All Clear! No Pending HOD Approvals</h3>
              <p style={{ opacity: 0.6, fontSize: '0.95rem' }}>There are currently no faculty submissions pending review at any department HOD.</p>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', opacity: 0.8, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                HOD Departments With Pending Reviews ({deptsWithPending.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {deptsWithPending.map(dept => {
                  const hod = getHodForDept(dept);
                  const stats = getDepartmentStats(dept);

                  const elapsedMs = stats.oldest ? new Date().getTime() - new Date(stats.oldest.submittedAt).getTime() : 0;
                  const hoursAgo = Math.floor(elapsedMs / (1000 * 60 * 60));
                  const daysAgo = Math.floor(hoursAgo / 24);
                  const pendingTimeText = daysAgo > 0 ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago` : hoursAgo > 0 ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago` : 'Just now';

                  return (
                    <div 
                      key={dept} 
                      onClick={() => setSelectedDeptTile(dept)}
                      style={{
                        background: 'var(--card-bg)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        padding: '1.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(37, 99, 235, 0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                      }}
                    >
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent-primary)' }} />

                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: 'rgba(37, 99, 235, 0.1)',
                            color: 'var(--accent-primary)',
                            fontWeight: '800',
                            fontSize: '0.8rem',
                            letterSpacing: '0.5px'
                          }}>
                            {dept} DEPARTMENT
                          </span>

                          <span style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#d97706',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontWeight: '800',
                            fontSize: '0.78rem'
                          }}>
                            {stats.count} Pending Request{stats.count > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <div style={{ background: 'var(--accent-primary)', color: 'white', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                            <User size={16} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>{hod.name}</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>{hod.email}</p>
                          </div>
                        </div>
                      </div>

                      <div style={{
                        background: 'var(--bg-primary)',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.25rem',
                        border: '1px solid var(--border-color)'
                      }}>
                        <span style={{ opacity: 0.7 }}>Oldest Pending Request:</span>
                        <span style={{ fontWeight: 'bold', color: daysAgo >= 2 ? '#ef4444' : '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {pendingTimeText}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px',
                        color: 'var(--accent-primary)',
                        fontWeight: '800',
                        fontSize: '0.85rem'
                      }}>
                        View Pending Submissions ({stats.count}) <ArrowRight size={16} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* VIEW LEVEL 2: DETAILED SUBMISSIONS FOR A SELECTED HOD TILE */}
      {selectedDeptTile && selectedHodObj && selectedDeptStats && (
        <div className="animate-fade">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setSelectedDeptTile(null)}
              className="btn-primary"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                fontWeight: '700'
              }}
            >
              <ArrowLeft size={16} /> Back to All HOD Tiles
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>
                Pending Submissions for {selectedHodObj.name} ({selectedDeptTile} HOD)
              </h2>
              <span style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#d97706',
                padding: '4px 10px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '0.8rem'
              }}>
                {selectedDeptStats.count} Pending
              </span>
            </div>
          </div>

          {/* Search bar inside selected HOD */}
          <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '1.25rem' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Search faculty or form title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input"
              style={{ width: '100%', paddingLeft: '38px', fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>Form Name</th>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>Faculty Name</th>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>Department</th>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>Submitted At (Timestamp)</th>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>Pending Duration</th>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedDeptStats.responses
                  .filter(item => 
                    item.form?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.respondent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.respondent?.email?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(item => {
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
                        <td style={{ padding: '1rem', fontSize: '0.85rem', opacity: 0.85 }}>
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
                            Review Form Submissions <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingTracker;
