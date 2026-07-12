import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, ArrowRight, MessageSquare, Plus, CheckCircle, Eye, FolderOpen, ArrowLeft, Search, Trash2 } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io(`${import.meta.env.VITE_API_URL}`);

interface Folder {
  id: string;
  name: string;
  _count?: { forms: number };
}

interface Form {
  id: string;
  title: string;
  description: string;
  _count?: { responses: number };
  alreadyFilled?: boolean;
  responseStatus?: string | null;
  rejectionComment?: string | null;
  createdAt: string;
  folderId?: string | null;
  folder?: { id: string; name: string } | null;
  targetNames?: string[];
}

const Dashboard = () => {
  const { user } = useApp();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'home'>('home');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string | null>(null);
  const [movingFormId, setMovingFormId] = useState<string | null>(null);
  const [hoveredFormTargetId, setHoveredFormTargetId] = useState<string | null>(null);
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const [deleteFormTitle, setDeleteFormTitle] = useState<string>('');
  const [deletingForm, setDeletingForm] = useState(false);

  const getFolderDepartmentsCountText = (folderId: string) => {
    const folderForms = forms.filter(f => f.folderId === folderId);
    if (folderForms.length === 0) return '0 Departments';
    const hasAll = folderForms.some(f => !f.targetNames || f.targetNames.length === 0);
    if (hasAll) {
      return 'All Departments';
    }
    const set = new Set<string>();
    folderForms.forEach(f => {
      f.targetNames?.forEach(s => set.add(s));
    });
    const count = set.size;
    return `${count} ${count === 1 ? 'Department' : 'Departments'}`;
  };

  const getFolderTargetedDepartments = () => {
    const folderForms = forms.filter(f => f.folderId === selectedFolderId);
    const hasAll = folderForms.some(f => !f.targetNames || f.targetNames.length === 0);
    if (hasAll) {
      return 'All Departments';
    }
    const set = new Set<string>();
    folderForms.forEach(f => {
      f.targetNames?.forEach(s => set.add(s));
    });
    return Array.from(set);
  };

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const sorted = [...res.data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setForms(sorted);
        
        // Join rooms for all forms to get updates
        res.data.forEach((f: any) => socket.emit('join_form', f.id));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    const fetchFolders = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/folders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFolders(res.data);
      } catch (err) {
        console.error('Failed to fetch folders', err);
      }
    };
    fetchForms();
    fetchFolders();

    // Socket listener for new forms
    socket.on('form_created', (newForm) => {
      if (user?.role === 'FACULTY') {
        const isTargeted = !newForm.targetNames || 
                          newForm.targetNames.length === 0 || 
                          newForm.targetNames.map((e: string) => e.toLowerCase()).includes(user.email.toLowerCase());
        if (!isTargeted) return;
      }
      setForms(prev => [newForm, ...prev]);
    });

    // Socket listener for new responses
    socket.on('new_response', (response) => {
      setForms(prev => prev.map(f => {
        if (f.id === response.formId) {
          return { 
            ...f, 
            _count: { ...f._count, responses: (f._count?.responses || 0) + 1 },
            alreadyFilled: response.respondentId === user?.id ? true : f.alreadyFilled,
            responseStatus: response.respondentId === user?.id ? response.status : f.responseStatus
          };
        }
        return f;
      }));
    });

    socket.on('response_updated', (response) => {
      setForms(prev => prev.map(f => {
        if (f.id === response.formId) {
          return {
            ...f,
            alreadyFilled: response.respondentId === user?.id ? true : f.alreadyFilled,
            responseStatus: response.respondentId === user?.id ? response.status : f.responseStatus
          };
        }
        return f;
      }));
    });

    socket.on('response_reviewed', (response) => {
      setForms(prev => prev.map(f => {
        if (f.id === response.formId) {
          return {
            ...f,
            alreadyFilled: response.respondentId === user?.id ? true : f.alreadyFilled,
            responseStatus: response.respondentId === user?.id ? response.status : f.responseStatus,
            rejectionComment: response.respondentId === user?.id ? response.rejectionComment : f.rejectionComment
          };
        }
        return f;
      }));
    });

    // Socket listener for deleted forms
    socket.on('form_deleted', ({ id }: { id: string }) => {
      setForms(prev => prev.filter(f => f.id !== id));
    });

    return () => {
      socket.off('new_response');
      socket.off('form_created');
      socket.off('response_updated');
      socket.off('response_reviewed');
      socket.off('form_deleted');
    };
  }, [user]);

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/folders`, 
        { name: newFolderName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFolders(prev => [...prev, { ...res.data, _count: { forms: 0 } }].sort((a,b) => a.name.localeCompare(b.name)));
      setNewFolderName('');
      setShowNewFolderModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create folder');
    }
  };

  const deleteFolder = async (folderId: string, folderName: string) => {
    if (!window.confirm(`Are you sure you want to delete the folder "${folderName}"? The forms inside will not be deleted, they will just become uncategorized.`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/folders/${folderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setForms(prev => prev.map(form => {
        if (form.folderId === folderId) {
          return { ...form, folderId: null, folder: null };
        }
        return form;
      }));
      if (selectedFolderId === folderId) {
        setSelectedFolderId('home');
      }
    } catch (err) {
      alert('Failed to delete folder');
    }
  };

  const handleDeleteForm = async () => {
    if (!deleteFormId) return;
    setDeletingForm(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/forms/${deleteFormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForms(prev => prev.filter(f => f.id !== deleteFormId));
      setDeleteFormId(null);
      setDeleteFormTitle('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete form');
    } finally {
      setDeletingForm(false);
    }
  };

  const moveFormToFolder = async (formId: string, folderId: string | null) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL}/api/forms/${formId}/folder`, 
        { folderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setForms(prev => prev.map(f => {
        if (f.id === formId) {
          const folderObj = folderId ? folders.find(fold => fold.id === folderId) : null;
          return { 
            ...f, 
            folderId, 
            folder: folderObj ? { id: folderObj.id, name: folderObj.name } : null 
          };
        }
        return f;
      }));

      setMovingFormId(null);
    } catch (err) {
      alert('Failed to move form');
    }
  };

  const isOversight = user?.role === 'IQAC_ADMIN' || user?.role === 'HOD';

  const filteredFormsList = forms.filter(form => {
    const matchesSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          form.description.toLowerCase().includes(searchTerm.toLowerCase());
                          
    if (!matchesSearch) return false;

    if (selectedLabelFilter) {
      const targetEmail = `${selectedLabelFilter.toLowerCase()}@mail.com`;
      const matchesLabel = form.targetNames && form.targetNames.some(name => name.toLowerCase() === targetEmail);
      if (!matchesLabel) return false;
    }
    
    if (!isOversight) {
      // Stations see all forms assigned to them directly
      return true;
    }
    
    // For Admin/CCRB:
    if (searchTerm.trim() !== '') {
      // If a search term is present globally on home, search ALL forms across folders
      return true;
    }
    
    if (selectedFolderId === 'home') {
      return !form.folderId;
    }
    return form.folderId === selectedFolderId;
  });

  const activeFolder = folders.find(f => f.id === selectedFolderId);

  const renderFormCard = (form: Form) => {
    return (
      <div 
        key={form.id} 
        style={{ 
          background: 'var(--card-bg)', 
          padding: '1.5rem', 
          borderRadius: '0.75rem', 
          border: '1px solid var(--border-color)', 
          display: 'flex', 
          flexDirection: 'column', 
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1, minWidth: 0 }}>
            <ClipboardList style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={form.title}>{form.title}</h3>
              {isOversight && form.folder && (
                <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', background: 'rgba(37, 99, 235, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-block', marginTop: '2px' }}>
                  📁 {form.folder.name}
                </span>
              )}
            </div>
          </div>
          
          {user?.role === 'IQAC_ADMIN' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                title="Delete Form"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteFormId(form.id);
                  setDeleteFormTitle(form.title);
                }}
                style={{
                  background: 'none',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '0.75rem',
                  opacity: 0.7,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                  e.currentTarget.style.background = 'none';
                }}
              >
                <Trash2 size={13} strokeWidth={2.5} /> Delete
              </button>
              <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMovingFormId(movingFormId === form.id ? null : form.id);
                }}
                title="Move to Folder"
                style={{
                  background: 'none',
                  color: 'var(--text-primary)',
                  opacity: 0.5,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
              >
                📁 Move
              </button>
              {movingFormId === form.id && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  zIndex: 100,
                  minWidth: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '4px',
                  marginTop: '4px'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveFormToFolder(form.id, null);
                    }}
                    style={{
                      padding: '8px 10px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      borderRadius: '4px',
                      fontWeight: !form.folderId ? 'bold' : 'normal'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    📄 Uncategorized
                  </button>
                  {folders.map(fold => (
                    <button
                      key={fold.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveFormToFolder(form.id, fold.id);
                      }}
                      style={{
                        padding: '8px 10px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        borderRadius: '4px',
                        fontWeight: form.folderId === fold.id ? 'bold' : 'normal'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      📁 {fold.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {form.alreadyFilled && form.responseStatus && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                padding: '4px 10px',
                borderRadius: '20px',
                background: form.responseStatus === 'APPROVED' ? 'rgba(34, 197, 94, 0.15)' : 
                            form.responseStatus === 'REJECTED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: form.responseStatus === 'APPROVED' ? '#22c55e' : 
                       form.responseStatus === 'REJECTED' ? '#ef4444' : '#f59e0b',
                border: '1px solid currentColor'
              }}>
                {form.responseStatus === 'PENDING' ? 'Pending HOD' : form.responseStatus}
              </span>
            )}
            {isOversight && (
              <div 
                title="Total Responses"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem', 
                  fontSize: '0.8rem', 
                  background: 'var(--bg-primary)', 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border-color)', 
                  flexShrink: 0 
                }}
              >
                <Users size={14} style={{ color: 'var(--accent-primary)' }} /> 
                <span style={{ fontWeight: 'bold' }}>{form._count?.responses || 0}</span>
              </div>
            )}
          </div>
        </div>
        
        <p style={{ fontSize: '0.9rem', opacity: 0.7, flex: 1, marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {form.description || 'No description provided.'}
        </p>

        {isOversight && (
          <div 
            onMouseEnter={() => setHoveredFormTargetId(form.id)}
            onMouseLeave={() => setHoveredFormTargetId(null)}
            style={{ 
              fontSize: '0.78rem', 
              background: 'var(--bg-primary)', 
              padding: '8px 12px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)', 
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              flexDirection: 'column',
              gap: '2px',
              position: 'relative',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontWeight: 'bold', opacity: 0.5, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Target Departments</span>
            {!form.targetNames || form.targetNames.length === 0 ? (
              <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>All Departments</span>
            ) : (
              <div>
                <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{form.targetNames.length}</span>{' '}
                {form.targetNames.length === 1 ? 'Department' : 'Departments'}
              </div>
            )}

            {/* Custom Tooltip on Hover */}
            {hoveredFormTargetId === form.id && form.targetNames && form.targetNames.length > 0 && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: '8px 12px',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 150,
                minWidth: '200px',
                maxWidth: '280px',
                marginBottom: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                animation: 'fadeIn 0.15s ease forwards'
              }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', opacity: 0.5, textTransform: 'uppercase' }}>Selected Departments List:</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', opacity: 0.9, lineHeight: '1.3' }}>
                  {form.targetNames.map(email => email.split('@')[0].toUpperCase()).join(', ')}
                </span>
                {/* Small arrow */}
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '0',
                  height: '0',
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid var(--border-color)'
                }} />
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: 'auto' }}>
          {(user?.role === 'FACULTY') && (
            <Link 
              to={`/faculty/fill/${form.id}`} 
              className="btn-primary" 
              style={{ 
                textDecoration: 'none', 
                flex: 1, 
                textAlign: 'center', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.4rem',
                padding: '10px',
                borderRadius: '8px',
                background: 'var(--accent-primary)',
                color: 'white',
                fontWeight: '700',
                textTransform: 'uppercase',
                fontSize: '0.75rem'
              }}
            >
              <ArrowRight size={16} /> 
              {form.responseStatus === 'APPROVED' ? 'View Submitted' : 
               form.responseStatus === 'REJECTED' ? 'Edit & Resubmit' : 
               form.responseStatus === 'PENDING' ? 'Edit Response' : 'Fill Form'}
            </Link>
          )}
          
          {isOversight && (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <Link 
                to={`/faculty/fill/${form.id}`} 
                className="btn-primary" 
                style={{ 
                  textDecoration: 'none', 
                  flex: 1, 
                  textAlign: 'center', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  gap: '0.4rem'
                }}
              >
                <Eye size={16} /> View Form
              </Link>
              <Link 
                to={`/admin/responses/${form.id}`} 
                className="btn-primary"
                style={{ 
                  textDecoration: 'none', 
                  flex: 1, 
                  textAlign: 'center', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  gap: '0.4rem'
                }}
              >
                <MessageSquare size={16} /> View Responses
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container animate-fade">
      {/* Greetings Block - only shown on Home */}
      {selectedFolderId === 'home' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '2.1rem', fontWeight: '700', margin: '0 0 0.5rem 0', letterSpacing: '-0.01em' }}>
              {user?.role === 'IQAC_ADMIN' ? 'IQAC Admin Page' : 'Faculty Page'}
            </h1>
            <span style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              background: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--accent-primary)',
              marginBottom: '6px'
            }}>
              {user?.role === 'IQAC_ADMIN' ? 'Admin Access' : 'Faculty Access'}
            </span>
          </div>
          <p style={{ opacity: 0.7, fontSize: '1.1rem', margin: 0 }}>Welcome back, {user?.name}. {user?.role === 'IQAC_ADMIN' ? 'Manage your organization forms and view responses.' : 'Access and fill organization forms.'}</p>
        </div>
      )}

      {/* Label/Department Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.6, marginRight: '0.5rem' }}>Filter by Department:</span>
        <button
          onClick={() => setSelectedLabelFilter(null)}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            background: selectedLabelFilter === null ? 'var(--accent-primary)' : 'var(--card-bg)',
            color: selectedLabelFilter === null ? 'white' : 'var(--text-primary)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          All
        </button>
        {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'MBA', 'MCA'].map(label => {
          const isSelected = selectedLabelFilter === label;
          return (
            <button
              key={label}
              onClick={() => setSelectedLabelFilter(isSelected ? null : label)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                background: isSelected ? 'var(--accent-primary)' : 'var(--card-bg)',
                color: isSelected ? 'white' : 'var(--text-primary)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Redesigned Glass-morphic Control Panel with Search and Create Button - ADMIN/CCRB and Home only */}
      {isOversight && selectedFolderId === 'home' && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          background: 'var(--card-bg)',
          padding: '1rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '500px', background: 'var(--bg-primary)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <Search size={18} style={{ opacity: 0.5, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search forms by title or description globally..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '100%',
                fontSize: '0.95rem'
              }}
            />
          </div>

          {user?.role === 'IQAC_ADMIN' && (
            <Link 
              to="/admin/create" 
              className="btn-primary" 
              style={{ 
                textDecoration: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 20px', 
                borderRadius: '12px', 
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', 
                whiteSpace: 'nowrap', 
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              <Plus size={18} /> Create New Form
            </Link>
          )}
        </div>
      )}

      {!isOversight ? (
        /* Stations / Officers direct forms view (no folders, no search bar) */
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.01em', marginBottom: '1.25rem' }}>Available Forms</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '1.5rem' }}>
            {filteredFormsList.map(form => renderFormCard(form))}
            
            {filteredFormsList.length === 0 && !loading && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                No available forms at the moment.
              </div>
            )}
          </div>
        </div>
      ) : selectedFolderId === 'home' ? (
        /* Admins / CCRB Home Dashboard view with Folders */
        <>
          {/* Folders Section - only show if search is not active */}
          {searchTerm.trim() === '' && (
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.01em', margin: 0 }}>Folders</h2>
                {user?.role === 'IQAC_ADMIN' && (
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      border: '1px dashed var(--accent-primary)',
                      background: 'transparent',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Plus size={14} /> New Folder
                  </button>
                )}
              </div>

              {folders.length === 0 ? (
                <div style={{
                  background: 'var(--bg-primary)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '0.75rem',
                  padding: '2.5rem',
                  textAlign: 'center',
                  opacity: 0.6,
                  fontSize: '0.9rem'
                }}>
                  📂 No folders created yet. {user?.role === 'IQAC_ADMIN' && 'Create one using the button above!'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '1.25rem' }}>
                  {folders.map(folder => {
                    const folderFormsCount = forms.filter(f => f.folderId === folder.id).length;
                    return (
                      <div 
                        key={folder.id} 
                        onClick={() => setSelectedFolderId(folder.id)}
                        style={{ 
                          background: 'var(--card-bg)', 
                          padding: '1.25rem', 
                          borderRadius: '0.75rem', 
                          border: '1px solid var(--border-color)', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05)';
                          e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              background: 'rgba(37, 99, 235, 0.1)',
                              color: 'var(--accent-primary)',
                              padding: '10px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <FolderOpen size={24} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{folder.name}</h3>
                              <p style={{ margin: '2px 0 0 0', opacity: 0.6, fontSize: '0.8rem' }}>
                                {folderFormsCount} {folderFormsCount === 1 ? 'form' : 'forms'}
                              </p>
                            </div>
                          </div>

                          {user?.role === 'IQAC_ADMIN' && (
                            <button
                              title="Delete Folder"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFolder(folder.id, folder.name);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                opacity: 0.6
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '0.6';
                                e.currentTarget.style.background = 'none';
                              }}
                            >
                              <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Forms Section */}
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.01em', marginBottom: '1.25rem' }}>
              {searchTerm.trim() !== '' ? 'Search Results' : 'Uncategorized Forms'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '1.5rem' }}>
              {filteredFormsList.map(form => renderFormCard(form))}
              
              {filteredFormsList.length === 0 && !loading && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                  {searchTerm ? 'No forms match your search criteria.' : 'No uncategorized forms available.'}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Admins / CCRB Folder Details view */
        <>
          {/* Active Folder View Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '2rem',
            background: 'var(--card-bg)',
            padding: '1rem 1.5rem',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => { setSelectedFolderId('home'); setSearchTerm(''); }}
                title="Back to Home"
                style={{
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--accent-primary)',
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)'}
              >
                <ArrowLeft size={20} style={{ strokeWidth: 2.5 }} />
              </button>
              <div style={{
                background: 'rgba(37, 99, 235, 0.05)',
                color: 'var(--accent-primary)',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <FolderOpen size={20} />
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '700', margin: 0 }}>{activeFolder?.name}</h2>
            </div>

            {/* Small Local Folder Search Bar in Right Corner */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'var(--bg-primary)', 
              padding: '6px 12px', 
              borderRadius: '10px', 
              border: '1px solid var(--border-color)',
              width: '240px'
            }}>
              <Search size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search folder..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', gap: '1.5rem' }}>
            {filteredFormsList.map(form => renderFormCard(form))}

            {filteredFormsList.length === 0 && !loading && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                {searchTerm ? 'No forms match your search criteria.' : 'No forms available in this folder yet.'}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Folder Modal */}
      {showNewFolderModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--card-bg)',
            padding: '2rem',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Create New Folder</h3>
            <form onSubmit={createFolder}>
              <input
                type="text"
                className="input"
                placeholder="Folder Name (e.g., Weekly Audits)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                required
                autoFocus
                style={{ width: '100%', padding: '10px', marginBottom: '1.5rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="btn-secondary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--accent-primary)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Form Confirmation Modal */}
      {deleteFormId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            padding: '2rem',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 0 0 1px rgba(239, 68, 68, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '10px',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Trash2 size={22} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Delete Form?</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', opacity: 0.6 }}>This action cannot be undone</p>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem', lineHeight: '1.6' }}>
              You are about to permanently delete <strong style={{ color: 'var(--text-primary)' }}>"{deleteFormTitle}"</strong>. All associated responses will also be deleted.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setDeleteFormId(null); setDeleteFormTitle(''); }}
                disabled={deletingForm}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: deletingForm ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteForm}
                disabled={deletingForm}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: deletingForm ? '#c53030' : '#ef4444',
                  color: 'white',
                  cursor: deletingForm ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {deletingForm ? 'Deleting...' : 'Delete Form'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
