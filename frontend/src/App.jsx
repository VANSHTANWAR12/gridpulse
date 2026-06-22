import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Route, Shield, Construction, BarChart2, Radio, Globe, Clock, MessageSquare, AlertTriangle, CloudSun, Calendar, BookCheck, LogOut, Compass } from 'lucide-react';
import { translations, translateCause, translatePriority, translateDescription } from './translations';
import MapMonitor from './components/MapMonitor';
import AnalyticsPanel from './components/AnalyticsPanel';
import WeatherDashboard from './components/WeatherDashboard';
import CopilotChat from './components/CopilotChat';
import PreEventPlanner from './components/PreEventPlanner';
import PostEventInsights from './components/PostEventInsights';
import LoginScreen from './components/LoginScreen';
import BackgroundLayer from './components/BackgroundLayer';
import EmergencyCorridorCenter from './components/EmergencyCorridorCenter';
import { getApiUrl } from './api';


export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('monitor'); // monitor | analytics | weather
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [activeLang, setActiveLang] = useState(localStorage.getItem('gridpulse_lang') || 'en');
  const [currentTime, setCurrentTime] = useState('');
  const [is3D, setIs3D] = useState(true);
  const [showNavbar, setShowNavbar] = useState(true);

  // Auto-hide top navbar on scrolling down for analytics, weather, planner, post-event tabs
  useEffect(() => {
    if (activeTab === 'monitor') {
      setShowNavbar(true);
      return;
    }

    let lastScrollTop = 0;

    const handleScroll = (event) => {
      const target = event.target;
      if (!target) return;

      const scrollTop = target.scrollTop;

      // Always show navbar at the very top of the page (within 10px) to prevent overlap
      if (scrollTop < 10) {
        setShowNavbar(true);
        lastScrollTop = scrollTop;
        return;
      }

      // Scrolling Down - Hide immediately to prevent overlap
      if (scrollTop > lastScrollTop) {
        setShowNavbar(false);
      }
      // Scrolling Up - Show with small buffer for smooth UX
      else if (scrollTop < lastScrollTop - 5) {
        setShowNavbar(true);
      }

      lastScrollTop = scrollTop;
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeTab]);

  // Check auth session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('gridpulse_token');
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const res = await fetch(getApiUrl('/api/auth/me'), {
          headers: {
            'X-Session-Token': token
          }
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          localStorage.removeItem('gridpulse_token');
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('gridpulse_token');
    if (token) {
      try {
        await fetch(getApiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            'X-Session-Token': token
          }
        });
      } catch (err) {
        console.error("Logout request failed:", err);
      }
    }
    localStorage.removeItem('gridpulse_token');
    setUser(null);
  };

  // Ref to store current selectedIncident to avoid stale closures in polling interval
  const selectedIncidentRef = useRef(null);
  selectedIncidentRef.current = selectedIncident;

  // Weather state (shared for ML multiplier impacts)
  const [weather, setWeather] = useState({
    temp: 24,
    humidity: 70,
    wind: 12,
    rain: 0,
    code: 0,
    condition: 'Clear',
    multiplier: 1.0,
    loading: true
  });

  const dict = translations[activeLang] || translations['en'];
  const t = (key) => dict[key] || key;



  // Real-Time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Incidents
  const fetchData = async () => {
    try {
      const res = await fetch(getApiUrl('/api/events?status=active'), {
        headers: {
          'X-Session-Token': localStorage.getItem('gridpulse_token') || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveIncidents(data);

        // Sync selected incident details from backend response if one is active
        const currentSelected = selectedIncidentRef.current;
        if (currentSelected) {
          const updated = data.find(e => e.id === currentSelected.id);
          if (updated) {
            // Only trigger state update if details have actually changed
            if (JSON.stringify(updated) !== JSON.stringify(currentSelected)) {
              setSelectedIncident(updated);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching incidents:", err);
    }
  };

  // Poll incidents every 5 seconds (only once on mount, preventing infinite loop)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Weather from Open-Meteo (Bengaluru coordinates)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const lat = 12.9785;
        const lon = 77.5946;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const current = data.current;

          // Weather interpretation based on WMO code
          let condition = 'Clear';
          const code = current.weather_code;
          if (code >= 51 && code <= 67) condition = 'Drizzle/Rain';
          else if (code >= 71 && code <= 86) condition = 'Snow';
          else if (code >= 95) condition = 'Thunderstorm';
          else if (code >= 1 && code <= 3) condition = 'Partly Cloudy';
          else if (code >= 45 && code <= 48) condition = 'Foggy';

          // Calculate ML weather severity multiplier
          let multiplier = 1.0;
          if (condition === 'Drizzle/Rain') multiplier = 1.25;
          else if (condition === 'Thunderstorm') multiplier = 1.45;
          else if (condition === 'Foggy') multiplier = 1.15;

          setWeather({
            temp: Math.round(current.temperature_2m),
            humidity: current.relative_humidity_2m,
            wind: Math.round(current.wind_speed_10m),
            rain: current.precipitation,
            code: code,
            condition: condition,
            multiplier: multiplier,
            loading: false
          });
        }
      } catch (err) {
        console.error("Error fetching weather:", err);
        setWeather(prev => ({ ...prev, loading: false }));
      }
    };
    fetchWeather();
  }, []);

  // Update language picker
  const handleLangChange = (e) => {
    const newLang = e.target.value;
    setActiveLang(newLang);
    localStorage.setItem('gridpulse_lang', newLang);
  };

  // Calculate stats
  const peakSeverity = activeIncidents.length === 0
    ? 0
    : Math.max(...activeIncidents.map(e => e.severity_score || 0));
  const totalManpower = activeIncidents.reduce((sum, e) => sum + (e.manpower_needed || 0), 0);
  const totalBarricades = activeIncidents.reduce((sum, e) => sum + (e.barricades_needed || 0), 0);

  if (checkingAuth) {
    return (
      <div className="auth-loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        activeLang={activeLang}
        setActiveLang={setActiveLang}
        onLoginSuccess={(userData) => setUser(userData)}
      />
    );
  }

  return (
    <div className={`app-container tab-${activeTab}`}>
      <BackgroundLayer />
      {/* Sidebar - Visual controls and feeds */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <Route className="pulse-icon" />
            <span>{t('logo-title')}</span>
          </div>
          <div className="tagline">{t('logo-tagline')}</div>
        </div>

        {/* Global Statistics */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">{t('stat-active-events-lbl')}</div>
            <div className="stat-value">{activeIncidents.length}</div>
            <AlertTriangle className="card-icon text-orange" />
          </div>
          <div className="stat-card">
            <div className="stat-title">{t('stat-peak-severity-lbl')}</div>
            <div className="stat-value">{peakSeverity.toFixed(0)}%</div>
            <Shield className="card-icon text-red" />
          </div>
          <div className="stat-card">
            <div className="stat-title">{t('stat-manpower-lbl')}</div>
            <div className="stat-value">{totalManpower}</div>
            <Shield className="card-icon text-blue" />
          </div>
          <div className="stat-card">
            <div className="stat-title">{t('stat-barricades-lbl')}</div>
            <div className="stat-value">{totalBarricades}</div>
            <Construction className="card-icon text-yellow" />
          </div>
        </div>

        {/* Left Side Active Alert Feed */}
        <div className="feed-section">
          <div className="feed-header">
            <h3>{t('alerts-feed-title')}</h3>
            <span className="badge">
              {activeIncidents.length} {activeLang === 'kn' ? 'ಲೈವ್' : (activeLang === 'hi' ? 'लाइव' : 'Live')}
            </span>
          </div>
          <div className="incident-feed">
            {activeIncidents.length === 0 ? (
              <div className="feed-placeholder">{t('feed-placeholder-lbl')}</div>
            ) : (
              activeIncidents.map(incident => {
                const priorityClass = `badge-${incident.priority.toLowerCase()}`;
                const isActive = selectedIncident && selectedIncident.id === incident.id;

                // Simple elapsed time calculation
                const start = new Date(incident.start_datetime);
                const diffMins = Math.floor((new Date() - start) / 60000);
                const timeStr = diffMins <= 0
                  ? (activeLang === 'kn' ? 'ಈಗಷ್ಟೇ' : (activeLang === 'hi' ? 'अभी' : 'Just now'))
                  : (activeLang === 'kn' ? `${diffMins} ನಿಮಿಷ ಹಿಂದೆ` : (activeLang === 'hi' ? `${diffMins} मिनट पहले` : `${diffMins}m ago`));

                return (
                  <motion.div
                    key={incident.id}
                    className={`feed-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedIncident(incident)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="feed-item-top">
                      <span className="item-id">{incident.id}</span>
                      <span className={`item-badge ${priorityClass}`}>{translatePriority(incident.priority, activeLang)}</span>
                    </div>
                    <div className="item-cause">{translateCause(incident.event_cause, activeLang)}</div>
                    <div className="item-desc">{translateDescription(incident.description, activeLang)}</div>
                    <div className="feed-item-bottom">
                      <span>{timeStr}</span>
                      {incident.is_mock === 1 && <span className="item-mock-tag">{t('simulated')}</span>}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="main-content">
        <header className={`main-header ${!showNavbar ? 'navbar-hidden' : ''}`}>
          <div className="header-left">
            <h1>{t('logo-title')} - Bengaluru City</h1>
            <p className="subtitle" style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>{t('header-tagline')}</p>
          </div>
          <div className="header-right">

            {import.meta.env.VITE_MAPTILER_KEY && (activeTab === 'monitor' || activeTab === 'planner') && (
              <button
                onClick={() => setIs3D(prev => !prev)}
                className="user-widget"
                style={{ cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <Compass size={14} />
                <span className="username-display">{is3D ? t('switch-to-2d') : t('switch-to-3d')}</span>
              </button>
            )}
            {user && (
              <div className="user-widget">
                <span className="username-display">{user.username} ({user.role === 'admin' ? 'Admin' : (activeLang === 'kn' ? 'ಆಪರೇಟರ್' : (activeLang === 'hi' ? 'ऑपरेटर' : 'Operator'))})</span>
                <button onClick={handleLogout} className="btn-logout" title={t('logout-btn')}>
                  <LogOut size={14} />
                  <span>{t('logout-btn')}</span>
                </button>
              </div>
            )}
            <div className="language-widget">
              <Globe className="language-icon" />
              <select value={activeLang} onChange={handleLangChange} className="language-picker">
                <option value="en">English</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>
            <div className="time-widget">
              <Clock size={14} />
              <span>{currentTime}</span>
            </div>
          </div>
        </header>

        {/* Tab Navigation Menu */}
        <div className={`nav-tab-container ${!showNavbar ? 'navbar-hidden' : ''}`}>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`nav-tab-btn ${activeTab === 'monitor' ? 'active' : ''}`}
          >
            <Radio size={14} />
            <span>{t('nav-monitor')}</span>
            {activeTab === 'monitor' && <motion.div layoutId="tab-indicator" className="tab-indicator" />}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          >
            <BarChart2 size={14} />
            <span>{t('nav-analytics')}</span>
            {activeTab === 'analytics' && <motion.div layoutId="tab-indicator" className="tab-indicator" />}
          </button>

          <button
            onClick={() => setActiveTab('weather')}
            className={`nav-tab-btn ${activeTab === 'weather' ? 'active' : ''}`}
          >
            <CloudSun size={14} />
            <span>{t('nav-weather')}</span>
            {activeTab === 'weather' && <motion.div layoutId="tab-indicator" className="tab-indicator" />}
          </button>

          <button
            onClick={() => setActiveTab('planner')}
            className={`nav-tab-btn ${activeTab === 'planner' ? 'active' : ''}`}
          >
            <Calendar size={14} />
            <span>{t('nav-planner')}</span>
            {activeTab === 'planner' && <motion.div layoutId="tab-indicator" className="tab-indicator" />}
          </button>

          <button
            onClick={() => setActiveTab('post-event')}
            className={`nav-tab-btn ${activeTab === 'post-event' ? 'active' : ''}`}
          >
            <BookCheck size={14} />
            <span>{t('nav-post-event')}</span>
            {activeTab === 'post-event' && <motion.div layoutId="tab-indicator" className="tab-indicator" />}
          </button>

          <button
            onClick={() => setActiveTab('emergency')}
            className={`nav-tab-btn ${activeTab === 'emergency' ? 'active' : ''}`}
            style={{ color: activeTab === 'emergency' ? 'var(--accent-red)' : undefined }}
          >
            <AlertTriangle size={14} />
            <span>Emergency AI</span>
            {activeTab === 'emergency' && <motion.div layoutId="tab-indicator" className="tab-indicator" style={{ backgroundColor: 'var(--accent-red)', boxShadow: '0 0 8px var(--accent-red)' }} />}
          </button>
        </div>

        {/* Dynamic Tab Pane Render using Framer Motion Transitions */}
        <div className="tab-content-wrapper">
          <AnimatePresence mode="wait">
            {activeTab === 'monitor' && (
              <motion.div
                key="monitor"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="tab-pane"
              >
                <MapMonitor
                  activeIncidents={activeIncidents}
                  selectedIncident={selectedIncident}
                  setSelectedIncident={setSelectedIncident}
                  fetchData={fetchData}
                  t={t}
                  activeLang={activeLang}
                  weatherMultiplier={weather.multiplier}
                  is3D={is3D}
                />
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-pane"
              >
                <AnalyticsPanel
                  activeIncidents={activeIncidents}
                  selectedIncident={selectedIncident}
                  t={t}
                  activeLang={activeLang}
                  is3D={is3D}
                />
              </motion.div>
            )}

            {activeTab === 'weather' && (
              <motion.div
                key="weather"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-pane"
              >
                <WeatherDashboard
                  weather={weather}
                  t={t}
                  activeLang={activeLang}
                />
              </motion.div>
            )}

            {activeTab === 'planner' && (
              <motion.div
                key="planner"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-pane"
              >
                <PreEventPlanner
                  t={t}
                  activeLang={activeLang}
                  is3D={is3D}
                />
              </motion.div>
            )}

            {activeTab === 'post-event' && (
              <motion.div
                key="post-event"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-pane"
              >
                <PostEventInsights
                  t={t}
                  activeLang={activeLang}
                />
              </motion.div>
            )}

            {activeTab === 'emergency' && (
              <motion.div
                key="emergency"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="tab-pane"
              >
                <EmergencyCorridorCenter
                  t={t}
                  activeLang={activeLang}
                  is3D={is3D}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Copilot Chat Drawer */}
      <CopilotChat activeLang={activeLang} t={t} />
    </div>
  );
}
