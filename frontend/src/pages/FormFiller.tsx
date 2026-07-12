import React, { useEffect, useState } from 'react';
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
  targetStations?: string[];
}

const FormFiller = () => {
  const { id } = useParams();
  const { theme, user } = useApp();
  const [form, setForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({});
  const [isPreview, setIsPreview] = useState(false);
  const navigate = useNavigate();

  const handleBack = () => {
    if (user?.role === 'ADMIN') navigate('/admin');
    else if (user?.role === 'CCRB') navigate('/ccrb');
    else navigate('/officer');
  };

  useEffect(() => {
    const fetchForm = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      try {
        const payload = JSON.parse(window.atob(token.split('.')[1]));
        if (payload.role === 'ADMIN' || payload.role === 'CCRB') {
          setIsPreview(true);
        }

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setForm(res.data);
      } catch (err: any) {
        console.error('Fetch Form Error:', err);
        setError(err.response?.data?.error || 'Failed to load form details.');
      }
    };
    fetchForm();
  }, [id]);

  useEffect(() => {
    const checkStatus = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const currentForm = res.data.find((f: any) => f.id === id);
        if (currentForm?.alreadyFilled) {
          setWarning('YOU ALREADY FILLED THIS FORM');
        }
      } catch (err) {
        console.error('Status Check Error:', err);
      }
    };
    checkStatus();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/forms/${id}/submit`,
        { data: formData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit form');
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData({ ...formData, [fieldId]: value });
  };

  if (submitted) {
    return (
      <div className="container animate-fade" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <CheckCircle size={64} style={{ color: 'green', marginBottom: '1.5rem' }} />
        <h1>Form Submitted Successfully</h1>
        <p style={{ marginBottom: '2rem', opacity: 0.7 }}>Your response has been recorded.</p>
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
              {warning && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: '#4ade80',
                  background: 'rgba(74, 222, 128, 0.15)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid rgba(74, 222, 128, 0.4)',
                  fontSize: '0.85rem',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: '0 4px 12px rgba(74, 222, 128, 0.15)'
                }}>
                  <CheckCircle size={16} /> <span>Already Filled</span>
                </div>
              )}
            </div>

            {/* Targeted Stations display for Admins/CCRB */}
            {(user?.role === 'ADMIN' || user?.role === 'CCRB') && (
              <div style={{
                background: 'var(--card-bg)',
                border: '1.5px solid var(--accent-primary)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '2rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.05)'
              }}>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px' }}>
                  Stations to fill this Form
                </h3>
                {!form.targetStations || form.targetStations.length === 0 ? (
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
                      🌐 ALL STATIONS
                    </span>
                    <span style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: '500' }}>This form has been opened globally for all stations to fill out.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {form.targetStations.map((stationEmail, index) => (
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
                        {stationEmail.split('@')[0].toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{
                padding: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                borderRadius: '10px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontWeight: '600'
              }}>
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {isPreview && (
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
                <span>⚠️ Preview Mode: You are viewing this form as an administrator/oversight user. Submission is disabled.</span>
              </div>
            )}

            <div style={{ background: 'var(--card-bg)', padding: '2.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>

              <form onSubmit={handleSubmit}>
                {form.schema.map(field => (
                  <div key={field.id} style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.7rem', fontWeight: 600 }}>
                      {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                    </label>

                    {field.type === 'text' && (
                      <input
                        className="input"
                        required={field.required}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'number' && (
                      <input
                        type="number"
                        className="input"
                        required={field.required}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'textarea' && (
                      <textarea
                        className="input"
                        rows={4}
                        required={field.required}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'select' && (
                      <select
                        className="input"
                        required={field.required}
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
                          required={field.required}
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
                                e.target.value = ''; // Clear the input
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
                    background: isPreview ? '#6b7280' : ((error || Object.values(loadingFiles).some(v => v)) ? '#9ca3af' : '#1e40af'),
                    cursor: isPreview ? 'not-allowed' : ((error || Object.values(loadingFiles).some(v => v)) ? 'not-allowed' : 'pointer')
                  }}
                  disabled={isPreview || !!error || Object.values(loadingFiles).some(v => v)}
                >
                  {Object.values(loadingFiles).some(v => v) ? 'Waiting for uploads...' : (isPreview ? 'Preview Mode Only (Submission Disabled)' : 'Submit Response')}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FormFiller;


