import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Calendar, User, FileText, RefreshCw, Printer, Download, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';

interface Field {
  id: string;
  label: string;
  type: string;
}

interface ResponseData {
  id: string;
  data: any;
  submittedAt: string;
  form: {
    id: string;
    title: string;
    schema: Field[];
  };
  respondent: {
    name: string;
    email: string;
  };
}

const ViewSubmission = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/responses/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubmission(res.data);
      } catch (err) {
        console.error('Failed to fetch submission:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
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

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading submission details...</div>;
  if (!submission) return <div style={{ padding: '2rem', textAlign: 'center' }}>Submission not found.</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }} className="animate-fade">
      <button 
        onClick={() => navigate(-1)} 
        style={{ 
          background: 'none', 
          border: 'none',
          padding: 0,
          color: 'var(--text-primary)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          marginBottom: '2rem',
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontWeight: '500'
        }}
      >
        <ArrowLeft size={18} /> Back to History
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>Submission Record</h1>
          <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>Detailed review of official document submission.</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
           <button 
            onClick={() => navigate(`/faculty/fill/${submission.form.id}`)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.6rem 1.2rem', 
              borderRadius: '8px', 
              background: 'var(--accent-primary)', 
              color: 'white', 
              border: 'none', 
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} /> Fill Again
          </button>
          
          <button 
            onClick={handlePrint}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.6rem 1.2rem', 
              borderRadius: '8px', 
              background: 'var(--bg-secondary)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border-color)', 
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div style={{ 
        background: 'var(--card-bg)', 
        borderRadius: '16px', 
        border: '1px solid var(--border-color)', 
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        <div style={{ 
          padding: '2rem', 
          borderBottom: '1px solid var(--border-color)', 
          background: 'linear-gradient(to right, rgba(37, 99, 235, 0.05), transparent)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--accent-primary)', color: 'white', borderRadius: '12px' }}>
              <FileText size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{submission.form.title}</h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <User size={16} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: '600' }}>{submission.respondent.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>{format(new Date(submission.submittedAt), 'PPP p')}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gap: '2rem' }}>
            {submission.form.schema.map((field) => (
              <div key={field.id} style={{ 
                paddingBottom: '1.5rem', 
                borderBottom: '1px solid var(--border-color)' 
              }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.75rem', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px', 
                  fontWeight: 'bold', 
                  color: 'var(--accent-primary)', 
                  marginBottom: '0.75rem' 
                }}>
                  {field.label}
                </label>
                <div style={{ 
                  fontSize: '1.1rem', 
                  lineHeight: '1.6',
                  color: 'var(--text-primary)'
                }}>
                  {typeof submission.data[field.id] === 'object' && submission.data[field.id]?.url ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      background: 'rgba(0,0,0,0.03)', 
                      padding: '12px 20px', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border-color)',
                      maxWidth: 'fit-content'
                    }}>
                      <FileText size={20} style={{ color: 'var(--accent-primary)', opacity: 0.5 }} />
                      <span style={{ 
                        fontWeight: '700', 
                        opacity: 0.8, 
                        fontSize: '0.95rem', 
                        maxWidth: '250px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }} title={submission.data[field.id].filename}>
                        {submission.data[field.id].filename}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem' }}>
                        <button 
                          onClick={() => setPreviewFile({ 
                            url: submission.data[field.id].url, 
                            name: submission.data[field.id].filename || 'Attachment' 
                          })}
                          className="no-print"
                          style={{ 
                            color: 'var(--accent-primary)', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            fontWeight: '800',
                            padding: '8px 16px',
                            background: 'rgba(37, 99, 235, 0.12)',
                            borderRadius: '8px',
                            border: '1px solid rgba(37, 99, 235, 0.3)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}
                        >
                          <Eye size={16} /> View
                        </button>
                        <a 
                          href={submission.data[field.id].url} 
                          download
                          className="no-print"
                          style={{ 
                            color: 'var(--text-primary)', 
                            opacity: 0.4, 
                            display: 'flex', 
                            padding: '8px', 
                            borderRadius: '8px', 
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.background = 'transparent'; }}
                          title="Download Original"
                        >
                          <Download size={18} />
                        </a>
                      </div>
                    </div>
                  ) : field.type === 'url' && submission.data[field.id] ? (
                    <a 
                      href={submission.data[field.id].startsWith('http') ? submission.data[field.id] : `https://${submission.data[field.id]}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'var(--accent-primary)', textDecoration: 'underline', fontWeight: 'bold' }}
                    >
                      {submission.data[field.id]}
                    </a>
                  ) : (
                    submission.data[field.id] || <span style={{ opacity: 0.3 }}>Not provided</span>
                  )}
                  {/* For Print: Show URL text */}
                  {typeof submission.data[field.id] === 'object' && submission.data[field.id]?.url && (
                    <span className="print-only" style={{ display: 'none', fontSize: '0.8rem', opacity: 0.5 }}>
                      [Attachment: {submission.data[field.id].filename}]
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          padding: '1.5rem 2rem', 
          background: 'var(--bg-secondary)', 
          textAlign: 'center', 
          fontSize: '0.8rem', 
          opacity: 0.5 
        }}>
          This is an official record of the submission.
        </div>
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
              padding: '1rem 2.5rem',
              color: 'white',
              background: 'rgba(0,0,0,0.7)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '8px', background: 'var(--accent-primary)', borderRadius: '8px' }}>
                <Eye size={20} />
              </div>
              <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{previewFile.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a 
                href={previewFile.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '20px', 
                  cursor: 'pointer', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: '700'
                }}
              >
                Open in New Tab
              </a>
              <button 
                onClick={() => setPreviewFile(null)}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
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
                <h3>Preview not available for this file type</h3>
                <a href={previewFile.url} download style={{ color: 'var(--accent-primary)', marginTop: '1rem', display: 'inline-block' }}>Download instead</a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ViewSubmission;


