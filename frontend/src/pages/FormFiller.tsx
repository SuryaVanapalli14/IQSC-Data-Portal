import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Field {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  allowedTypes?: string[];
}

interface Form {
  id: string;
  title: string;
  description: string;
  schema: Field[];
  targetNames?: string[];
}

const FormFiller = () => {
  const { id } = useParams();
  const { theme, user } = useApp();
  const [form, setForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({});
  const [isPreview, setIsPreview] = useState(false);
  const [existingResponseId, setExistingResponseId] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>(user?.department || '');
  const navigate = useNavigate();

  const AVAILABLE_DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'MBA', 'MCA'];

  const handleBack = () => {
    if (user?.role === 'IQAC_ADMIN') navigate('/admin');
    else if (user?.role === 'HOD') navigate('/hod');
    else navigate('/faculty');
  };

  useEffect(() => {
    const fetchFormAndResponse = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      try {
        const payload = JSON.parse(window.atob(token.split('.')[1]));
        if (payload.role === 'IQAC_ADMIN' || payload.role === 'HOD') {
          setIsPreview(true);
        }

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setForm(res.data);

        // Fetch existing response if any
        try {
          const respRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms/${id}/my-response`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (respRes.data) {
            setExistingResponseId(respRes.data.id);
            setFormData(respRes.data.data || {});
            setResponseStatus(respRes.data.status);
            setRejectionComment(respRes.data.rejectionComment);
          }
        } catch (respErr) {
          console.error('Fetch response error:', respErr);
        }
      } catch (err: any) {
        console.error('Fetch Form Error:', err);
        setError(err.response?.data?.error || 'Failed to load form details.');
      }
    };
    fetchFormAndResponse();
  }, [id]);

  const handleFormSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    const isApproved = responseStatus === 'APPROVED';
    const isFaculty = user?.role === 'FACULTY';
    if (isApproved && isFaculty) return;

    if (user?.role === 'FACULTY') {
      setSelectedDept(user?.department || (AVAILABLE_DEPARTMENTS.includes(user?.department || '') ? user?.department : 'CSE'));
      setShowPreviewModal(true);
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (existingResponseId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/responses/${existingResponseId}`,
          { data: formData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/forms/${id}/submit`,
          { data: formData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setShowPreviewModal(false);
      setSubmitted(true);
    } catch (err: any) {
      setShowPreviewModal(false);
      setError(err.response?.data?.error || 'Failed to submit response');
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData({ ...formData, [fieldId]: value });
  };

  if (submitted) {
    return (
      <div className="container animate-fade" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <CheckCircle size={64} style={{ color: 'green', marginBottom: '1.5rem' }} />
        <h1>Response Submitted Successfully</h1>
        <p style={{ marginBottom: '2rem', opacity: 0.7 }}>Your response details have been updated and sent for review.</p>
        <button onClick={handleBack} className="btn-primary">Return to Dashboard</button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container animate-fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ background: 'var(--card-bg)', padding: '3rem', borderRadius: '1rem', border: '1px solid var(--border-color)', maxWidth: '40rem', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem', color: '#ef4444' }}>Access Restriction</h2>
          <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '2rem', lineHeight: '1.5' }}>{error}</p>
          <button onClick={handleBack} className="btn-primary" style={{ padding: '10px 24px' }}>Return to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container animate-fade" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)', maxWidth: '30rem', width: '100%' }}>
          <div className="animate-pulse" style={{ fontSize: '1.2rem', fontWeight: '600', opacity: 0.5 }}>Loading official form...</div>
        </div>
      </div>
    );
  }

  const isApproved = responseStatus === 'APPROVED';
  const isDisabled = isPreview ? (user?.role !== 'IQAC_ADMIN') : (isApproved && user?.role !== 'IQAC_ADMIN');

  return (
    <div className="animate-fade" style={{ padding: '2rem', minHeight: '100vh', paddingBottom: '5rem' }}>
      <div className="container" style={{ maxWidth: '50rem', padding: 0 }}>
        {/* Navigation */}
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            color: theme === 'dark' ? '#ffffff' : '#000000',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '700',
            padding: 0,
            marginBottom: '1.5rem'
          }}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        {form && (
          <>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '2.1rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>{form.title}</h1>
                <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>{form.description || 'Please fill out all the required fields in this official document.'}</p>
              </div>
              {isApproved && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: '#22c55e',
                  background: 'rgba(34, 197, 94, 0.15)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  fontSize: '0.85rem',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)'
                }}>
                  <CheckCircle size={16} /> <span>Approved & Locked</span>
                </div>
              )}
            </div>

            {/* Targeted Departments/Faculty */}
            {(user?.role === 'IQAC_ADMIN' || user?.role === 'HOD') && (
              <div style={{
                background: 'var(--card-bg)',
                border: '1.5px solid var(--accent-primary)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '2rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.05)'
              }}>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>
                  Targeted Departments
                </h3>
                {!form.targetNames || form.targetNames.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      color: 'var(--accent-primary)',
                      background: 'rgba(37, 99, 235, 0.1)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(37, 99, 235, 0.2)'
                    }}>
                      🌐 ALL DEPARTMENTS
                    </span>
                    <span style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: '500' }}>This form is opened globally for all faculty and departments.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {form.targetNames.map((nameEmail, index) => (
                      <span
                        key={index}
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-primary)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                        {nameEmail.split('@')[0].toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Status Banners */}
            {responseStatus === 'APPROVED' && (
              <div style={{
                padding: '1.25rem 1.5rem',
                background: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
                borderRadius: '12px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontWeight: 'bold',
                fontSize: '0.95rem'
              }}>
                <CheckCircle size={20} />
                <span>APPROVED: This response has been accepted and locked. Faculty can no longer edit. {user?.role === 'IQAC_ADMIN' && " (IQAC Admin Override Allowed)"}</span>
              </div>
            )}

            {responseStatus === 'REJECTED' && (
              <div style={{
                padding: '1.25rem 1.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontWeight: 'bold',
                fontSize: '0.95rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <AlertCircle size={20} />
                  <span>RE-SUBMISSION REQUESTED BY HOD: Please update your response and resubmit.</span>
                </div>
                {rejectionComment && (
                  <div style={{ fontSize: '0.85rem', opacity: 0.9, background: 'rgba(239, 68, 68, 0.05)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #ef4444', marginTop: '4px' }}>
                    <strong>HOD Feedback Comments:</strong> "{rejectionComment}"
                  </div>
                )}
              </div>
            )}

            {responseStatus === 'PENDING' && (
              <div style={{
                padding: '1.25rem 1.5rem',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                borderRadius: '12px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontWeight: 'bold',
                fontSize: '0.95rem'
              }}>
                <AlertCircle size={20} />
                <span>PENDING REVIEW AT HOD: Your submission is currently pending review by your department HOD. You can still modify and resubmit.</span>
              </div>
            )}

            {isPreview && !responseStatus && (
              <div style={{
                padding: '1.25rem 1.5rem',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontWeight: 'bold',
                fontSize: '0.95rem'
              }}>
                <AlertCircle size={20} />
                <span>Preview Mode: You are viewing this form as HOD/Administrator. Submission is disabled.</span>
              </div>
            )}

            <div style={{ background: 'var(--card-bg)', padding: '2.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
              <form onSubmit={handleFormSubmitClick}>
                {form.schema.map(field => (
                  <div key={field.id} style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.7rem', fontWeight: 600 }}>
                      {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                    </label>

                    {field.type === 'text' && (
                      <input
                        className="input"
                        required={field.required}
                        disabled={isDisabled}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'number' && (
                      <input
                        type="number"
                        className="input"
                        required={field.required}
                        disabled={isDisabled}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'textarea' && (
                      <textarea
                        className="input"
                        rows={4}
                        required={field.required}
                        disabled={isDisabled}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'url' && (
                      <input
                        type="url"
                        className="input"
                        required={field.required}
                        disabled={isDisabled}
                        placeholder="https://example.com"
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'date' && (
                      <input
                        type="date"
                        className="input"
                        required={field.required}
                        disabled={isDisabled}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'select' && (
                      <select
                        className="input"
                        required={field.required}
                        disabled={isDisabled}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      >
                        <option value="">Select an option</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    )}

                    {field.type === 'file' && (
                      <div style={{ position: 'relative' }}>
                        <input
                          id={`file-${field.id}`}
                          type="file"
                          className="input"
                          required={field.required && !formData[field.id]}
                          disabled={isDisabled}
                          accept={field.allowedTypes?.map((t: any) => {
                            if (t === 'PDF') return '.pdf';
                            if (t === 'IMAGE') return 'image/*';
                            if (t === 'SPREADSHEET') return '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel';
                            if (t === 'VIDEO') return 'video/*,.mkv,.mp4';
                            return '';
                          }).filter(Boolean).join(',')}
                          onChange={(e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;

                            const file = files[0];
                            const fileName = file.name.toLowerCase();
                            const allowed = field.allowedTypes || [];

                            if (allowed.length > 0) {
                              const isPdf = fileName.endsWith('.pdf');
                              const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(fileName);
                              const isSheet = /\.(csv|xlsx|xls)$/.test(fileName);
                              const isVideo = /\.(mp4|mkv|mov|avi|wmv|flv)$/.test(fileName);

                              const pdfOk = allowed.includes('PDF') && isPdf;
                              const imgOk = allowed.includes('IMAGE') && isImage;
                              const sheetOk = allowed.includes('SPREADSHEET') && isSheet;
                              const vidOk = allowed.includes('VIDEO') && isVideo;

                              if (!pdfOk && !imgOk && !sheetOk && !vidOk) {
                                alert(`Error: This field only accepts: ${allowed.join(', ')}`);
                                e.target.value = '';
                                handleInputChange(field.id, '');
                                return;
                              }
                            }

                            // Upload logic
                            const uploadFile = async () => {
                              setLoadingFiles(prev => ({ ...prev, [field.id]: true }));
                              try {
                                const token = localStorage.getItem('token');
                                const fd = new FormData();
                                fd.append('file', file);

                                const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/upload`, fd, {
                                  headers: {
                                    'Content-Type': 'multipart/form-data',
                                    Authorization: `Bearer ${token}`
                                  }
                                });

                                handleInputChange(field.id, {
                                  url: res.data.url,
                                  filename: res.data.originalName,
                                  storedName: res.data.filename
                                });
                              } catch (err) {
                                alert('Upload failed. Please try again.');
                                e.target.value = '';
                                handleInputChange(field.id, '');
                              } finally {
                                setLoadingFiles(prev => ({ ...prev, [field.id]: false }));
                              }
                            };

                            uploadFile();
                          }}
                        />
                        {loadingFiles[field.id] && (
                          <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                            Uploading...
                          </div>
                        )}
                        {field.allowedTypes && field.allowedTypes.length > 0 && (
                          <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.4rem' }}>
                            Allowed: {field.allowedTypes.join(', ')}
                          </div>
                        )}
                        {formData[field.id]?.url && (
                          <div style={{ marginTop: '0.6rem', fontSize: '0.85rem' }}>
                            Submitted Attachment:{' '}
                            <a 
                              href={formData[field.id].url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ color: 'var(--accent-primary)', fontWeight: 'bold', textDecoration: 'underline' }}
                            >
                              {formData[field.id].filename || 'View attachment'}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1.1rem',
                    marginTop: '1rem',
                    background: isDisabled ? '#6b7280' : ((Object.values(loadingFiles).some(v => v)) ? '#9ca3af' : '#1e40af'),
                    cursor: isDisabled ? 'not-allowed' : ((Object.values(loadingFiles).some(v => v)) ? 'not-allowed' : 'pointer')
                  }}
                  disabled={isDisabled || Object.values(loadingFiles).some(v => v)}
                >
                  {Object.values(loadingFiles).some(v => v) ? 'Waiting for uploads...' : (isDisabled ? 'LOCKED / VIEW ONLY MODE' : 'Submit Response')}
                </button>
              </form>
            </div>
          </>
        )}
      {showPreviewModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
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
            width: 'min(90vw, 550px)',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            color: 'var(--text-primary)'
          }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              📋 Preview & Confirm Submission
            </h3>
            <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Please review your entered details carefully before forwarding to your Department HOD.
            </p>

            {/* Department Selection Dropdown */}
            <div style={{
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <label style={{ fontWeight: '800', fontSize: '0.9rem', display: 'block', marginBottom: '0.4rem', color: 'var(--accent-primary)' }}>
                🏢 Department Confirmation
              </label>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', opacity: 0.8 }}>
                Select and confirm your department before forwarding your response to HOD:
              </p>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <option value="" disabled>-- Select Department --</option>
                {AVAILABLE_DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept} Department</option>
                ))}
              </select>
            </div>

            {/* Summary Preview List */}
            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
              Entered Response Data
            </h4>
            <div style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.5rem', maxHeight: '220px', overflowY: 'auto' }}>
              {form?.schema.map(field => (
                <div key={field.id} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', opacity: 0.6, textTransform: 'uppercase' }}>
                    {field.label}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', wordBreak: 'break-word' }}>
                    {typeof formData[field.id] === 'object' && formData[field.id]?.filename
                      ? `📁 ${formData[field.id].filename}`
                      : formData[field.id] || <span style={{ opacity: 0.4 }}>Not provided</span>}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={executeSubmit}
                disabled={!selectedDept}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: selectedDept ? 'var(--accent-primary)' : 'gray',
                  color: 'white',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: selectedDept ? 'pointer' : 'not-allowed',
                  opacity: selectedDept ? 1 : 0.6
                }}
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
    </div>
  );
};

export default FormFiller;
