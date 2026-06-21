import React from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { translateCause, translateAddress, translateDiversionSign } from '../translations';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import { BarChart, PieChart, Network, Info } from 'lucide-react';
import DependencyGraph from './DependencyGraph';

// Register Chart.js structures
ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

export default function AnalyticsPanel({ activeIncidents, selectedIncident, t, activeLang }) {
  
  // 1. Group active incidents by cause (for Doughnut chart)
  const causeCounts = {};
  activeIncidents.forEach(e => {
    const causeName = translateCause(e.event_cause, activeLang).toUpperCase();
    causeCounts[causeName] = (causeCounts[causeName] || 0) + 1;
  });

  const doughnutData = {
    labels: Object.keys(causeCounts),
    datasets: [{
      data: Object.values(causeCounts),
      backgroundColor: [
        '#dc2626',  // Rich Darker Red
        '#2563eb',  // Rich Darker Blue
        '#d97706',  // Rich Darker Yellow/Amber
        '#059669',  // Rich Darker Green
        '#7c3aed',  // Rich Darker Purple
        '#ea580c',  // Rich Darker Orange
        '#4b5563'   // Rich Darker Gray
      ],
      borderColor: 'rgba(9, 13, 22, 0.8)',
      borderWidth: 1.5
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    }
  };

  // 2. Sort incidents by severity and select top 5 (for Bar chart)
  const sortedIncidents = [...activeIncidents]
    .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
    .slice(0, 5);

  const barData = {
    labels: sortedIncidents.map(e => e.id),
    datasets: [{
      label: 'Severity Score %',
      data: sortedIncidents.map(e => e.severity_score || 0),
      backgroundColor: '#2563eb', // Rich Darker Blue
      borderColor: '#1d4ed8',
      borderWidth: 1.5,
      borderRadius: 4
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.08)' }, // Light grid lines on dark background
        ticks: {
          color: '#94a3b8', // High contrast light text for dark background
          font: { size: 9, family: 'Outfit' }
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8', // High contrast light text for dark background
          font: { size: 8, family: 'Outfit' }
        }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  return (
    <div className="analytics-grid-workspace">
      {/* Upper row: Charts */}
      <div className="analytics-charts-row">
        <div className="analytics-card">
          <div className="analytics-card-header">
            <h3><PieChart size={14} /> <span>{t('chart-causes-title')}</span></h3>
          </div>
          <div className="chart-canvas-container" style={{ display: 'flex', alignItems: 'center', gap: '16px', height: '240px' }}>
            {activeIncidents.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', margin: 'auto' }}>{t('no-active-telemetry')}</div>
            ) : (
              <>
                <div style={{ flex: '1.2', height: '100%', position: 'relative' }}>
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
                <div style={{ 
                  flex: '1', 
                  maxHeight: '100%', 
                  overflowY: 'auto', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  paddingRight: '6px'
                }}>
                  {Object.keys(causeCounts).map((cause, idx) => {
                    const color = doughnutData.datasets[0].backgroundColor[idx % doughnutData.datasets[0].backgroundColor.length];
                    return (
                      <div key={cause} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px' }}>
                        <span style={{ 
                          display: 'inline-block', 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '3px', 
                          backgroundColor: color,
                          flexShrink: 0
                        }} />
                        <span style={{ 
                          color: '#cbd5e1', 
                          fontWeight: '800', 
                          whiteSpace: 'nowrap', 
                          textOverflow: 'ellipsis', 
                          overflow: 'hidden',
                          maxWidth: '140px'
                        }} title={cause}>
                          {cause}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-header">
            <h3><BarChart size={14} /> <span>{t('chart-severities-title')}</span></h3>
          </div>
          <div className="chart-canvas-container">
            {activeIncidents.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', marginTop: '100px' }}>{t('no-active-telemetry')}</div>
            ) : (
              <Bar data={barData} options={barOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Lower row: Interactive Dependency Graph & Node Insights side-by-side */}
      <div className="analytics-bottom-row">
        <div className="dependency-graph-card">
          <div className="analytics-card-header">
            <h3><Network size={14} /> <span>{t('dependency-graph-title')}</span></h3>
          </div>
          <div className="graph-canvas">
            <DependencyGraph selectedIncident={selectedIncident} t={t} activeLang={activeLang} />
          </div>
        </div>

        {/* Right Column: Active Incident Metadata Insights */}
        <div className="analytics-sidebar-feed">
          <div className="analytics-card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3><Info size={14} /> <span>{t('node-insights-title')}</span></h3>
          </div>
          
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
            {!selectedIncident ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', marginTop: '100px' }}>
                {t('node-insights-placeholder')}
              </div>
            ) : (
              <>
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('focus-incident-node')}</span>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>{selectedIncident.id}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{translateAddress(selectedIncident.address, activeLang)}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent-purple)' }}>{t('dependent-sop-protocol')}</span>
                    <h5 style={{ fontSize: '11px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 'bold' }}>{t('sop-section-title')}</h5>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.3' }}>
                      {t('sop-desc-template')
                        .replace('{manpower}', selectedIncident.manpower_needed || 1)
                        .replace('{closure}', selectedIncident.requires_road_closure === 'TRUE' ? t('closure-yes') : t('closure-no'))
                        .replace('{barricades}', selectedIncident.barricades_needed || 0)}
                    </p>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{t('ml-severity-inference')}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('model-weight-score')}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{(selectedIncident.severity_score || 0).toFixed(1)}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('clearance-est')}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{(selectedIncident.estimated_duration || 0).toFixed(1)} {t('hours')}</span>
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent-orange)' }}>{t('recommended-public-signage')}</span>
                    <p style={{ fontSize: '10px', color: 'var(--accent-orange)', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '4px' }}>
                      "{translateDiversionSign(selectedIncident.diversion_sign || 'TRAFFIC ALERT: Expect delays.', activeLang)}"
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
