import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CloudSun, 
  CloudRain, 
  CloudLightning, 
  CloudFog, 
  Sun, 
  Thermometer, 
  Droplets, 
  Wind, 
  CloudDrizzle, 
  Zap, 
  AlertTriangle, 
  Compass
} from 'lucide-react';

export default function WeatherDashboard({ weather, t, activeLang }) {
  const [isLive, setIsLive] = useState(true);

  const translateCondition = (cond) => {
    if (!cond) return '';
    const clean = cond.toLowerCase().trim();
    if (clean === 'clear' || clean === 'sunny') return t('weather-cond-clear') || cond;
    if (clean === 'partly cloudy' || clean === 'cloudy') return t('weather-cond-partly-cloudy') || cond;
    if (clean === 'foggy' || clean === 'fog') return t('weather-cond-foggy') || cond;
    if (clean === 'drizzle/rain' || clean === 'rain' || clean === 'drizzle' || clean === 'rainy') return t('weather-cond-drizzle-rain') || cond;
    if (clean === 'snow') return t('weather-cond-snow') || cond;
    if (clean === 'thunderstorm') return t('weather-cond-thunderstorm') || cond;
    return cond;
  };

  // Detect when user clicks inside the iframe (changing timeline/interacting)
  useEffect(() => {
    const handleBlur = () => {
      const active = document.activeElement;
      if (active && active.tagName === 'IFRAME') {
         setIsLive(false);
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  if (!weather) return null;

  const { temp, humidity, wind, rain, condition, multiplier, loading } = weather;

  // Select icon based on condition
  const getWeatherIcon = (cond) => {
    switch (cond) {
      case 'Drizzle/Rain':
        return <CloudRain className="weather-icon-large text-blue" />;
      case 'Thunderstorm':
        return <CloudLightning className="weather-icon-large text-orange" />;
      case 'Foggy':
        return <CloudFog className="weather-icon-large text-muted" />;
      case 'Partly Cloudy':
        return <CloudSun className="weather-icon-large text-yellow" />;
      case 'Clear':
      default:
        return <Sun className="weather-icon-large text-yellow" />;
    }
  };

  // Select background gradient based on condition
  const getBackgroundStyle = (cond) => {
    switch (cond) {
      case 'Drizzle/Rain':
        return { background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.6) 0%, var(--bg-card) 100%)' };
      case 'Thunderstorm':
        return { background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.5) 0%, var(--bg-card) 100%)' };
      case 'Foggy':
        return { background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.6) 0%, var(--bg-card) 100%)' };
      case 'Partly Cloudy':
        return { background: 'linear-gradient(135deg, rgba(14, 116, 144, 0.5) 0%, var(--bg-card) 100%)' };
      case 'Clear':
      default:
        return { background: 'linear-gradient(135deg, rgba(202, 138, 4, 0.3) 0%, var(--bg-card) 100%)' };
    }
  };

  if (loading) {
    return (
      <div className="weather-workspace" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-icon" style={{ fontSize: '24px', marginBottom: '10px' }}>⚡</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t('weather-loading')}</p>
        </div>
      </div>
    );
  }

  // Generate mock 12-hour forecast based on current condition
  const mockForecast = Array.from({ length: 12 }).map((_, i) => {
    const time = new Date();
    time.setHours(time.getHours() + i + 1);
    const hourStr = time.getHours().toString().padStart(2, '0') + ':00';
    
    // Slight variation in temperature and chance of rain
    let fTemp = parseInt(temp) + Math.round(Math.sin(i) * 2);
    let fPrecip = condition === 'Clear' ? Math.max(0, i * 2) : Math.max(0, parseInt(humidity) - i * 5);
    let fIcon = <CloudSun size={20} className="text-yellow" />;
    
    if (fPrecip > 70) fIcon = <CloudLightning size={20} className="text-orange" />;
    else if (fPrecip > 40) fIcon = <CloudRain size={20} className="text-blue" />;
    else if (fPrecip > 20) fIcon = <CloudDrizzle size={20} className="text-blue" />;
    else if (fTemp > 25 && fPrecip < 10) fIcon = <Sun size={20} className="text-yellow" />;
    else if (i > 6 && i < 10) fIcon = <CloudFog size={20} className="text-muted" />;

    return { time: hourStr, temp: fTemp, precip: fPrecip, icon: fIcon };
  });

  return (
    <div className="weather-workspace">
      <div className="weather-top-row">
        {/* Left Pane - Live Telemetry Info */}
        <motion.div 
          className="weather-info-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={getBackgroundStyle(condition)}
        >
          <div className="weather-header">
            {getWeatherIcon(condition)}
            <div className="weather-header-text">
              <h2>Bengaluru</h2>
              <p>{t('weather-live-telemetry')}</p>
            </div>
          </div>

          <div className="weather-temp-display">
            <span className="weather-temp">{temp}</span>
            <span className="weather-unit">°C</span>
          </div>

          <div className="weather-condition-label" style={{ fontSize: '20px', fontWeight: '600', letterSpacing: '0.5px', color: 'var(--text-primary)', marginTop: '-12px' }}>
            {translateCondition(condition)}
          </div>

          <div className="weather-stats-grid">
            <div className="weather-stat-box">
              <Thermometer className="weather-stat-icon text-red" size={16} />
              <div className="weather-stat-data">
                <span className="weather-stat-label">{t('weather-temp-lbl')}</span>
                <span className="weather-stat-value">{temp}°C</span>
              </div>
            </div>

            <div className="weather-stat-box">
              <Droplets className="weather-stat-icon text-blue" size={16} />
              <div className="weather-stat-data">
                <span className="weather-stat-label">{t('weather-humidity-lbl')}</span>
                <span className="weather-stat-value">{humidity}%</span>
              </div>
            </div>

            <div className="weather-stat-box">
              <Wind className="weather-stat-icon text-green" size={16} />
              <div className="weather-stat-data">
                <span className="weather-stat-label">{t('weather-wind-lbl')}</span>
                <span className="weather-stat-value">{wind} km/h</span>
              </div>
            </div>

            <div className="weather-stat-box">
              <CloudDrizzle className="weather-stat-icon text-yellow" size={16} />
              <div className="weather-stat-data">
                <span className="weather-stat-label">{t('weather-rain-lbl')}</span>
                <span className="weather-stat-value">{rain} mm</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Compass size={14} className="pulse-icon" />
              <span>{t('weather-station-coords')}</span>
            </div>
          </div>
        </motion.div>

        {/* Right Pane - ML Impact Multiplier Info */}
        <motion.div 
          className="weather-ml-multiplier-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="multiplier-header">
            <Zap className="multiplier-icon" size={20} />
            <h3>{t('weather-ml-impact-title')}</h3>
          </div>

          <div className="multiplier-badge-container">
            <div className="multiplier-value-box">{multiplier.toFixed(2)}x</div>
            <div className="multiplier-desc-box">
              <h4>
                {condition === 'Clear' 
                  ? t('weather-ml-multiplier-nominal') 
                  : t('weather-ml-multiplier-escalated')}
              </h4>
              <p>
                {condition === 'Clear' 
                  ? t('weather-nominal-desc') 
                  : t('weather-escalated-desc')
                      .replace('{condition}', translateCondition(condition))
                      .replace('{percent}', ((multiplier - 1) * 100).toFixed(0))}
              </p>
            </div>
          </div>

          {/* Explain the ML mapping rules */}
          <div style={{ marginTop: '12px' }}>
            <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              {t('ml-model-scaling-coefficients')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '10px 14px', 
                borderRadius: '6px', 
                backgroundColor: multiplier === 1.0 ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)', 
                border: '1px solid var(--border-color)', 
                borderLeft: '3px solid var(--accent-green)',
                boxShadow: multiplier === 1.0 ? '0 0 15px rgba(16, 185, 129, 0.15)' : 'none',
                borderColor: multiplier === 1.0 ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)',
                opacity: multiplier === 1.0 ? 1 : 0.4,
                transition: 'all 0.3s ease'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{t('weather-clear-sunny')}</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-green)' }}>{t('weather-clear-sunny-val')}</span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '10px 14px', 
                borderRadius: '6px', 
                backgroundColor: multiplier === 1.15 ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-card)', 
                border: '1px solid var(--border-color)', 
                borderLeft: '3px solid var(--accent-blue)',
                boxShadow: multiplier === 1.15 ? '0 0 15px rgba(59, 130, 246, 0.15)' : 'none',
                borderColor: multiplier === 1.15 ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-color)',
                opacity: multiplier === 1.15 ? 1 : 0.4,
                transition: 'all 0.3s ease'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{t('weather-foggy')}</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-blue)' }}>{t('weather-foggy-val')}</span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '10px 14px', 
                borderRadius: '6px', 
                backgroundColor: multiplier === 1.25 ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-card)', 
                border: '1px solid var(--border-color)', 
                borderLeft: '3px solid var(--accent-yellow)',
                boxShadow: multiplier === 1.25 ? '0 0 15px rgba(245, 158, 11, 0.15)' : 'none',
                borderColor: multiplier === 1.25 ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)',
                opacity: multiplier === 1.25 ? 1 : 0.4,
                transition: 'all 0.3s ease'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{t('weather-rain')}</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-yellow)' }}>{t('weather-rain-val')}</span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '10px 14px', 
                borderRadius: '6px', 
                backgroundColor: multiplier === 1.45 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card)', 
                border: '1px solid var(--border-color)', 
                borderLeft: '3px solid var(--accent-red)',
                boxShadow: multiplier === 1.45 ? '0 0 15px rgba(239, 68, 68, 0.15)' : 'none',
                borderColor: multiplier === 1.45 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)',
                opacity: multiplier === 1.45 ? 1 : 0.4,
                transition: 'all 0.3s ease'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{t('weather-thunderstorm')}</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-red)' }}>{t('weather-thunderstorm-val')}</span>
              </div>
            </div>
          </div>

          {/* Dynamic warning if multiplier > 1.0 */}
          {multiplier > 1.0 && (
            <motion.div 
              style={{ 
                display: 'flex', 
                gap: '12px', 
                padding: '12px 16px', 
                backgroundColor: 'rgba(249, 115, 22, 0.05)', 
                border: '1px solid rgba(249, 115, 22, 0.15)', 
                borderRadius: '6px',
                alignItems: 'flex-start',
                marginTop: '12px'
              }}
              animate={{ scale: [1, 1.01, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <AlertTriangle className="text-orange" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h5 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-orange)' }}>{t('critical-flood-alert')}</h5>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                  {t('critical-flood-alert-desc')}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <div className="weather-bottom-row">
        {/* Hourly Forecast Timeline */}
        <motion.div 
          className="weather-forecast-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="multiplier-header" style={{ marginBottom: '8px' }}>
            <Compass className="multiplier-icon" size={20} style={{ color: 'var(--accent-blue)' }} />
            <h3>{t('forecast-12h-title') || '12-Hour Operational Forecast'}</h3>
          </div>
          <div className="forecast-timeline-container">
            {mockForecast.map((fc, idx) => (
              <div key={idx} className="forecast-hour-block">
                <span className="forecast-time">{fc.time}</span>
                <div className="forecast-icon">{fc.icon}</div>
                <span className="forecast-temp">{fc.temp}°</span>
                <span className="forecast-precip">
                  <Droplets size={10} />
                  {fc.precip}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Live Weather Radar Snippet */}
        <motion.div 
          className="weather-radar-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{ position: 'relative' }}
        >
          {isLive && (
            <div style={{ position: 'absolute', zIndex: 10, top: '10px', left: '10px', pointerEvents: 'none' }}>
              <span style={{ backgroundColor: 'var(--accent-red)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                <motion.div 
                  animate={{ opacity: [1, 0.4, 1] }} 
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ width: '6px', height: '6px', backgroundColor: 'white', borderRadius: '50%' }} 
                />
                {activeLang === 'kn' ? 'ಲೈವ್' : activeLang === 'hi' ? 'लाइव' : 'LIVE'}
              </span>
            </div>
          )}
          <iframe 
            src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=9&overlay=temp&level=surface&lat=12.9716&lon=77.5946" 
            title="Live Weather Heatmap"
          />
        </motion.div>
      </div>
    </div>
  );
}
