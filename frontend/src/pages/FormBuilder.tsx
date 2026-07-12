import React, { useState, useEffect } from 'react';
import { Plus, Trash, Save, Eye, ArrowLeft, Copy, FolderOpen, Pencil, X, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Field {
  id: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select
  allowedTypes?: string[]; // for file fields
}

const stationList = [
  { email: 'gunadala@mail.com', name: 'Gunadala' },
  { email: 'machavaram@mail.com', name: 'Machavaram' },
  { email: 'patamata@mail.com', name: 'Patamata' },
  { email: 'governorpet@mail.com', name: 'Governorpet' },
  { email: 'krishnalanka@mail.com', name: 'Krishnalanka' },
  { email: 'suryaraopet@mail.com', name: 'Suryaraopet' },
  { email: 'ajith_singh_nagar@mail.com', name: 'Ajith Singh Nagar' },
  { email: 'nunna@mail.com', name: 'Nunna' },
  { email: 'satyanarayanapuram@mail.com', name: 'Satyanarayanapuram' },
  { email: 'bhavanipuram@mail.com', name: 'Bhavanipuram' },
  { email: 'ibrahimpatnam@mail.com', name: 'Ibrahimpatnam' },
  { email: 'vijayawada_i_town@mail.com', name: 'Vijayawada I Town' },
  { email: 'vijayawada_ii_town@mail.com', name: 'Vijayawada II Town' },
  { email: 'vijayawada_traffic_i_t@mail.com', name: 'Vijayawada Traffic I (T)' },
  { email: 'vijayawada_traffic_ii_t@mail.com', name: 'Vijayawada Traffic II (T)' },
  { email: 'vijayawada_traffic_iii_t@mail.com', name: 'Vijayawada Traffic III (T)' },
  { email: 'vijayawada_traffic_iv_t@mail.com', name: 'Vijayawada Traffic IV (T)' },
  { email: 'vijayawada_traffic_v_t@mail.com', name: 'Vijayawada Traffic V (T)' },
  { email: 'g_konduru@mail.com', name: 'G. Konduru' },
  { email: 'mylavaram@mail.com', name: 'Mylavaram' },
  { email: 'reddigudem@mail.com', name: 'Reddigudem' },
  { email: 'a_konduru@mail.com', name: 'A. Konduru' },
  { email: 'gampalagudem@mail.com', name: 'Gampalagudem' },
  { email: 'tiruvuru@mail.com', name: 'Tiruvuru' },
  { email: 'vissannapet@mail.com', name: 'Vissannapet' },
  { email: 'nandigama@mail.com', name: 'Nandigama' },
  { email: 'chillakallu@mail.com', name: 'Chillakallu' },
  { email: 'jaggaiahpet@mail.com', name: 'Jaggaiahpet' },
  { email: 'penuganchiprolu@mail.com', name: 'Penuganchiprolu' },
  { email: 'vatsavai@mail.com', name: 'Vatsavai' },
  { email: 'chandarlapadu@mail.com', name: 'Chandarlapadu' },
  { email: 'kanchikacherla@mail.com', name: 'Kanchikacherla' },
  { email: 'veerulapadu@mail.com', name: 'Veerulapadu' },
  { email: 'cyber_crime@mail.com', name: 'Cyber Crime' },
  { email: 'mahila_ups@mail.com', name: 'Mahila UPS' }
];

const FormBuilder = () => {
  const [title, setTitle] = useState('Untitled Form');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [targetStations, setTargetStations] = useState<string[]>([]);
  const [showStationDropdown, setShowStationDropdown] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [leftWidth, setLeftWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleMouseDown = () => setIsResizing(true);
  
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTemplates(res.data);
      } catch (err) {
        console.error('Failed to fetch templates');
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
        console.error('Failed to fetch folders');
      }
    };
    fetchTemplates();
    fetchFolders();
  }, []);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) {
        setLeftWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const addField = (type: Field['type']) => {
    const newField: Field = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: `New ${type} field`,
      placeholder: '',
      required: false,
      options: type === 'select' ? [] : undefined
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<Field>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const saveAsTemplate = async () => {
    if (editingTemplateId) {
      if (window.confirm('Update existing template?')) {
        try {
          const token = localStorage.getItem('token');
          await axios.put(`${import.meta.env.VITE_API_URL}/api/templates/${editingTemplateId}`, 
            { name: title, description, schema: fields },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          alert('Template updated successfully');
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setTemplates(res.data);
          return;
        } catch (err) {
          alert('Failed to update template');
          return;
        }
      }
    }

    const name = prompt('Enter template name:', title);
    if (!name) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/templates`, 
        { name, description, schema: fields },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Template saved successfully');
      // Refresh templates
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(res.data);
    } catch (err) {
      alert('Failed to save template');
    }
  };

  const deleteTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(templates.filter(t => t.id !== id));
    } catch (err) {
      alert('Failed to delete template');
    }
  };

  const loadTemplate = (template: any) => {
    setTitle(template.name);
    setDescription(template.description || '');
    setFields(template.schema);
    setEditingTemplateId(template.id);
    setShowTemplateModal(false);
  };

  const saveForm = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/forms`, 
        { title, description, schema: fields, targetStations, folderId: selectedFolderId || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/admin');
    } catch (err) {
      alert('Failed to save form');
    }
  };

  return (
    <div className="layout-split" style={{ userSelect: isResizing ? 'none' : 'auto' }}>
      {/* LEFT SIDE: Schema Builder */}
      <div className="split-left" style={{ flex: `0 0 ${leftWidth}%` }}>
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => navigate('/admin')} style={{ background: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: 0 }}>
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Form Settings</h2>
            <button 
              onClick={() => setShowTemplateModal(true)}
              className="btn-primary" 
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FolderOpen size={16} /> Load Template
            </button>
          </div>
          <input 
            className="input" 
            style={{ fontSize: '1.5rem', fontWeight: 'bold' }} 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea 
            className="input" 
            placeholder="Form description..." 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
          />

          <div style={{ marginTop: '1rem', position: 'relative' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Target Police Stations
            </label>
            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>
              Select specific stations allowed to view and fill this form. Leave blank to target all stations.
            </p>
            <div style={{ position: 'relative' }}>
              <div 
                style={{ 
                  minHeight: '42px',
                  padding: '6px 36px 6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  alignItems: 'center'
                }}
                onClick={() => setShowStationDropdown(!showStationDropdown)}
              >
                {targetStations.length === 0 ? (
                  <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>All Police Stations</span>
                ) : (
                  targetStations.map(email => {
                    const stationName = stationList.find(s => s.email === email)?.name || email;
                    return (
                      <div 
                        key={email} 
                        style={{ 
                          background: 'var(--accent-primary)', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.8rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px' 
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {stationName}
                        <button 
                          style={{ background: 'none', border: 'none', color: 'white', padding: 0, cursor: 'pointer', display: 'flex' }}
                          onClick={() => setTargetStations(targetStations.filter(s => s !== email))}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                <ChevronDown size={18} />
              </div>
            </div>

            {showStationDropdown && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                background: 'var(--card-bg)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                maxHeight: '200px', 
                overflowY: 'auto', 
                zIndex: 50,
                marginTop: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)', position: 'sticky', top: 0 }}>
                  <button 
                    style={{ fontSize: '0.75rem', fontWeight: 'bold', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setTargetStations(stationList.map(s => s.email)); }}
                  >
                    Select All
                  </button>
                  <button 
                    style={{ fontSize: '0.75rem', fontWeight: 'bold', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setTargetStations([]); }}
                  >
                    Clear All
                  </button>
                </div>
                {stationList.map(station => {
                  const isSelected = targetStations.includes(station.email);
                  return (
                    <div 
                      key={station.email} 
                      style={{ 
                        padding: '8px 12px', 
                        fontSize: '0.9rem', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        background: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                        color: 'var(--text-primary)',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          setTargetStations(targetStations.filter(s => s !== station.email));
                        } else {
                          setTargetStations([...targetStations, station.email]);
                        }
                      }}
                    >
                      <span>{station.name}</span>
                      {isSelected && <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Assign to Folder
            </label>
            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>
              Select a folder to organize this form, or leave it uncategorized.
            </p>
            <select
              value={selectedFolderId}
              onChange={async (e) => {
                const val = e.target.value;
                if (val === '__create_new__') {
                  const newName = prompt('Enter the name for the new folder:');
                  if (newName && newName.trim()) {
                    try {
                      const token = localStorage.getItem('token');
                      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/folders`, 
                        { name: newName.trim() },
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      const newFolder = res.data;
                      setFolders(prev => [...prev, newFolder].sort((a,b) => a.name.localeCompare(b.name)));
                      setSelectedFolderId(newFolder.id);
                    } catch (err: any) {
                      alert(err.response?.data?.error || 'Failed to create folder');
                      setSelectedFolderId('');
                    }
                  } else {
                    setSelectedFolderId('');
                  }
                } else {
                  setSelectedFolderId(val);
                }
              }}
              className="input"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="">Uncategorized (No Folder)</option>
              <option value="__create_new__" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>+ Create New Folder...</option>
              {folders.map(fold => (
                <option key={fold.id} value={fold.id}>
                  📁 {fold.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Fields</h3>
          {fields.map((field) => (
            <div key={field.id} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.6 }}>{field.type} Field</span>
                <button onClick={() => removeField(field.id)} style={{ background: 'none', color: 'red' }}><Trash size={16}/></button>
              </div>
              
              <label style={{ fontSize: '0.8rem' }}>Label</label>
              <input 
                className="input" 
                value={field.label} 
                onChange={(e) => updateField(field.id, { label: e.target.value })}
              />

              {field.type === 'select' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Options</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {field.options?.map((opt, i) => (
                      <div key={i} style={{ background: 'var(--accent-primary)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {opt}
                        <button 
                          onClick={() => {
                            const newOpts = field.options?.filter((_, idx) => idx !== i);
                            updateField(field.id, { options: newOpts });
                          }}
                          style={{ background: 'none', color: 'white', padding: 0, display: 'flex' }}
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      id={`new-opt-${field.id}`}
                      className="input" 
                      style={{ marginBottom: 0 }}
                      placeholder="Add option..." 
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          if (input.value) {
                            updateField(field.id, { options: [...(field.options || []), input.value] });
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <button 
                      className="btn-primary" 
                      style={{ padding: '0 12px' }}
                      onClick={() => {
                        const input = document.getElementById(`new-opt-${field.id}`) as HTMLInputElement;
                        if (input.value) {
                          updateField(field.id, { options: [...(field.options || []), input.value] });
                          input.value = '';
                        }
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

              {field.type === 'file' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', opacity: 0.8 }}>Allowed File Types</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {[
                      { id: 'PDF', label: 'PDF Documents' },
                      { id: 'IMAGE', label: 'Images (PNG, JPG)' },
                      { id: 'SPREADSHEET', label: 'CSV / Excel' },
                      { id: 'VIDEO', label: 'Video (MP4, MKV)' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          const currentTypes = field.allowedTypes || [];
                          const newTypes = currentTypes.includes(type.id) 
                            ? currentTypes.filter((t: string) => t !== type.id)
                            : [...currentTypes, type.id];
                          updateField(field.id, { allowedTypes: newTypes });
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: field.allowedTypes?.includes(type.id) ? 'var(--accent-primary)' : 'var(--bg-primary)',
                          color: field.allowedTypes?.includes(type.id) ? 'white' : 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={field.required} 
                  onChange={(e) => updateField(field.id, { required: e.target.checked })} 
                />
                <label style={{ fontSize: '0.8rem' }}>Required</label>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => addField('text')} className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>+ Text</button>
          <button onClick={() => addField('number')} className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>+ Number</button>
          <button onClick={() => addField('textarea')} className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>+ Textarea</button>
          <button onClick={() => addField('select')} className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>+ Select</button>
          <button onClick={() => addField('file')} className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>+ File</button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
          <button onClick={saveForm} className="btn-primary" style={{ flex: 2, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Save size={20} /> Publish Form
          </button>
          <button onClick={saveAsTemplate} className="btn-primary" style={{ flex: 1, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Copy size={20} /> {editingTemplateId ? 'Update Template' : 'Save as Template'}
          </button>
        </div>

        {/* Template Modal */}
        {showTemplateModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Select a Template</h2>
                <button 
                  onClick={() => setShowTemplateModal(false)} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  placeholder="Search templates..." 
                  className="input" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>
              
              {templates.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center' }}>No saved templates found.</p>}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {templates
                  .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(t => (
                    <div key={t.id} style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{t.name}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{t.schema.length} fields</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => loadTemplate(t)} 
                          className="btn-primary" 
                          style={{ padding: '8px', background: 'var(--card-bg)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                          title="Edit Template"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={(e) => deleteTemplate(e, t.id)} 
                          className="btn-primary" 
                          style={{ padding: '8px', background: 'var(--card-bg)', color: '#ef4444', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                          title="Delete Template"
                        >
                          <Trash size={14} />
                        </button>
                        <button onClick={() => loadTemplate(t)} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem', borderRadius: '6px' }}>Load</button>
                      </div>
                    </div>
                  ))}
                {templates.length > 0 && templates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                  <p style={{ opacity: 0.5, textAlign: 'center' }}>No templates match your search.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RESIZE HANDLE */}
      <div 
        onMouseDown={handleMouseDown}
        style={{ 
          width: '16px', 
          cursor: 'col-resize', 
          background: isResizing ? 'var(--accent-primary)' : 'var(--bg-primary)', 
          borderLeft: '1px solid var(--border-color)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px',
          zIndex: 10,
          transition: 'background 0.2s'
        }} 
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ width: '3px', height: '3px', background: 'var(--text-primary)', opacity: 0.3, borderRadius: '50%' }} />
          <div style={{ width: '3px', height: '3px', background: 'var(--text-primary)', opacity: 0.3, borderRadius: '50%' }} />
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ width: '3px', height: '3px', background: 'var(--text-primary)', opacity: 0.3, borderRadius: '50%' }} />
          <div style={{ width: '3px', height: '3px', background: 'var(--text-primary)', opacity: 0.3, borderRadius: '50%' }} />
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ width: '3px', height: '3px', background: 'var(--text-primary)', opacity: 0.3, borderRadius: '50%' }} />
          <div style={{ width: '3px', height: '3px', background: 'var(--text-primary)', opacity: 0.3, borderRadius: '50%' }} />
        </div>
      </div>

      {/* RIGHT SIDE: Preview */}
      <div className="split-right" style={{ flex: '1 1 auto' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ background: 'var(--bg-primary)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.4, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                <Eye size={14} />
                <span style={{ fontWeight: '800' }}>Preview</span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', lineHeight: '1.2' }}>{title}</h1>
            </div>
            
            <p style={{ opacity: 0.7, marginBottom: '2rem' }}>{description}</p>
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', marginBottom: '2rem' }} />

            {fields.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5, border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
                Start adding fields to see the preview
              </div>
            )}

            {fields.map(field => (
              <div key={field.id} style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                </label>
                
                {field.type === 'text' && <input className="input" placeholder={field.placeholder} />}
                {field.type === 'number' && <input type="number" className="input" />}
                {field.type === 'textarea' && <textarea className="input" rows={3} />}
                {field.type === 'select' && (
                  <select className="input">
                    <option value="">Select an option...</option>
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
                {field.type === 'file' && (
                  <div>
                    <input type="file" className="input" />
                    {field.allowedTypes && field.allowedTypes.length > 0 && (
                      <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.3rem' }}>
                        Accepted formats: {field.allowedTypes.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {fields.length > 0 && (
              <button className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled>
                Submit Response (Preview Only)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;


