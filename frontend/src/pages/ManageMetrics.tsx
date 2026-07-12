import { useEffect, useState } from 'react';
import axios from 'axios';
import { Sliders, Save, CheckCircle, AlertTriangle, Calculator } from 'lucide-react';

interface Metric {
  id: string;
  category: string;
  name: string;
  value: number;
  formula: string | null;
  period: string | null;
  color: string | null;
  totalFiled?: number | null;
  totalSheets?: number | null;
}

const ManageMetrics = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // For editing year headings locally before saving
  const [localYears, setLocalYears] = useState<{ [originalYear: string]: string }>({});
  const [savingYearGroup, setSavingYearGroup] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/ccrb/metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(res.data);
      
      // Initialize local year headings state
      const missingCases = res.data.filter((m: any) => m.category === 'MISSING_CASES');
      const years = Array.from(new Set(
        missingCases.map((m: any) => m.name.split('_')[0]).filter((y: any) => y && !isNaN(Number(y)))
      )) as string[];
      
      const yearMap: { [key: string]: string } = {};
      years.forEach(y => {
        yearMap[y] = y;
      });
      setLocalYears(yearMap);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setErrorMsg('Failed to load metrics from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updatedFields: Partial<Metric>) => {
    setSavingId(id);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const target = metrics.find(m => m.id === id);
      if (!target) return;

      const payload = {
        ...target,
        ...updatedFields,
        value: parseFloat(String(updatedFields.value ?? target.value)),
        totalFiled: updatedFields.totalFiled !== undefined ? updatedFields.totalFiled : target.totalFiled,
        totalSheets: updatedFields.totalSheets !== undefined ? updatedFields.totalSheets : target.totalSheets
      };

      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/ccrb/metrics/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMetrics(prev => prev.map(m => m.id === id ? res.data : m));
      setSuccessMsg(`Metric "${payload.name}" updated successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to update metric.');
    } finally {
      setSavingId(null);
    }
  };

  // Updates the 4 metrics' names and periods when a year is renamed (e.g. 2026 -> 2027)
  const handleUpdateYearHeading = async (originalYear: string) => {
    const targetYear = localYears[originalYear]?.trim();
    if (!targetYear || isNaN(Number(targetYear))) {
      alert('Please enter a valid numeric year.');
      return;
    }

    if (originalYear === targetYear) return;

    setSavingYearGroup(originalYear);
    setSuccessMsg('');
    setErrorMsg('');

    const token = localStorage.getItem('token');
    const yearMetrics = metrics.filter(m => m.category === 'MISSING_CASES' && m.name.startsWith(`${originalYear}_`));

    try {
      for (const metric of yearMetrics) {
        const suffix = metric.name.split('_')[1]; // MAN, BOY, WOMAN, GIRL
        const updatedName = `${targetYear}_${suffix}`;
        const updatedPeriod = `${targetYear} YTD`;

        await axios.put(`${import.meta.env.VITE_API_URL}/api/ccrb/metrics/${metric.id}`, {
          ...metric,
          name: updatedName,
          period: updatedPeriod
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setSuccessMsg(`Year heading successfully updated from ${originalYear} to ${targetYear}!`);
      fetchMetrics();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to rename year.');
    } finally {
      setSavingYearGroup(null);
    }
  };

  // Saves all 4 metrics for a specific year in one click
  const handleSaveYearMetrics = async (year: string) => {
    setSavingYearGroup(year);
    setSuccessMsg('');
    setErrorMsg('');

    const token = localStorage.getItem('token');
    const yearMetrics = metrics.filter(m => m.category === 'MISSING_CASES' && m.name.startsWith(`${year}_`));

    try {
      await Promise.all(yearMetrics.map(metric => {
        return axios.put(`${import.meta.env.VITE_API_URL}/api/ccrb/metrics/${metric.id}`, {
          ...metric,
          value: parseFloat(String(metric.value))
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }));

      setSuccessMsg(`All cases data for Year ${year} successfully updated!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchMetrics();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save metrics.');
    } finally {
      setSavingYearGroup(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-primary)' }}>
        <div className="animate-pulse" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Loading metrics console...</div>
      </div>
    );
  }

  // Filter metrics by categories
  const chargeSheets = metrics.filter(m => m.category === 'CHARGE_SHEET');
  const accidents = metrics.filter(m => m.category === 'ACCIDENTS');
  const missingCases = metrics.filter(m => m.category === 'MISSING_CASES');

  // Extract unique years present in MISSING_CASES metrics
  const uniqueYears = Array.from(new Set(
    missingCases.map(m => {
      const parts = m.name.split('_');
      return parts[0];
    }).filter(y => y && !isNaN(Number(y)))
  )).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="container animate-fade" style={{ padding: '2rem 2.5rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', paddingBottom: '6rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders style={{ color: 'var(--accent-primary)' }} /> Manage Oversight Metrics
          </h1>
          <p style={{ opacity: 0.6, fontSize: '0.95rem', marginTop: '4px' }}>Feed values directly into the active monitoring dashboards.</p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="animate-fade" style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#22c55e', padding: '12px 18px', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="animate-fade" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '12px 18px', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} />
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr', gap: '2.5rem' }}>
        
        {/* Left Side: Category Editors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Section: Charge Sheets */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📄 Charge Sheets Progress
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {chargeSheets.map(m => {
                const filed = m.totalFiled ?? 0;
                const sheets = m.totalSheets ?? 1; // avoid division by 0
                const computedPercent = parseFloat(((filed / (sheets || 1)) * 100).toFixed(2));

                return (
                  <div key={m.id} style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--accent-primary)' }}>
                          {m.name === '60_DAY' ? '60-Day Charge Sheets' : m.name === '90_DAY' ? '90-Day Charge Sheets' : 'ITSSO Charge Sheets'}
                        </span>
                        <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '2px' }}>Formula: <i>{m.formula || 'N/A'}</i></div>
                      </div>
                      <div style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calculator size={14} /> Calculated: {computedPercent}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '6px', opacity: 0.7 }}>Total Filed in Month</label>
                        <input 
                          type="number" 
                          className="input"
                          value={m.totalFiled ?? ''} 
                          placeholder="e.g. 60"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const newPct = parseFloat(((val / (m.totalSheets || 1)) * 100).toFixed(2));
                            setMetrics(prev => prev.map(item => item.id === m.id ? { ...item, totalFiled: val, value: newPct } : item));
                          }}
                          style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', borderRadius: '8px', height: '38px', boxSizing: 'border-box', marginBottom: 0 }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '6px', opacity: 0.7 }}>Total Charge Sheets</label>
                        <input 
                          type="number" 
                          className="input"
                          value={m.totalSheets ?? ''} 
                          placeholder="e.g. 100"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const computedVal = val > 0 ? parseFloat((((m.totalFiled || 0) / val) * 100).toFixed(2)) : 0;
                            setMetrics(prev => prev.map(item => item.id === m.id ? { ...item, totalSheets: val, value: computedVal } : item));
                          }}
                          style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', borderRadius: '8px', height: '38px', boxSizing: 'border-box', marginBottom: 0 }}
                        />
                      </div>
                      <button
                        onClick={() => handleUpdate(m.id, { totalFiled: m.totalFiled, totalSheets: m.totalSheets, value: computedPercent })}
                        disabled={savingId === m.id}
                        style={{
                          height: '38px',
                          width: '38px',
                          borderRadius: '8px',
                          background: 'var(--accent-primary)',
                          color: 'white',
                          border: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          padding: 0,
                          margin: 0
                        }}
                        title="Save Changes"
                      >
                        <Save size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Missing Cases Grid grouped by Year */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🔍 Missing Cases Records
            </h2>
            
            {uniqueYears.map(year => {
              const yearMetrics = missingCases.filter(m => m.name.startsWith(`${year}_`));
              const getYearSuffixMetric = (suffix: string) => yearMetrics.find(m => m.name === `${year}_${suffix}`);

              return (
                <div key={year} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--bg-primary)' }}>
                  
                  {/* Year Header Input & Unified Save Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.6, display: 'inline-flex', alignItems: 'center' }}>Year Label:</span>
                      <input
                        type="text"
                        className="input"
                        value={localYears[year] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalYears(prev => ({ ...prev, [year]: val }));
                        }}
                        style={{ 
                          width: '80px', 
                          height: '32px', 
                          padding: '0 8px', 
                          fontSize: '0.85rem', 
                          fontWeight: 'bold', 
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          boxSizing: 'border-box',
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginBottom: 0,
                          margin: 0
                        }}
                      />
                      {localYears[year] !== year && (
                        <button
                          onClick={() => handleUpdateYearHeading(year)}
                          disabled={savingYearGroup === year}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            borderRadius: '6px',
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: 0
                          }}
                        >
                          {savingYearGroup === year ? 'Saving...' : 'Rename Year'}
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleSaveYearMetrics(year)}
                      disabled={savingYearGroup === year}
                      style={{
                        height: '34px',
                        padding: '0 16px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        margin: 0
                      }}
                    >
                      <Save size={14} /> {savingYearGroup === year ? 'Saving...' : 'Save Year Metrics'}
                    </button>
                  </div>

                  {/* Clean side-by-side columns with NO individual save buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    {['MAN', 'BOY', 'WOMAN', 'GIRL'].map(suffix => {
                      const metric = getYearSuffixMetric(suffix);
                      if (!metric) return null;

                      return (
                        <div key={metric.id}>
                          <label style={{ fontSize: '0.75rem', fontWeight: '800', opacity: 0.7, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                            {suffix === 'MAN' ? 'Men' : suffix === 'BOY' ? 'Boy' : suffix === 'WOMAN' ? 'Women' : 'Girl'}
                          </label>
                          <input 
                            type="number" 
                            className="input"
                            value={metric.value} 
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setMetrics(prev => prev.map(item => item.id === metric.id ? { ...item, value: val } : item));
                            }}
                            style={{ padding: '8px 12px', fontSize: '0.85rem', width: '100%', borderRadius: '8px', height: '38px', boxSizing: 'border-box', marginBottom: 0 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Side: Accidents & Helper Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Section: Road Safety Accidents */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🚗 Road Safety Accidents
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {accidents.map(m => (
                <div key={m.id} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.9rem', display: 'block', marginBottom: '8px', color: m.name === 'FATAL' ? '#ef4444' : '#f59e0b' }}>
                    {m.name === 'FATAL' ? 'Fatal Accidents' : 'Non-Fatal Accidents'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      className="input"
                      value={m.value} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setMetrics(prev => prev.map(item => item.id === m.id ? { ...item, value: val } : item));
                      }}
                      style={{ padding: '8px 12px', fontSize: '0.85rem', width: '100%', borderRadius: '8px', height: '38px', boxSizing: 'border-box', marginBottom: 0 }}
                    />
                    <button
                      onClick={() => handleUpdate(m.id, { value: m.value })}
                      disabled={savingId === m.id}
                      style={{
                        height: '38px',
                        width: '38px',
                        borderRadius: '8px',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        padding: 0,
                        margin: 0
                      }}
                      title="Save Accidents Count"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Helper panel */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '800' }}>ℹ️ Management Tips</h3>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.8rem', opacity: 0.8, display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.5' }}>
              <li><b>Editing Years:</b> Simply change the Year Label input box next to any year card and click "Rename Year". The dashboard will instantly update all columns and keys to map to that year!</li>
              <li><b>Mathematical Formula:</b> Standardized values are dynamically division-calculated inside the frontend inputs, instantly saving both variables and the resulting percentage to the DB.</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ManageMetrics;
