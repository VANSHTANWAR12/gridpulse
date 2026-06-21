import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { translateCause, translatePriority } from '../translations';
import { 
  BookCheck, 
  TrendingUp, 
  Sparkles, 
  ShieldAlert, 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Percent,
  PlusCircle,
  HelpCircle,
  Trash2
} from 'lucide-react';

export default function PostEventInsights({ t, activeLang }) {
  // State
  const [events, setEvents] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [analytics, setAnalytics] = useState({
    total_events_analyzed: 0,
    avg_severity_accuracy: 0,
    avg_manpower_accuracy: 0,
    avg_barricade_accuracy: 0,
    avg_overall_accuracy: 0,
    best_prediction_accuracy: 0,
    worst_prediction_accuracy: 0,
    trend_data: []
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  
  // Loading and Form States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form Inputs
  const [actualAttendance, setActualAttendance] = useState('');
  const [actualDuration, setActualDuration] = useState('');
  const [actualSeverity, setActualSeverity] = useState(50);
  const [actualManpower, setActualManpower] = useState('');
  const [actualBarricades, setActualBarricades] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch planned events
      const eventsRes = await fetch('/api/planned-events');
      const eventsData = await eventsRes.json();
      setEvents(eventsData);

      // Fetch analytics
      const analyticsRes = await fetch('/api/learning-analytics');
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

      // Fetch outcomes
      const outcomesRes = await fetch('/api/event-outcomes');
      const outcomesData = await outcomesRes.json();
      setOutcomes(outcomesData);

      // Auto-select first event if available
      if (eventsData.length > 0 && !selectedEvent) {
        handleSelectEvent(eventsData[0], outcomesData);
      } else if (selectedEvent) {
        // Refresh currently selected event outcome data
        const updatedEvent = eventsData.find(e => e.id === selectedEvent.id);
        if (updatedEvent) {
          handleSelectEvent(updatedEvent, outcomesData);
        }
      }
    } catch (error) {
      console.error("Error fetching post-event data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  function handleSelectEvent(event, currentOutcomes = outcomes) {
    setSelectedEvent(event);
    
    // Find matching outcome if it exists
    const outcome = currentOutcomes.find(o => o.event_id === event.id);
    setSelectedOutcome(outcome || null);

    if (outcome) {
      // Pre-fill form with logged actuals if completed
      setActualAttendance(outcome.actual_attendance.toString());
      setActualDuration(outcome.actual_duration_hours.toString());
      setActualSeverity(outcome.actual_peak_severity);
      setActualManpower(outcome.actual_manpower_deployed.toString());
      setActualBarricades(outcome.actual_barricades_used.toString());
      setOutcomeNotes(outcome.outcome_notes || '');
    } else {
      // Pre-fill with reasonable defaults/predicted values or blank
      setActualAttendance(event.attendance ? event.attendance.toString() : '');
      setActualDuration(event.duration_hours ? event.duration_hours.toString() : '');
      setActualSeverity(50);
      
      // Calculate basic defaults for predicted if not completed
      const baseManpower = event.priority === 'High' ? 12 : event.priority === 'Medium' ? 8 : 4;
      const calculatedManpower = event.attendance > 1000 
        ? Math.min(50, baseManpower + Math.floor((event.attendance - 1000) / 2000))
        : baseManpower;

      const baseBarricades = event.priority === 'High' ? 18 : event.priority === 'Medium' ? 12 : 6;
      const calculatedBarricades = event.attendance > 1000
        ? Math.min(80, baseBarricades + Math.floor((event.attendance - 1000) / 1500))
        : baseBarricades;

      setActualManpower(calculatedManpower.toString());
      setActualBarricades(calculatedBarricades.toString());
      setOutcomeNotes('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setSubmitting(true);
    try {
      const baseManpower = selectedEvent.priority === 'High' ? 12 : selectedEvent.priority === 'Medium' ? 8 : 4;
      const predictedManpower = selectedEvent.attendance > 1000 
        ? Math.min(50, baseManpower + Math.floor((selectedEvent.attendance - 1000) / 2000))
        : baseManpower;

      const baseBarricades = selectedEvent.priority === 'High' ? 18 : selectedEvent.priority === 'Medium' ? 12 : 6;
      const predictedBarricades = selectedEvent.attendance > 1000
        ? Math.min(80, baseBarricades + Math.floor((selectedEvent.attendance - 1000) / 1500))
        : baseBarricades;

      const predictedSeverity = selectedEvent.priority === 'High' ? 75.0 : selectedEvent.priority === 'Medium' ? 55.0 : 35.0;

      const payload = {
        event_id: selectedEvent.id,
        event_name: selectedEvent.name,
        event_cause: selectedEvent.event_cause,
        predicted_severity: predictedSeverity,
        predicted_manpower: predictedManpower,
        predicted_barricades: predictedBarricades,
        predicted_duration: parseFloat(selectedEvent.duration_hours) || 3.0,
        actual_attendance: parseInt(actualAttendance) || 0,
        actual_duration_hours: parseFloat(actualDuration) || 0.0,
        actual_peak_severity: parseFloat(actualSeverity),
        actual_manpower_deployed: parseInt(actualManpower) || 0,
        actual_barricades_used: parseInt(actualBarricades) || 0,
        outcome_notes: outcomeNotes
      };

      const res = await fetch('/api/event-outcomes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchData();
      } else {
        console.error("Failed to save event outcome");
      }
    } catch (err) {
      console.error("Error submitting outcome:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOutcome = async (outcomeId) => {
    if (!confirm("Are you sure you want to delete this historical learning record? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/event-outcomes/${outcomeId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (selectedOutcome && selectedOutcome.id === outcomeId) {
          setSelectedOutcome(null);
          setSelectedEvent(null);
        }
        await fetchData();
      } else {
        console.error("Failed to delete event outcome");
      }
    } catch (err) {
      console.error("Error deleting event outcome:", err);
    }
  };

  const getAccuracyColor = (val) => {
    if (val >= 80) return 'var(--accent-green)';
    if (val >= 60) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  const getAccuracyBg = (val) => {
    if (val >= 80) return 'rgba(22, 163, 74, 0.1)';
    if (val >= 60) return 'rgba(217, 119, 6, 0.1)';
    return 'rgba(225, 29, 72, 0.1)';
  };

  return (
    <div className="dashboard-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', height: '100%' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)',
        padding: '24px',
        borderRadius: '12px',
        color: '#ffffff',
        boxShadow: 'var(--shadow-premium)'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookCheck size={28} />
            <span>{t('post-event-title') || 'Post-Event Learning System'}</span>
          </h1>
          <p style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px', fontWeight: 500 }}>
            {t('post-event-subtitle') || 'Track prediction accuracy and improve model performance over time.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={12} className="pulse-icon" />
            <span>{activeLang === 'kn' ? 'ಸಕ್ರಿಯ ತರಬೇತಿ ಚಾಲನೆಯಲ್ಲಿದೆ' : activeLang === 'hi' ? 'सक्रिय प्रशिक्षण चालू है' : 'ACTIVE TRAINING ON'}</span>
          </span>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="stat-card" style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', position: 'relative' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>{t('total-events-analyzed').toUpperCase()}</span>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', marginTop: '8px' }}>
            {loading ? '...' : analytics.total_events_analyzed}
          </h2>
          <div style={{ position: 'absolute', right: '20px', bottom: '20px', color: 'var(--accent-purple)', opacity: 0.15 }}>
            <Calendar size={48} />
          </div>
        </div>

        <div className="stat-card" style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', position: 'relative' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>{t('avg-accuracy').toUpperCase()}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '900', color: getAccuracyColor(analytics.avg_overall_accuracy) }}>
              {loading ? '...' : `${analytics.avg_overall_accuracy}%`}
            </h2>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{activeLang === 'kn' ? 'ಸಂಯೋಜಿತ ಗುರಿ' : activeLang === 'hi' ? 'संयुक्त लक्ष्य' : 'Combined Target'}</span>
          </div>
          <div style={{ position: 'absolute', right: '20px', bottom: '20px', color: getAccuracyColor(analytics.avg_overall_accuracy), opacity: 0.15 }}>
            <Percent size={48} />
          </div>
        </div>

        <div className="stat-card" style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', position: 'relative' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>{t('best-prediction').toUpperCase()}</span>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--accent-green)', marginTop: '8px' }}>
            {loading ? '...' : `${analytics.best_prediction_accuracy}%`}
          </h2>
          <div style={{ position: 'absolute', right: '20px', bottom: '20px', color: 'var(--accent-green)', opacity: 0.15 }}>
            <TrendingUp size={48} />
          </div>
        </div>

        <div className="stat-card" style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', position: 'relative' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>{t('worst-prediction').toUpperCase()}</span>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: getAccuracyColor(analytics.worst_prediction_accuracy), marginTop: '8px' }}>
            {loading ? '...' : `${analytics.worst_prediction_accuracy}%`}
          </h2>
          <div style={{ position: 'absolute', right: '20px', bottom: '20px', color: 'var(--accent-red)', opacity: 0.15 }}>
            <ShieldAlert size={48} />
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Side: Events List & Logging Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Scheduled Events Panel */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: 'var(--shadow-premium)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Calendar size={16} style={{ color: 'var(--accent-purple)' }} />
              <span>{activeLang === 'kn' ? 'ನಿಗದಿತ ಘಟನೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ' : activeLang === 'hi' ? 'शेड्यूल किया गया इवेंट चुनें' : 'Select Scheduled Event'}</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              {events.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {activeLang === 'kn' ? 'ಯಾವುದೇ ನಿಗದಿತ ಘಟನೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ಮೊದಲು ಪೂರ್ವ-ಘಟನೆ ಯೋಜಕದಲ್ಲಿ ಒಂದನ್ನು ಸೇರಿಸಿ.' : activeLang === 'hi' ? 'कोई शेड्यूल किया गया इवेंट नहीं मिला। पहले पूर्व-इवेंट योजनाकार में एक जोड़ें।' : 'No scheduled events found. Add one in the Pre-Event Planner first.'}
                </div>
              ) : (
                events.map(event => {
                  const isSelected = selectedEvent?.id === event.id;
                  const isCompleted = event.status === 'completed';
                  return (
                    <div 
                      key={event.id}
                      onClick={() => handleSelectEvent(event)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid var(--accent-purple)' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(79, 70, 229, 0.05)' : 'var(--bg-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '80%' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {event.name}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{translateCause(event.event_cause, activeLang)}</span>
                          <span>•</span>
                          <span>{event.start_datetime.split('T')[0]}</span>
                        </span>
                      </div>
                      
                      <div>
                        {isCompleted ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-green)', fontSize: '11px', fontWeight: '700' }}>
                            <CheckCircle size={14} />
                            <span>{activeLang === 'kn' ? 'ಪೂರ್ಣಗೊಂಡಿದೆ' : activeLang === 'hi' ? 'पूर्ण' : 'Done'}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-orange)', fontSize: '11px', fontWeight: '700' }}>
                            <AlertCircle size={14} />
                            <span>{activeLang === 'kn' ? 'ಬಾಕಿ ಉಳಿದಿದೆ' : activeLang === 'hi' ? 'लंबित' : 'Pending'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Outcome Submission Form */}
          {selectedEvent && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-premium)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <PlusCircle size={16} style={{ color: 'var(--accent-blue)' }} />
                  <span>{selectedOutcome ? (activeLang === 'kn' ? 'ದಾಖಲಿಸಲಾದ ನಿಜ ಫಲಿತಾಂಶಗಳನ್ನು ವೀಕ್ಷಿಸಿ' : activeLang === 'hi' ? 'दर्ज वास्तविक परिणाम देखें' : 'View Logged Actuals') : t('log-outcome-btn')}</span>
                </h3>
                <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', backgroundColor: selectedOutcome ? 'rgba(22, 163, 74, 0.1)' : 'rgba(234, 88, 12, 0.1)', color: selectedOutcome ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                  {selectedOutcome ? (activeLang === 'kn' ? 'ಪೂರ್ಣಗೊಂಡಿದೆ' : activeLang === 'hi' ? 'पूर्ण' : 'Completed') : (activeLang === 'kn' ? 'ಕರಡು' : activeLang === 'hi' ? 'ड्राफ्ट' : 'Draft')}
                </span>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
                
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', padding: '10px', background: 'var(--bg-primary)', borderRadius: '6px', borderLeft: '3px solid var(--accent-blue)' }}>
                  {activeLang === 'kn' ? 'ನೈಜ ನಿಯತಾಂಕಗಳನ್ನು ನಮೂದಿಸುವುದರಿಂದ ನಮ್ಮ ಮುನ್ಸೂಚನೆ ಎಂಜಿನ್‌ಗೆ ಪ್ರತಿಕ್ರಿಯೆ ಸಿಗುತ್ತದೆ, ಇದು ಮಾದರಿ ದಿಕ್ಚ್ಯುತಿಯನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ ಮತ್ತು ML ಸಂಪನ್ಮೂಲ ಗುಣಕವನ್ನು ಉತ್ತಮಗೊಳಿಸುತ್ತದೆ.' : activeLang === 'hi' ? 'वास्तविक पैरामीटर दर्ज करने से हमारे पूर्वानुमान इंजन को फीडबैक मिलता है, जिससे मॉडल ड्रिफ्ट कम होता है और एमएल संसाधन गुणक अनुकूलित होता है।' : 'Entering actual parameters feeds back into our forecasting engine to reduce model drift and optimize the ML resource multiplier.'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{activeLang === 'kn' ? 'ನೈಜ ಹಾಜರಾತಿ' : activeLang === 'hi' ? 'वास्तविक उपस्थिति' : 'ACTUAL ATTENDANCE'}</label>
                    <input 
                      type="number"
                      placeholder={activeLang === 'kn' ? 'ಉದಾ. 28000' : activeLang === 'hi' ? 'जैसे: 28000' : 'e.g. 28000'}
                      value={actualAttendance}
                      onChange={(e) => setActualAttendance(e.target.value)}
                      disabled={!!selectedOutcome}
                      required
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', background: selectedOutcome ? 'var(--bg-primary)' : '#ffffff' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{activeLang === 'kn' ? 'ನೈಜ ಅವಧಿ (ಗಂಟೆಗಳು)' : activeLang === 'hi' ? 'वास्तविक अवधि (घंटे)' : 'ACTUAL DURATION (HRS)'}</label>
                    <input 
                      type="number"
                      step="0.5"
                      placeholder={activeLang === 'kn' ? 'ಉದಾ. 4.5' : activeLang === 'hi' ? 'जैसे: 4.5' : 'e.g. 4.5'}
                      value={actualDuration}
                      disabled={!!selectedOutcome}
                      onChange={(e) => setActualDuration(e.target.value)}
                      required
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', background: selectedOutcome ? 'var(--bg-primary)' : '#ffffff' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{activeLang === 'kn' ? 'ನಿಯೋಜಿಸಲಾದ ನೈಜ ಅಧಿಕಾರಿಗಳು' : activeLang === 'hi' ? 'तैनात वास्तविक अधिकारी' : 'ACTUAL OFFICERS DEPLOYED'}</label>
                    <input 
                      type="number"
                      placeholder={activeLang === 'kn' ? 'ಉದಾ. 15' : activeLang === 'hi' ? 'जैसे: 15' : 'e.g. 15'}
                      value={actualManpower}
                      disabled={!!selectedOutcome}
                      onChange={(e) => setActualManpower(e.target.value)}
                      required
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', background: selectedOutcome ? 'var(--bg-primary)' : '#ffffff' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{activeLang === 'kn' ? 'ಬಳಸಿದ ನೈಜ ಬ್ಯಾರಿಕೇಡ್‌ಗಳು' : activeLang === 'hi' ? 'उपयोग किए गए वास्तविक बैरिकेड' : 'ACTUAL BARRICADES USED'}</label>
                    <input 
                      type="number"
                      placeholder={activeLang === 'kn' ? 'ಉದಾ. 25' : activeLang === 'hi' ? 'जैसे: 25' : 'e.g. 25'}
                      value={actualBarricades}
                      disabled={!!selectedOutcome}
                      onChange={(e) => setActualBarricades(e.target.value)}
                      required
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', background: selectedOutcome ? 'var(--bg-primary)' : '#ffffff' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{activeLang === 'kn' ? 'ಗಮನಿಸಿದ ನೈಜ ಗರಿಷ್ಠ ದಟ್ಟಣೆ' : activeLang === 'hi' ? 'देखी गई वास्तविक अधिकतम तीव्रता' : 'ACTUAL PEAK SEVERITY OBSERVED'}</label>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-purple)' }}>{actualSeverity}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={actualSeverity}
                    disabled={!!selectedOutcome}
                    onChange={(e) => setActualSeverity(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
                    <span>{activeLang === 'kn' ? 'ಕಡಿಮೆ ಪ್ರಭಾವ' : activeLang === 'hi' ? 'कम प्रभाव' : 'LOW IMPACT'}</span>
                    <span>{activeLang === 'kn' ? 'ಭಾರೀ ದಟ್ಟಣೆ' : activeLang === 'hi' ? 'भारी जाम' : 'HEAVY GRIDLOCK'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{activeLang === 'kn' ? 'ಫಲಿತಾಂಶದ ಟಿಪ್ಪಣಿಗಳು ಮತ್ತು ಕಾಮೆಂಟ್‌ಗಳು' : activeLang === 'hi' ? 'परिणाम नोट्स और टिप्पणियाँ' : 'OUTCOME NOTES & REMARKS'}</label>
                  <textarea 
                    placeholder={activeLang === 'kn' ? 'ಮಾರ್ಗ ಬದಲಾವಣೆ ಕಾರ್ಯಕ್ಷಮತೆ, ಜನಸಮೂಹದ ನಡವಳಿಕೆ ಅಥವಾ ಯಾವುದೇ ಸಮಸ್ಯೆಗಳ ಬಗ್ಗೆ ಟಿಪ್ಪಣಿಗಳನ್ನು ಒದಗಿಸಿ...' : activeLang === 'hi' ? 'मार्ग परिवर्तन प्रदर्शन, भीड़ के व्यवहार या किसी भी समस्या पर नोट्स प्रदान करें...' : 'Provide notes on diversion performance, crowd behavior or any issues...'}
                    value={outcomeNotes}
                    disabled={!!selectedOutcome}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    rows={2}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', fontFamily: 'inherit', resize: 'none', background: selectedOutcome ? 'var(--bg-primary)' : '#ffffff' }}
                  />
                </div>

                {!selectedOutcome && (
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      marginTop: '8px',
                      padding: '10px',
                      borderRadius: '6px',
                      background: 'var(--accent-purple)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '800',
                      border: 'none',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    {submitting ? (
                      <span>{activeLang === 'kn' ? 'ಕಲಿಕೆಯ ಫಲಿತಾಂಶಗಳನ್ನು ಉಳಿಸಲಾಗುತ್ತಿದೆ...' : activeLang === 'hi' ? 'सीखने के परिणामों को सहेजा जा रहा है...' : 'Saving learning outcomes...'}</span>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        <span>{t('submit-outcome-btn') || 'Submit Outcome'}</span>
                      </>
                    )}
                  </button>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Selected Details & Overall Model Learnings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Detailed Outcome Comparison Panel */}
          {selectedOutcome ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: 'var(--shadow-premium)',
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '24px'
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {selectedOutcome.event_name}
                </h3>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {activeLang === 'kn' ? 'ಫಲಿತಾಂಶ ಹೋಲಿಕೆ ಸಾರಾಂಶ' : activeLang === 'hi' ? 'परिणाम तुलना सारांश' : 'OUTCOME COMPARISON SUMMARY'}
                </span>
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('stat-peak-severity-lbl').toUpperCase()}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>{activeLang === 'kn' ? 'ಮುನ್ಸೂಚನೆ: ' : activeLang === 'hi' ? 'पूर्वानुमान: ' : 'Pred: '}{selectedOutcome.predicted_severity}%</span>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{activeLang === 'kn' ? 'ನೈಜ: ' : activeLang === 'hi' ? 'वास्तविक: ' : 'Actual: '}{selectedOutcome.actual_peak_severity}%</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: getAccuracyColor(selectedOutcome.severity_accuracy),
                      backgroundColor: getAccuracyBg(selectedOutcome.severity_accuracy)
                    }}>
                      {selectedOutcome.severity_accuracy}% {activeLang === 'kn' ? 'ನಿಖರತೆ' : activeLang === 'hi' ? 'सटीकता' : 'Acc'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{activeLang === 'kn' ? 'ಅಗತ್ಯವಿರುವ ಪೊಲೀಸರು' : activeLang === 'hi' ? 'आवश्यक पुलिसकर्मी' : 'OFFICERS REQUIRED'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>{activeLang === 'kn' ? 'ಮುನ್ಸೂಚನೆ: ' : activeLang === 'hi' ? 'पूर्वानुमान: ' : 'Pred: '}{selectedOutcome.predicted_manpower}</span>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{activeLang === 'kn' ? 'ನೈಜ: ' : activeLang === 'hi' ? 'वास्तविक: ' : 'Actual: '}{selectedOutcome.actual_manpower_deployed}</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: getAccuracyColor(selectedOutcome.manpower_accuracy),
                      backgroundColor: getAccuracyBg(selectedOutcome.manpower_accuracy)
                    }}>
                      {selectedOutcome.manpower_accuracy}% {activeLang === 'kn' ? 'ನಿಖರತೆ' : activeLang === 'hi' ? 'सटीकता' : 'Acc'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{activeLang === 'kn' ? 'ಬಳಸಿದ ಬ್ಯಾರಿಕೇಡ್‌ಗಳು' : activeLang === 'hi' ? 'उपयोग किए गए बैरिकेड' : 'BARRICADES USED'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>{activeLang === 'kn' ? 'ಮುನ್ಸೂಚನೆ: ' : activeLang === 'hi' ? 'पूर्वानुमान: ' : 'Pred: '}{selectedOutcome.predicted_barricades}</span>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{activeLang === 'kn' ? 'ನೈಜ: ' : activeLang === 'hi' ? 'वास्तविक: ' : 'Actual: '}{selectedOutcome.actual_barricades_used}</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: getAccuracyColor(selectedOutcome.barricade_accuracy),
                      backgroundColor: getAccuracyBg(selectedOutcome.barricade_accuracy)
                    }}>
                      {selectedOutcome.barricade_accuracy}% {activeLang === 'kn' ? 'ನಿಖರತೆ' : activeLang === 'hi' ? 'सटीकता' : 'Acc'}
                    </span>
                  </div>
                </div>

                {selectedOutcome.outcome_notes && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)' }}>{activeLang === 'kn' ? 'ಟಿಪ್ಪಣಿಗಳು ಮತ್ತು ಕಾಮೆಂಟ್‌ಗಳು' : activeLang === 'hi' ? 'नोट्स और टिप्पणियाँ' : 'NOTES & REMARKS'}</span>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                      "{selectedOutcome.outcome_notes}"
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '16px' }}>{activeLang === 'kn' ? 'ಒಟ್ಟಾರೆ ನಿಖರತೆ' : activeLang === 'hi' ? 'समग्र सटीकता' : 'OVERALL ACCURACY'}</span>
                
                <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                  <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                    <circle 
                      cx="65" 
                      cy="65" 
                      r="50" 
                      fill="none" 
                      stroke="var(--border-color)" 
                      strokeWidth="10" 
                      opacity="0.3"
                    />
                    <motion.circle 
                      cx="65" 
                      cy="65" 
                      r="50" 
                      fill="none" 
                      stroke={getAccuracyColor(selectedOutcome.overall_accuracy)} 
                      strokeWidth="10" 
                      strokeDasharray={2 * Math.PI * 50}
                      initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                      animate={{ strokeDashoffset: (2 * Math.PI * 50) * (1 - selectedOutcome.overall_accuracy / 100) }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '24px', fontWeight: '950', color: 'var(--text-primary)' }}>
                      {selectedOutcome.overall_accuracy}%
                    </span>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 800 }}>{activeLang === 'kn' ? 'ನಿಖರತೆ' : activeLang === 'hi' ? 'सटीकता' : 'ACCURACY'}</span>
                  </div>
                </div>

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: getAccuracyColor(selectedOutcome.overall_accuracy),
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: getAccuracyBg(selectedOutcome.overall_accuracy),
                    textTransform: 'uppercase'
                  }}>
                    {selectedOutcome.overall_accuracy >= 85 
                      ? (activeLang === 'kn' ? 'ಹೆಚ್ಚು ವಿಶ್ವಾಸಾರ್ಹ' : activeLang === 'hi' ? 'अत्यंत विश्वसनीय' : 'Highly Reliable') 
                      : selectedOutcome.overall_accuracy >= 65 
                      ? (activeLang === 'kn' ? 'ಸ್ವೀಕಾರಾರ್ಹ ವಿಚಲನೆ' : activeLang === 'hi' ? 'स्वीकार्य बहाव (ड्रिफ्ट)' : 'Acceptable Drift') 
                      : (activeLang === 'kn' ? 'ಆಪ್ಟಿಮೈಸೇಶನ್ ಅಗತ್ಯವಿದೆ' : activeLang === 'hi' ? 'अनुकूलन की आवश्यकता' : 'Needs Optimization')}
                  </span>
                </div>
              </div>

            </motion.div>
          ) : selectedEvent ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              boxShadow: 'var(--shadow-premium)'
            }}>
              <HelpCircle size={32} style={{ color: 'var(--accent-purple)', opacity: 0.5, margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{activeLang === 'kn' ? 'ಯಾವುದೇ ನೈಜ ಡೇಟಾ ದಾಖಲಾಗಿಲ್ಲ' : activeLang === 'hi' ? 'कोई वास्तविक डेटा दर्ज नहीं' : 'No Actual Data Logged'}</h4>
              <p style={{ fontSize: '11px', marginTop: '6px', lineHeight: '1.4' }}>
                {activeLang === 'kn' ? 'ಈ ಘಟನೆಯ ಮೆಟ್ರಿಕ್‌ಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಲು ಮತ್ತು ನಿಖರತೆಯ ಸ್ಕೋರ್‌ಗಳನ್ನು ನವೀಕರಿಸಲು ಎಡಭಾಗದ ಫಾರ್ಮ್‌ನಲ್ಲಿ ಈವೆಂಟ್ ಸಮಯದಲ್ಲಿ ದಾಖಲಾದ ನೈಜ ನಿಯತಾಂಕಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ ಮತ್ತು ಸಲ್ಲಿಸಿ.' : activeLang === 'hi' ? 'इस इवेंट के मेट्रिक्स का विश्लेषण करने और सटीकता स्कोर अपडेट करने के लिए बाएं फॉर्म में इवेंट के दौरान दर्ज किए गए वास्तविक पैरामीटर भरें और सबमिट करें।' : "Fill out and submit the actual parameters logged during the event in the left form to analyze this event's metrics and update accuracy scores."}
              </p>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              boxShadow: 'var(--shadow-premium)'
            }}>
              <HelpCircle size={32} style={{ color: 'var(--accent-purple)', opacity: 0.5, margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{activeLang === 'kn' ? 'ವಿಶ್ಲೇಷಣೆಗಾಗಿ ಘಟನೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ' : activeLang === 'hi' ? 'विश्लेषण के लिए इवेंट चुनें' : 'Select Event for Analysis'}</h4>
              <p style={{ fontSize: '11px', marginTop: '6px', lineHeight: '1.4' }}>
                {activeLang === 'kn' ? 'ಫಲಿತಾಂಶಗಳನ್ನು ದಾಖಲಿಸಲು ಎಡ ಫಲಕದಿಂದ ನಿಗದಿತ ಘಟನೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ, ಅಥವಾ ಮುನ್ಸೂಚನೆಯ ನಿಖರತೆಯನ್ನು ಪರಿಶೀಲಿಸಲು ಕೆಳಗಿನ ಐತಿಹಾಸಿಕ ಕಲಿಕೆ ದಾಖಲೆಗಳ ಪಟ್ಟಿಯಿಂದ ಹಳೆಯ ದಾಖಲೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.' : activeLang === 'hi' ? 'परिणाम दर्ज करने के लिए बाएं पैनल से एक निर्धारित इवेंट चुनें, या भविष्यवाणी सटीकता का निरीक्षण करने के लिए नीचे दिए गए ऐतिहासिक शिक्षण रिकॉर्ड की सूची से एक ऐतिहासिक रिकॉर्ड चुनें।' : "Select a scheduled event from the left panel to log outcomes, or select a historical record from the Historical Learning Records list below to inspect prediction accuracy."}
              </p>
            </div>
          )}

          {/* Model Learning Curve Chart (SVG based) */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: 'var(--shadow-premium)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <TrendingUp size={16} style={{ color: 'var(--accent-green)' }} />
              <span>{t('learning-trend-title') || 'Model Learning Trend'}</span>
            </h3>

            <div style={{ marginTop: '16px' }}>
              <svg width="100%" viewBox="0 0 600 220" style={{ overflow: 'visible' }}>
                {/* Grid Lines */}
                <line x1="50" y1="40" x2="580" y2="40" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4" opacity="0.5" />
                <line x1="50" y1="100" x2="580" y2="100" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4" opacity="0.5" />
                <line x1="50" y1="136" x2="580" y2="136" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4" opacity="0.5" />
                <line x1="50" y1="160" x2="580" y2="160" stroke="var(--border-color)" strokeWidth="1.5" />

                {/* Y-Axis Labels */}
                <text x="40" y="44" fill="var(--text-muted)" fontSize="9" fontWeight="600" textAnchor="end">100%</text>
                <text x="40" y="104" fill="var(--text-muted)" fontSize="9" fontWeight="600" textAnchor="end">50%</text>
                <text x="40" y="140" fill="var(--text-muted)" fontSize="9" fontWeight="600" textAnchor="end">20%</text>
                <text x="40" y="164" fill="var(--text-muted)" fontSize="9" fontWeight="600" textAnchor="end">0%</text>

                {analytics.trend_data.length === 0 ? (
                  <g>
                    <text 
                      x="315" 
                      y="110" 
                      textAnchor="middle" 
                      fill="var(--text-muted)" 
                      fontSize="11" 
                      fontWeight="600"
                    >
                      {t('no-outcomes-yet') || 'No outcomes logged yet. Complete events and log actuals to train the system.'}
                    </text>
                  </g>
                ) : (
                  analytics.trend_data.map((item, index) => {
                    const totalItems = analytics.trend_data.length;
                    const xSpacing = totalItems > 1 ? 480 / (totalItems - 1) : 0;
                    const x = totalItems === 1 ? 315 : 80 + index * xSpacing;
                    const y = 160 - (item.overall_accuracy / 100) * 120;
                    const barHeight = 160 - y;
                    const color = getAccuracyColor(item.overall_accuracy);
                    
                    return (
                      <g key={index}>
                        {/* Hover Background */}
                        <rect 
                          x={x - 30} 
                          y="20" 
                          width="60" 
                          height="160" 
                          fill="rgba(79, 70, 229, 0.04)" 
                          opacity="0"
                          style={{ cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                          onMouseEnter={(e) => e.target.setAttribute('opacity', '1')}
                          onMouseLeave={(e) => e.target.setAttribute('opacity', '0')}
                        />
                        <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
                        </linearGradient>
                        <rect 
                          x={x - 12}
                          y={y}
                          width="24"
                          height={barHeight > 0 ? barHeight : 0}
                          rx="4"
                          fill={`url(#grad-${index})`}
                        />
                        <circle 
                          cx={x} 
                          cy={y} 
                          r="6" 
                          fill={color} 
                          stroke="var(--bg-card)" 
                          strokeWidth="2.5" 
                        />
                        {/* Value Label */}
                        <text 
                          x={x} 
                          y={y - 14} 
                          textAnchor="middle" 
                          fill="var(--text-primary)" 
                          fontSize="10" 
                          fontWeight="800"
                        >
                          {item.overall_accuracy}%
                        </text>
                        {/* X-Axis Label */}
                        <text 
                          x={x} 
                          y="185" 
                          textAnchor="middle" 
                          fill="var(--text-muted)" 
                          fontSize="9" 
                          fontWeight="600"
                        >
                          {item.event_name.length > 12 ? item.event_name.substring(0, 10) + '...' : item.event_name}
                        </text>
                        {/* X-Axis Date */}
                        <text 
                          x={x} 
                          y="202" 
                          textAnchor="middle" 
                          fill="var(--text-muted)" 
                          fontSize="8" 
                          fontWeight="500"
                          opacity="0.7"
                        >
                          {(() => {
                            const rawDate = item.start_datetime || item.completed_at;
                            if (!rawDate) return '';
                            const dateStr = rawDate.replace('T', ' ').split(' ')[0];
                            const dateParts = dateStr.split('-');
                            if (dateParts.length === 3) {
                              const day = parseInt(dateParts[2], 10);
                              const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(dateParts[1], 10) - 1];
                              return `${day} ${month}`;
                            }
                            return rawDate;
                          })()}
                        </text>
                      </g>
                    );
                  })
                )}
              </svg>
            </div>
          </div>

          {/* Historical Learning Records Table List */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: 'var(--shadow-premium)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <FileText size={16} style={{ color: 'var(--accent-blue)' }} />
              <span>{activeLang === 'kn' ? 'ಐತಿಹಾಸಿಕ ಕಲಿಕೆ ದಾಖಲೆಗಳು (ಯೋಜಕಕ್ಕಿಂತ ಸ್ವತಂತ್ರ)' : activeLang === 'hi' ? 'ऐतिहासिक शिक्षण रिकॉर्ड (योजनाकार से स्वतंत्र)' : 'Historical Learning Records (Persists Independent of Planner)'}</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', maxHeight: '200px', overflowY: 'auto' }}>
              {outcomes.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                  {activeLang === 'kn' ? 'ಸ್ಥಳೀಯ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಇನ್ನೂ ಯಾವುದೇ ಫಲಿತಾಂಶಗಳು ಉಳಿಸಲ್ಪಟ್ಟಿಲ್ಲ.' : activeLang === 'hi' ? 'अभी तक स्थानीय डेटाबेस में कोई परिणाम सहेजा नहीं गया है।' : 'No outcomes saved in local database yet.'}
                </div>
              ) : (
                outcomes.map(out => {
                  const isSel = selectedOutcome && selectedOutcome.id === out.id;
                  return (
                    <div 
                      key={out.id}
                      onClick={() => {
                        setSelectedOutcome(out);
                        const matchingEvent = events.find(e => e.id === out.event_id);
                        setSelectedEvent(matchingEvent || null);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSel ? '1px solid var(--accent-purple)' : '1px solid var(--border-color)',
                        background: isSel ? 'rgba(79, 70, 229, 0.05)' : 'var(--bg-primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>{out.event_name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ textTransform: 'capitalize' }}>{translateCause(out.event_cause, activeLang)}</span>
                          <span>•</span>
                          <span>{activeLang === 'kn' ? 'ಸಂಪನ್ಮೂಲ ನಿಖರತೆ' : activeLang === 'hi' ? 'संसाधन सटीकता' : 'Resource Accuracy'}: {Math.round((out.manpower_accuracy + out.barricade_accuracy) / 2)}%</span>
                        </span>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--accent-purple)' }}>
                          {activeLang === 'kn' ? 'ಕಲಿಕೆ ಸ್ಥಿತಿ: ಸಿಸ್ಟಮ್ ಉಳಿಸಿಕೊಂಡಿದೆ' : activeLang === 'hi' ? 'सीखने की स्थिति: सिस्टम द्वारा संधारित' : 'Learning Status: System Retained'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 700 }}>ACCURACY</span>
                          <span style={{ fontSize: '13px', fontWeight: '900', color: getAccuracyColor(out.overall_accuracy) }}>{out.overall_accuracy}%</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOutcome(out.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          title="Delete Record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
