import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Clock, FileSpreadsheet } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io(`${import.meta.env.VITE_API_URL}`);

interface Log {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

const Logs = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/logs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();

    socket.on('new_log', (newLog: Log) => {
      setLogs(prev => [newLog, ...prev]);
    });

    return () => {
      socket.off('new_log');
    };
  }, []);

  const handleExport = () => {
    if (logs.length === 0) {
      alert('No logs to export.');
      return;
    }

    setExporting(true);
    try {
      const headers = ['Timestamp', 'User Name', 'User Email', 'Role', 'Action', 'Details'];
      const csvRows = [headers.join(',')];

      logs.forEach((log) => {
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

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log this export too!
      const token = localStorage.getItem('token');
      axios.post(`${import.meta.env.VITE_API_URL}/api/admin/log-export`, 
        { formId: 'AUDIT_LOGS', count: logs.length },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(err => console.error('Failed to log audit export:', err));

    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export logs.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="container">Loading Audit Logs...</div>;

  return (
    <div className="container animate-fade">
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>Audit Logs</h1>
          <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>System-wide activity monitoring and security trail.</p>
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
          {exporting ? 'Generating CSV...' : 'Export Logs'}
        </button>
      </div>

      <div style={{ 
        background: 'var(--card-bg)', 
        borderRadius: '12px', 
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>Timestamp</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>User</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>Action</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Clock size={16} opacity={0.5} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>{format(new Date(log.createdAt), 'MMM dd, yyyy')}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{format(new Date(log.createdAt), 'HH:mm:ss')}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {log.user.name[0]}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>{log.user.name}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{log.user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      background: log.action === 'LOGIN' ? 'rgba(59, 130, 246, 0.1)' : 
                                  log.action === 'FORM_CREATED' ? 'rgba(16, 185, 129, 0.1)' : 
                                  'rgba(245, 158, 11, 0.1)',
                      color: log.action === 'LOGIN' ? '#3b82f6' : 
                             log.action === 'FORM_CREATED' ? '#10b981' : 
                             '#f59e0b',
                      border: '1px solid currentColor'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', opacity: 0.8, fontSize: '0.9rem' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Logs;


