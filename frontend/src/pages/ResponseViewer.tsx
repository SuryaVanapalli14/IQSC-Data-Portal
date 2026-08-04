import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User, Calendar, FileSpreadsheet, Eye, X, FileText } from 'lucide-react';
import { io } from 'socket.io-client';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';

const socket = io(`${import.meta.env.VITE_API_URL}`);

interface Response {
  id: string;
  data: any;
  respondent: { name: string; email: string };
  status: string;
  rejectionComment?: string | null;
  submittedAt: string;
}

interface Form {
  id: string;
  title: string;
  schema: any[];
  responses: Response[];
}

const ResponseViewer = () => {
  const { id } = useParams();
  const { user } = useApp();
  const [form, setForm] = useState<Form | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); 
  const [exporting, setExporting] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [reviewResponseId, setReviewResponseId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [approveConsent, setApproveConsent] = useState(false);
  const [editingResponse, setEditingResponse] = useState<{ id: string; data: any } | null>(null);
  const navigate = useNavigate();

  const isOversight = user?.role === 'IQAC_ADMIN' || user?.role === 'HOD';

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setForm(res.data);
        socket.emit('join_form', id);
      } catch (err) {
        console.error(err);
      }
    };
    fetchResponses();

    socket.on('new_response', (response) => {
      setForm(prev => {
        if (!prev) return prev;
        // Avoid duplicate additions
        if (prev.responses.some(r => r.id === response.id)) return prev;
        return { ...prev, responses: [...(prev.responses || []), response] };
      });
    });

    socket.on('response_updated', (updated) => {
      setForm(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          responses: prev.responses.map(r => r.id === updated.id ? { ...r, ...updated } : r)
        };
      });
    });

    socket.on('response_reviewed', (updated) => {
      setForm(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          responses: prev.responses.map(r => r.id === updated.id ? { ...r, ...updated } : r)
        };
      });
    });

    return () => {
      socket.off('new_response');
      socket.off('response_updated');
      socket.off('response_reviewed');
    };
  }, [id]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewFile(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    if (previewFile && (previewFile.name.toLowerCase().endsWith('.csv') || previewFile.name.toLowerCase().endsWith('.txt'))) {
      axios.get(previewFile.url).then(res => {
        const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        const rawRows = text.split(/\r?\n/).filter(line => line.trim() !== '').slice(0, 1000);
        
        const parsedRows = rawRows.map(row => {
          const cells = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
              cells.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          cells.push(current.trim());
          return cells;
        });

        setCsvData(parsedRows);
      }).catch(err => {
        console.error('CSV fetch failed:', err);
        setCsvData([['Error loading preview. Please download the file.']]);
      });
    } else {
      setCsvData([]);
    }
  }, [previewFile]);

  const handleAdminEdit = async () => {
    if (!editingResponse) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL}/api/responses/${editingResponse.id}`,
        { data: editingResponse.data },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setForm(prev => {
        if (!prev) return prev;
        return { ...prev, responses: prev.responses.map(r => r.id === editingResponse!.id ? { ...r, data: editingResponse!.data } : r) };
      });
      setEditingResponse(null);
    } catch (err) {
      console.error('Admin edit failed:', err);
      alert('Failed to save changes.');
    }
  };

  const triggerReview = (responseId: string, action: 'APPROVED' | 'REJECTED') => {
    setReviewResponseId(responseId);
    setReviewAction(action);
    setReviewComment('');
    setApproveConsent(false);
  };

  const submitReview = async () => {
    if (!reviewResponseId || !reviewAction) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/responses/${reviewResponseId}/review`, 
        { status: reviewAction, comment: reviewComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setForm(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          responses: prev.responses.map(r => r.id === reviewResponseId ? { ...r, status: reviewAction, rejectionComment: reviewComment } : r)
        };
      });

      // Close modal
      setReviewResponseId(null);
      setReviewAction(null);
      setReviewComment('');
    } catch (err) {
      console.error('Failed to review response:', err);
      alert('Failed to update response review status');
    }
  };

  const handleExport = () => {
    if (!form || form.responses.length === 0) {
      alert('No responses to export.');
      return;
    }

    setExporting(true);
    try {
      let headers = ['Submission Date and Time', 'Respondent Name', 'Respondent Email', 'Status', 'Rejection Comment'];
      const dynamicHeaders = form.schema.map(f => f.label);
      const allHeaders = [...headers, ...dynamicHeaders];
      const csvRows = [allHeaders.join(',')];

      form.responses.forEach((resp) => {
        const row = [
          format(new Date(resp.submittedAt), 'yyyy-MM-dd HH:mm:ss'),
          `"${(resp.respondent?.name || 'Unknown').replace(/"/g, '""')}"`,
          `"${(resp.respondent?.email || 'N/A').replace(/"/g, '""')}"`,
          resp.status,
          `"${(resp.rejectionComment || '').replace(/"/g, '""')}"`
        ];

        form.schema.forEach(field => {
          const val = resp.data[field.id];
          let displayVal = '';
          if (val && typeof val === 'object' && val.url) {
            displayVal = val.url;
          } else {
            displayVal = val || '';
          }
          row.push(`"${displayVal.toString().replace(/"/g, '""')}"`);
        });

        csvRows.push(row.join(','));
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${form.title.replace(/\s+/g, '_')}_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const token = localStorage.getItem('token');
      axios.post(`${import.meta.env.VITE_API_URL}/api/admin/log-export`, 
        { formId: form.id, count: (form.responses || []).length },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(err => console.error('Failed to log export:', err));

    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data.');
    } finally {
      setExporting(false);
    }
  };

  if (!form) return <div className="container">Loading...</div>;

  const sortedResponses = [...(form.responses || [])].sort((a, b) => {
    const dateA = new Date(a.submittedAt).getTime();
    const dateB = new Date(b.submittedAt).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="container animate-fade">
      <button 
        onClick={() => navigate('/')} 
        style={{ 
          background: 'none', 
          border: 'none',
          padding: 0,
          color: 'var(--text-primary)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          marginBottom: '2.5rem',
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontWeight: '500'
        }}
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>Responses: {form.title}</h1>
          <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>{form.responses.length} total submissions received.</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={exporting}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            padding: '12px 24px', 
            background: 'var(--accent-primary)', 
            color: 'white', 
            borderRadius: '50px', 
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.2)',
            border: 'none',
            cursor: exporting ? 'wait' : 'pointer',
            opacity: exporting ? 0.7 : 1
          }}
        >
          <FileSpreadsheet size={20} /> 
          {exporting ? 'Generating CSV...' : 'Export Data'}
        </button>
      </div>

      <div style={{ overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '180px' }} />
            {form.schema.map((f: any) => <col key={f.id} style={{ width: '160px' }} />)}
            <col style={{ width: '110px' }} />
            <col style={{ width: '155px' }} />
            {isOversight && <col style={{ width: user?.role === 'IQAC_ADMIN' ? '180px' : '140px' }} />}
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-primary)' }}>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.7 }}>Respondent</th>
              {form.schema.map((field: any) => (
                <th key={field.id} style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.7 }}>{field.label}</th>
              ))}
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.7 }}>Status</th>
              <th 
                style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.7 }}
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                Date {sortOrder === 'asc' ? '↑' : '↓'}
              </th>
              {isOversight && <th style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.7, textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedResponses.map((resp) => (
              <tr key={resp.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ background: 'var(--accent-primary)', color: 'white', padding: '7px', borderRadius: '50%', display: 'flex', flexShrink: 0 }}>
                      <User size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resp.respondent?.name || 'Anonymous'}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{resp.respondent?.email}</div>
                    </div>
                  </div>
                </td>
                {form.schema.map((field: any) => (
                  <td key={field.id} style={{ padding: '0.75rem 1rem', verticalAlign: 'top' }}>
                    {typeof resp.data[field.id] === 'object' && resp.data[field.id]?.url ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }} title={resp.data[field.id].filename}>
                          {resp.data[field.id].filename}
                        </span>
                        <button 
                          onClick={() => setPreviewFile({ url: resp.data[field.id].url, name: resp.data[field.id].filename || 'Attachment' })}
                          title="Preview"
                          style={{ background: 'none', color: 'var(--accent-primary)', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    ) : field.type === 'url' && resp.data[field.id] ? (
                      <a href={resp.data[field.id].startsWith('http') ? resp.data[field.id] : `https://${resp.data[field.id]}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--accent-primary)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}
                        title={resp.data[field.id]}>
                        {resp.data[field.id]}
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.88rem', display: 'block', wordBreak: 'break-word', lineHeight: '1.4', color: resp.data[field.id] ? 'var(--text-primary)' : undefined, opacity: resp.data[field.id] ? 1 : 0.3 }}>
                        {resp.data[field.id] || '—'}
                      </span>
                    )}
                  </td>
                ))}
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    background: resp.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.1)' : 
                                resp.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: resp.status === 'APPROVED' ? '#22c55e' : 
                           resp.status === 'REJECTED' ? '#ef4444' : '#f59e0b'
                  }}>
                    {resp.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.8rem', opacity: 0.7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={14} />
                    {new Date(resp.submittedAt).toLocaleString()}
                  </div>
                </td>
                {isOversight && (
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {resp.status === 'PENDING' && (
                        <>
                          <button onClick={() => triggerReview(resp.id, 'APPROVED')} style={{ padding: '5px 10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 'bold' }}>Approve</button>
                          <button onClick={() => triggerReview(resp.id, 'REJECTED')} style={{ padding: '5px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 'bold' }}>Re-Submit</button>
                        </>
                      )}
                      {user?.role === 'IQAC_ADMIN' && (
                        <button
                          onClick={() => setEditingResponse({ id: resp.id, data: { ...resp.data } })}
                          style={{ padding: '5px 10px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 'bold' }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                      {resp.status !== 'PENDING' && user?.role !== 'IQAC_ADMIN' && (
                        <span style={{ fontSize: '0.75rem', opacity: 0.45, fontStyle: 'italic' }}>Reviewed</span>
                      )}
                    </div>
                    {resp.rejectionComment && (
                      <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '4px', textAlign: 'right', maxWidth: '160px', marginLeft: 'auto', lineHeight: '1.3' }}>
                        💬 {resp.rejectionComment}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {form.responses.length === 0 && (
              <tr>
                <td colSpan={form.schema.length + 4} style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                  No responses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {previewFile && createPortal(
        <div 
          onClick={() => setPreviewFile(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999999,
            backdropFilter: 'blur(20px)',
            animation: 'fade 0.2s'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 2rem',
              color: 'white',
              background: 'rgba(0,0,0,0.7)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Eye size={20} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: '700' }}>{previewFile.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <a 
                href={previewFile.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: 'white', 
                  textDecoration: 'none', 
                  fontSize: '0.85rem', 
                  fontWeight: '700',
                  opacity: 0.8,
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '4px 12px',
                  borderRadius: '15px'
                }}
              >
                Open in Full Window
              </a>
              <button 
                onClick={() => setPreviewFile(null)}
                style={{ background: 'none', color: 'white', border: 'none', padding: '5px', cursor: 'pointer', display: 'flex' }}
              >
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div 
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, overflow: 'hidden' }}
          >
            {previewFile.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
              <img src={previewFile.url} alt={previewFile.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : previewFile.name.toLowerCase().endsWith('.pdf') ? (
              <iframe src={previewFile.url} style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} title="PDF Preview" />
            ) : previewFile.name.toLowerCase().match(/\.(csv|txt)$/) ? (
              <div style={{ width: '95%', height: '95%', background: 'white', overflow: 'auto', borderRadius: '12px', padding: '1rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                {csvData.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: '#1e293b', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        {csvData[0].map((header, i) => (
                          <th key={i} style={{ padding: '0.75rem', textAlign: 'left', borderRight: '1px solid #e2e8f0', fontWeight: 'bold' }}>
                            {header.replace(/^"|"$/g, '')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(1).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? 'white' : '#fcfcfd' }}>
                          {row.map((cell, j) => (
                            <td key={j} style={{ padding: '0.6rem 0.75rem', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                              {cell?.replace(/^"|"$/g, '') || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b' }}>
                    Loading data...
                  </div>
                )}
              </div>
            ) : previewFile.name.toLowerCase().match(/\.(mp4|mkv|mov|avi)$/) ? (
              <video src={previewFile.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'white' }}>
                <FileText size={64} style={{ opacity: 0.5, marginBottom: '1.5rem' }} />
                <h3>No preview available</h3>
                <a href={previewFile.url} download style={{ color: 'var(--accent-primary)', marginTop: '1rem', display: 'inline-block' }}>Download File</a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {reviewResponseId && reviewAction && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          animation: 'fade 0.2s'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '2rem',
            width: '450px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'scaleUp 0.2s'
          }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1rem', color: reviewAction === 'APPROVED' ? '#22c55e' : '#ef4444' }}>
              {reviewAction === 'APPROVED' ? 'Confirm Form Approval' : 'Request Re-submission'}
            </h3>
            <p style={{ opacity: 0.8, fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {reviewAction === 'APPROVED' 
                ? 'Reviewing and approving this faculty submission will lock the response and forward it for official records.'
                : 'Please provide comments or feedback outlining the reason for requesting re-submission from the faculty.'}
            </p>

            {reviewAction === 'APPROVED' && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={approveConsent}
                    onChange={e => setApproveConsent(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>I confirm that I have thoroughly reviewed this submission and approve it for higher authorities / IQAC Admin review.</span>
                </label>
              </div>
            )}

            {reviewAction === 'REJECTED' && (
              <textarea
                className="input"
                rows={4}
                placeholder="Enter feedback comments outlining required revisions..."
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                style={{ width: '100%', marginBottom: '1.5rem', resize: 'vertical' }}
              />
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setReviewResponseId(null); setReviewAction(null); setApproveConsent(false); }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={submitReview}
                disabled={reviewAction === 'APPROVED' && !approveConsent}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: (reviewAction === 'APPROVED' && !approveConsent) ? 'gray' : (reviewAction === 'APPROVED' ? '#22c55e' : '#ef4444'),
                  color: 'white',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: (reviewAction === 'APPROVED' && !approveConsent) ? 'not-allowed' : 'pointer',
                  opacity: (reviewAction === 'APPROVED' && !approveConsent) ? 0.6 : 1
                }}
              >
                {reviewAction === 'APPROVED' ? 'Confirm Approve' : 'Confirm Re-Submit'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {editingResponse && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10001 }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem', width: 'min(90vw, 560px)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0 }}>✏️ Edit Response</h3>
              <button onClick={() => setEditingResponse(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', opacity: 0.6, display: 'flex' }}><X size={22} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.5rem' }}>As IQAC Admin you can modify any field below and save.</p>
            {form?.schema.map((field: any) => (
              <div key={field.id} style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, marginBottom: '0.4rem' }}>{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea className="input" rows={3} value={editingResponse.data[field.id] || ''}
                    onChange={e => setEditingResponse(prev => prev ? { ...prev, data: { ...prev.data, [field.id]: e.target.value } } : prev)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                ) : field.type === 'file' ? (
                  <p style={{ fontSize: '0.82rem', opacity: 0.5, fontStyle: 'italic' }}>File uploads cannot be edited directly.</p>
                ) : (
                  <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : 'text'}
                    className="input"
                    value={editingResponse.data[field.id] || ''}
                    onChange={e => setEditingResponse(prev => prev ? { ...prev, data: { ...prev.data, [field.id]: e.target.value } } : prev)}
                    style={{ width: '100%' }}
                  />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setEditingResponse(null)} style={{ padding: '10px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdminEdit} style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Save Changes</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ResponseViewer;
