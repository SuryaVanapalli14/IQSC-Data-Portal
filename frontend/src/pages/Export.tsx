import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Calendar, Filter, FileSpreadsheet, User, FileText, Search, X, Check, ChevronDown, Database, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

interface FormItem {
  id: string;
  title: string;
  createdAt: string;
}

interface Officer {
  id: string;
  name: string;
  email: string;
}

type ExportType = 'FORMS' | 'LOGS';

const Export = () => {
  const [searchParams] = useSearchParams();
  const [exportType, setExportType] = useState<ExportType>(searchParams.get('type') === 'LOGS' ? 'LOGS' : 'FORMS');
  const [forms, setForms] = useState<FormItem[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    formId: searchParams.get('formId') || '',
    respondentId: '',
    action: ''
  });
  
  const [formSearch, setFormSearch] = useState('');
  const [officerSearch, setOfficerSearch] = useState('');
  const [showFormDropdown, setShowFormDropdown] = useState(false);
  const [showOfficerDropdown, setShowOfficerDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const officerRef = useRef<HTMLDivElement>(null);

  const logActions = ['LOGIN', 'FORM_CREATED', 'FORM_FILLED', 'DATA_EXPORTED', 'TEMPLATE_UPDATED', 'CREATED_USER', 'UPDATED_NAME', 'UPDATED_EMAIL', 'UPDATED_PASSWORD', 'UPDATED_ROLE', 'DELETED_USER'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [formsRes, usersRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/forms`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        const sortedForms = (formsRes.data || []).sort((a: FormItem, b: FormItem) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setForms(sortedForms);
        setOfficers((usersRes.data || []).filter((u: any) => u.role === 'USER'));
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
      }
    };
    fetchData();

    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) setShowFormDropdown(false);
      if (officerRef.current && !officerRef.current.contains(event.target as Node)) setShowOfficerDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportForms = async (token: string) => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/export-data`, {
      headers: { Authorization: `Bearer ${token}` },
      params: filters
    });

    const data = res.data;
    if (!data || data.length === 0) {
      alert('No records found for the selected filters.');
      return;
    }

    let headers = ['Submission Date and Time', 'Respondent Name', 'Respondent Email', 'Form Title'];
    
    // Collect all unique fields from all exported forms to handle mixed exports if ever allowed
    // For now, since formId is required, it will be fields for a single form
    const fieldsMap = new Map<string, { label: string, id: string }>();
    
    data.forEach((item: any) => {
      if (item.form && item.form.schema) {
        item.form.schema.forEach((field: any) => {
          fieldsMap.set(field.id, { label: field.label, id: field.id });
        });
      }
    });
    
    const sortedFields = Array.from(fieldsMap.values());
    const dynamicHeaders = sortedFields.map(f => f.label);
    const allHeaders = [...headers, ...dynamicHeaders];
    const csvRows = [allHeaders.join(',')];

    data.forEach((item: any) => {
      const row = [
        format(new Date(item.submittedAt), 'yyyy-MM-dd HH:mm:ss'),
        `"${(item.respondent?.name || 'Unknown').replace(/"/g, '""')}"`,
        `"${(item.respondent?.email || 'N/A').replace(/"/g, '""')}"`,
        `"${(item.form?.title || 'Untitled Form').replace(/"/g, '""')}"`
      ];

      sortedFields.forEach(field => {
        const val = item.data[field.id];
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

    return { csv: csvRows.join('\n'), filename: `form_data_${format(new Date(), 'yyyyMMdd_HHmm')}.csv` };
  };

  const handleExportLogs = async (token: string) => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/logs`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    let logData = res.data || [];
    
    if (filters.startDate) logData = logData.filter((l: any) => new Date(l.createdAt) >= new Date(filters.startDate));
    if (filters.endDate) logData = logData.filter((l: any) => new Date(l.createdAt) <= new Date(filters.endDate));
    if (filters.respondentId) logData = logData.filter((l: any) => l.userId === filters.respondentId);
    if (filters.action) logData = logData.filter((l: any) => l.action === filters.action);

    if (logData.length === 0) {
      alert('No audit logs found for the selected filters.');
      return null;
    }

    const headers = ['Timestamp', 'User Name', 'User Email', 'Role', 'Action', 'Details'];
    const csvRows = [headers.join(',')];

    logData.forEach((log: any) => {
      const row = [
        format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        `"${log.user.name.replace(/"/g, '""')}"`,
        `"${log.user.email.replace(/"/g, '""')}"`,
        log.user.role,
        log.action,
        `"${(log.details || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    return { csv: csvRows.join('\n'), filename: `audit_logs_${format(new Date(), 'yyyyMMdd_HHmm')}.csv` };
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const result = exportType === 'FORMS' 
        ? await handleExportForms(token) 
        : await handleExportLogs(token);

      if (!result) return;

      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', result.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      axios.post(`${import.meta.env.VITE_API_URL}/api/admin/log-export`, 
        { formId: exportType, count: result.csv.split('\n').length - 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(err => console.error('Failed to log export:', err));

    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data.');
    } finally {
      setExporting(false);
    }
  };

  const filteredForms = forms.filter(f => (f.title || '').toLowerCase().includes(formSearch.toLowerCase()));
  const filteredOfficers = officers.filter(o => 
    (o.name || '').toLowerCase().includes(officerSearch.toLowerCase()) || 
    (o.email || '').toLowerCase().includes(officerSearch.toLowerCase())
  );

  const selectedForm = forms.find(f => f.id === filters.formId);
  const selectedOfficer = officers.find(o => o.id === filters.respondentId);

  // Common Input Styles for Uniformity
  const commonInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    minHeight: '44px',
    outline: 'none',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.6rem', 
    fontSize: '0.9rem', 
    fontWeight: 'bold', 
    marginBottom: '0.8rem', 
    opacity: 0.9 
  };

  return (
    <div className="container animate-fade">
      <div style={{ marginBottom: '1.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>Global Export Center</h1>
          <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>Unified data extraction for form submissions and system audit logs.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--card-bg)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <button 
            onClick={() => setExportType('FORMS')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '12px 24px', borderRadius: '8px', border: 'none',
              background: exportType === 'FORMS' ? 'var(--accent-primary)' : 'transparent',
              color: exportType === 'FORMS' ? 'white' : 'var(--text-primary)',
              fontWeight: '700', transition: 'all 0.2s', fontSize: '0.95rem'
            }}
          >
            <Database size={18} /> Forms Data
          </button>
          <button 
            onClick={() => setExportType('LOGS')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '12px 24px', borderRadius: '8px', border: 'none',
              background: exportType === 'LOGS' ? 'var(--accent-primary)' : 'transparent',
              color: exportType === 'LOGS' ? 'white' : 'var(--text-primary)',
              fontWeight: '700', transition: 'all 0.2s', fontSize: '0.95rem'
            }}
          >
            <FileText size={18} /> Audit Logs
          </button>
        </div>
      </div>

      <div style={{ 
        background: 'var(--card-bg)', 
        borderRadius: '20px', 
        border: '1px solid var(--border-color)',
        padding: '2.5rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
          {/* Shared Date Filters */}
          <div>
            <label style={labelStyle}>
              <Calendar size={18} style={{ color: 'var(--accent-primary)' }} /> Start Date
            </label>
            <input 
              type="date" 
              className="input-reset" 
              style={{ ...commonInputStyle, marginBottom: 0, opacity: filters.startDate ? 1 : 0.5 }} 
              value={filters.startDate} 
              onChange={e => setFilters({ ...filters, startDate: e.target.value })} 
            />
          </div>

          <div>
            <label style={labelStyle}>
              <Calendar size={18} style={{ color: 'var(--accent-primary)' }} /> End Date
            </label>
            <input 
              type="date" 
              className="input-reset"
              style={{ ...commonInputStyle, marginBottom: 0, opacity: filters.endDate ? 1 : 0.5 }} 
              value={filters.endDate} 
              onChange={e => setFilters({ ...filters, endDate: e.target.value })} 
            />
          </div>

          {exportType === 'FORMS' ? (
            <>
              {/* Form Filter */}
              <div ref={formRef} style={{ position: 'relative' }}>
                <label style={labelStyle}>
                  <FileText size={18} style={{ color: 'var(--accent-primary)' }} /> Select Form
                </label>
                <div 
                  onClick={() => setShowFormDropdown(!showFormDropdown)} 
                  style={{ 
                    ...commonInputStyle,
                    border: filters.formId ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    padding: filters.formId ? '9px 13px' : '10px 14px', // Adjust for border thickness
                  }}
                >
                  <span style={{ opacity: selectedForm ? 1 : 0.5 }}>{selectedForm ? selectedForm.title : 'Search and select a form...'}</span>
                  {filters.formId ? <X size={16} style={{ opacity: 0.5 }} onClick={(e) => { e.stopPropagation(); setFilters({ ...filters, formId: '' }); }} /> : <ChevronDown size={18} style={{ opacity: 0.5 }} />}
                </div>
                {showFormDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', marginTop: '8px', zIndex: 100, boxShadow: '0 15px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)' }}>
                      <Search size={16} style={{ opacity: 0.5 }} />
                      <input type="text" placeholder="Type to search forms..." style={{ background: 'none', border: 'none', color: 'inherit', width: '100%', outline: 'none', fontSize: '0.9rem' }} value={formSearch} onChange={e => setFormSearch(e.target.value)} autoFocus />
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {filteredForms.map(f => (
                        <div key={f.id} onClick={() => { setFilters({ ...filters, formId: f.id }); setShowFormDropdown(false); }} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: filters.formId === f.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent', fontSize: '0.9rem', transition: 'background 0.2s' }}>
                          <span style={{ fontWeight: filters.formId === f.id ? '600' : '400' }}>{f.title}</span>
                          {filters.formId === f.id && <Check size={16} style={{ color: 'var(--accent-primary)' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Officer Filter */}
              <div ref={officerRef} style={{ position: 'relative' }}>
                <label style={labelStyle}>
                  <User size={18} style={{ color: 'var(--accent-primary)' }} /> Select Officer
                </label>
                <div onClick={() => setShowOfficerDropdown(!showOfficerDropdown)} style={commonInputStyle}>
                  <span style={{ opacity: selectedOfficer ? 1 : 0.5 }}>{selectedOfficer ? selectedOfficer.name : 'All Officers'}</span>
                  {filters.respondentId ? <X size={16} style={{ opacity: 0.5 }} onClick={(e) => { e.stopPropagation(); setFilters({ ...filters, respondentId: '' }); }} /> : <ChevronDown size={18} style={{ opacity: 0.5 }} />}
                </div>
                {showOfficerDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', marginTop: '8px', zIndex: 100, boxShadow: '0 15px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)' }}>
                      <Search size={16} style={{ opacity: 0.5 }} />
                      <input type="text" placeholder="Search officers..." style={{ background: 'none', border: 'none', color: 'inherit', width: '100%', outline: 'none', fontSize: '0.9rem' }} value={officerSearch} onChange={e => setOfficerSearch(e.target.value)} autoFocus />
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      <div onClick={() => { setFilters({ ...filters, respondentId: '' }); setShowOfficerDropdown(false); }} style={{ padding: '12px 16px', cursor: 'pointer', background: !filters.respondentId ? 'rgba(37, 99, 235, 0.1)' : 'transparent', fontSize: '0.9rem' }}>All Officers</div>
                      {filteredOfficers.map(o => (
                        <div key={o.id} onClick={() => { setFilters({ ...filters, respondentId: o.id }); setShowOfficerDropdown(false); }} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: filters.respondentId === o.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent', fontSize: '0.9rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: filters.respondentId === o.id ? '600' : '400' }}>{o.name}</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{o.email}</span>
                          </div>
                          {filters.respondentId === o.id && <Check size={16} style={{ color: 'var(--accent-primary)' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Action Filter */}
              <div>
                <label style={labelStyle}>
                  <Activity size={18} style={{ color: 'var(--accent-primary)' }} /> Select Action
                </label>
                <div style={{ position: 'relative' }}>
                  <select 
                    className="input-reset" 
                    style={{ ...commonInputStyle, appearance: 'none', cursor: 'pointer', opacity: filters.action ? 1 : 0.5 }}
                    value={filters.action}
                    onChange={e => setFilters({ ...filters, action: e.target.value })}
                  >
                    <option value="" style={{ opacity: 0.5 }}>All System Actions</option>
                    {logActions.map(action => (
                      <option key={action} value={action} style={{ opacity: 1, background: 'var(--card-bg)' }}>{action.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                </div>
              </div>

              {/* Officer Filter */}
              <div ref={officerRef} style={{ position: 'relative' }}>
                <label style={labelStyle}>
                  <User size={18} style={{ color: 'var(--accent-primary)' }} /> Select Officer
                </label>
                <div onClick={() => setShowOfficerDropdown(!showOfficerDropdown)} style={commonInputStyle}>
                  <span style={{ opacity: selectedOfficer ? 1 : 0.5 }}>{selectedOfficer ? selectedOfficer.name : 'All Officers'}</span>
                  {filters.respondentId ? <X size={16} style={{ opacity: 0.5 }} onClick={(e) => { e.stopPropagation(); setFilters({ ...filters, respondentId: '' }); }} /> : <ChevronDown size={18} style={{ opacity: 0.5 }} />}
                </div>
                {showOfficerDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', marginTop: '8px', zIndex: 100, boxShadow: '0 15px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)' }}>
                      <Search size={16} style={{ opacity: 0.5 }} />
                      <input type="text" placeholder="Search officers..." style={{ background: 'none', border: 'none', color: 'inherit', width: '100%', outline: 'none', fontSize: '0.9rem' }} value={officerSearch} onChange={e => setOfficerSearch(e.target.value)} autoFocus />
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      <div onClick={() => { setFilters({ ...filters, respondentId: '' }); setShowOfficerDropdown(false); }} style={{ padding: '12px 16px', cursor: 'pointer', background: !filters.respondentId ? 'rgba(37, 99, 235, 0.1)' : 'transparent', fontSize: '0.9rem' }}>All Officers</div>
                      {filteredOfficers.map(o => (
                        <div key={o.id} onClick={() => { setFilters({ ...filters, respondentId: o.id }); setShowOfficerDropdown(false); }} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: filters.respondentId === o.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent', fontSize: '0.9rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: filters.respondentId === o.id ? '600' : '400' }}>{o.name}</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{o.email}</span>
                          </div>
                          {filters.respondentId === o.id && <Check size={16} style={{ color: 'var(--accent-primary)' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={handleExport} 
            disabled={exporting || (exportType === 'FORMS' && !filters.formId)} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '12px 32px', fontSize: '1rem', borderRadius: '8px', 
              background: 'var(--accent-primary)', color: 'white', 
              boxShadow: (exportType === 'LOGS' || filters.formId) ? '0 4px 15px rgba(37, 99, 235, 0.25)' : 'none', 
              opacity: (exporting || (exportType === 'FORMS' && !filters.formId)) ? 0.5 : 1, 
              cursor: exporting ? 'wait' : ((exportType === 'FORMS' && !filters.formId) ? 'not-allowed' : 'pointer'),
              fontWeight: '700', border: 'none', transition: 'all 0.2s'
            }}
          >
            <FileSpreadsheet size={20} /> {exporting ? 'Generating...' : `Export ${exportType === 'FORMS' ? 'Data' : 'Logs'}`}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '15px', color: 'var(--accent-primary)', fontSize: '0.95rem', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
        <Filter size={20} /> 
        <span style={{ fontWeight: '500' }}>
          {exportType === 'FORMS' 
            ? 'Form selection is mandatory for data extraction. Date and Officer filters are optional.' 
            : 'All filters are optional for Audit Logs. Leave them empty to export the complete history.'}
        </span>
      </div>
    </div>
  );
};

export default Export;


