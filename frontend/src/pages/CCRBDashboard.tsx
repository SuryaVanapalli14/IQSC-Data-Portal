import { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Metric {
  category: string;
  name: string;
  value: number;
  period: string;
  color: string;
  totalFiled?: number | null;
  totalSheets?: number | null;
  formula?: string | null;
}

const CCRBDashboard = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/ccrb/metrics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMetrics(res.data);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
    return () => clearInterval(timer);
  }, []);

  const getMetric = (category: string, name: string) => metrics.find(m => m.category === category && m.name === name);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>Loading...</div>;

  const missingCases = metrics.filter(m => m.category === 'MISSING_CASES');
  const uniqueYears = Array.from(new Set(
    missingCases.map(m => {
      const parts = m.name.split('_');
      return parts[0];
    }).filter(y => y && !isNaN(Number(y)))
  )).sort((a, b) => Number(b) - Number(a));

  const latestYear = uniqueYears[0] || '2026';
  const previousYear = uniqueYears[1] || '2025';

  const kpi60 = getMetric('CHARGE_SHEET', '60_DAY');
  const kpi90 = getMetric('CHARGE_SHEET', '90_DAY');
  const kpiItsso = getMetric('CHARGE_SHEET', 'ITSSO');

  const topKPIs = [
    { 
      label: '60-Day Charge Sheets', 
      value: String(kpi60?.totalFiled ?? 0), 
      percent: kpi60?.value || 0, 
      color: '#2563eb',
      details: {
        totalFiled: kpi60?.totalFiled ?? 0,
        totalSheets: kpi60?.totalSheets ?? 0,
        formula: kpi60?.formula || 'Total filed in month / Total charge sheets'
      }
    },
    { 
      label: '90-Day Charge Sheets', 
      value: String(kpi90?.totalFiled ?? 0), 
      percent: kpi90?.value || 0, 
      color: '#8b5cf6',
      details: {
        totalFiled: kpi90?.totalFiled ?? 0,
        totalSheets: kpi90?.totalSheets ?? 0,
        formula: kpi90?.formula || 'Total filed in month / Total charge sheets'
      }
    },
    { 
      label: 'ITSSO Charge Sheets', 
      value: String(kpiItsso?.totalFiled ?? 0), 
      percent: kpiItsso?.value || 0, 
      color: '#10b981',
      details: {
        totalFiled: kpiItsso?.totalFiled ?? 0,
        totalSheets: kpiItsso?.totalSheets ?? 0,
        formula: kpiItsso?.formula || 'Total filed in month / Total charge sheets'
      }
    },
  ];

  const SplitDataCard = ({ label, leftVal, rightVal, leftLabel, rightLabel, color, subColor }: { label: string, leftVal: number, rightVal: number, leftLabel: string, rightLabel: string, color: string, subColor: string }) => (
    <div style={{ background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ background: 'rgba(0,0,0,0.04)', padding: '2px 10px', borderBottom: '1px solid var(--border-color)', fontSize: '0.7rem', fontWeight: '800', opacity: 0.6, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', flex: 1 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-color)', padding: '4px' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: color, lineHeight: '1' }}>{leftVal}</div>
          <div style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.4 }}>{leftLabel}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: subColor, lineHeight: '1' }}>{rightVal}</div>
          <div style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.4 }}>{rightLabel}</div>
        </div>
      </div>
    </div>
  );

  const MissingSection = ({ year, title, subtitle }: { year: string, title: string, subtitle: string }) => (
    <div style={{ background: 'var(--card-bg)', padding: '0.75rem', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ fontWeight: '800', fontSize: '1.1rem', margin: 0 }}>{title}</h3>
        <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--accent-primary)', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '4px' }}>{subtitle}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <SplitDataCard 
          label="Male Cases" 
          leftVal={getMetric('MISSING_CASES', `${year}_MAN`)?.value || 0} 
          rightVal={getMetric('MISSING_CASES', `${year}_BOY`)?.value || 0} 
          leftLabel="MEN" 
          rightLabel="BOY" 
          color="#3b82f6" 
          subColor="#60a5fa" 
        />
        <SplitDataCard 
          label="Female Cases" 
          leftVal={getMetric('MISSING_CASES', `${year}_WOMAN`)?.value || 0} 
          rightVal={getMetric('MISSING_CASES', `${year}_GIRL`)?.value || 0} 
          leftLabel="WOMEN" 
          rightLabel="GIRL" 
          color="#ec4899" 
          subColor="#f472b6" 
        />
      </div>
    </div>
  );

  return (
    <div className="container animate-fade" style={{ 
      height: 'calc(100vh - 64px)', 
      padding: '1.25rem 2rem', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      overflow: 'hidden'
    }}>
      
      {/* Header - Standard Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2.1rem', fontWeight: '700', margin: 0, letterSpacing: '-0.01em' }}>Monitoring Dashboard</h1>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', lineHeight: '1' }}>
            <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', opacity: 0.5, marginTop: '2px' }}>
            {format(currentTime, 'EEEE, do MMMM yyyy')}
          </div>
        </div>
      </div>

      {/* Row 1: KPI Cards - High Density */}
      <div style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem', display: 'grid' }}>
        {topKPIs.map((kpi, i) => (
          <div 
            key={i} 
            onMouseEnter={() => setHoveredCard(i)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ 
              background: 'var(--card-bg)', 
              padding: '1.25rem', 
              borderRadius: '16px', 
              border: '1px solid var(--border-color)', 
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', opacity: 0.6, marginBottom: '0.25rem' }}>{kpi.label}</div>
                <div style={{ fontSize: '2.4rem', fontWeight: '900', lineHeight: '1' }}>{kpi.value}</div>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white', background: kpi.color, padding: '4px 10px', borderRadius: '6px' }}>{kpi.percent}%</div>
            </div>
            <div style={{ marginTop: '1rem', width: '100%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${kpi.percent}%`, height: '100%', background: kpi.color }} />
            </div>

            {/* Premium Detail Hover Overlay */}
            {hoveredCard === i && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                padding: '0.85rem 1.25rem',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                zIndex: 10,
                border: `2px solid ${kpi.color}`,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.15)',
                animation: 'fadeIn 0.25s ease forwards',
                boxSizing: 'border-box'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', color: kpi.color, letterSpacing: '0.5px', lineHeight: '1.2' }}>
                  📊 Calculation Details
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: '1.2' }}>
                    <span style={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 'bold' }}>Total Filed:</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '800' }}>{kpi.details.totalFiled}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: '1.2' }}>
                    <span style={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 'bold' }}>Total Sheets:</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '800' }}>{kpi.details.totalSheets}</span>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: '1.2' }}>
                  <span style={{ opacity: 0.6, fontSize: '0.7rem', fontWeight: 'bold' }}>Formula:</span>
                  <span style={{ fontSize: '0.65rem', fontStyle: 'italic', opacity: 0.9, color: 'var(--text-primary)', textAlign: 'right', fontWeight: '600', maxWidth: '75%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={kpi.details.formula}>
                    {kpi.details.formula}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Secondary Area - Optimized Horizontal Space */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        
        {/* Row 2: Missing Cases Side-by-Side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flex: 1.2 }}>
          <MissingSection year={latestYear} title={`Missing Cases — ${latestYear}`} subtitle="Till Date" />
          <MissingSection year={previousYear} title={`Missing Cases — ${previousYear}`} subtitle="Previous Year" />
        </div>

        {/* Row 3: Road Safety Index Side-by-Side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flex: 1 }}>
          
          {/* Fatal Card */}
          <div style={{ background: 'var(--card-bg)', padding: '1rem 2rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: '#ef4444' }} />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px' }}>Fatal Accidents</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', opacity: 0.4 }}>Cumulative Till Date</div>
            </div>
            <div style={{ fontSize: '4.5rem', fontWeight: '900', color: '#ef4444', lineHeight: '1' }}>{getMetric('ACCIDENTS', 'FATAL')?.value || 0}</div>
          </div>

          {/* Non-Fatal Card */}
          <div style={{ background: 'var(--card-bg)', padding: '1rem 2rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: '#f59e0b' }} />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px' }}>Non-Fatal Accidents</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', opacity: 0.4 }}>Cumulative Till Date</div>
            </div>
            <div style={{ fontSize: '4.5rem', fontWeight: '900', color: '#f59e0b', lineHeight: '1' }}>{getMetric('ACCIDENTS', 'NON_FATAL')?.value || 0}</div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default CCRBDashboard;

