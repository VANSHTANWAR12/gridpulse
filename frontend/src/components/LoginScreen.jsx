import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, User, Globe, AlertCircle, CheckCircle, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { translations } from '../translations';

export default function LoginScreen({ activeLang, setActiveLang, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // New features state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);

  // Helper for password strength
  const calculateStrength = (pwd) => {
    let strength = 0;
    if (pwd.length > 5) strength += 1;
    if (pwd.length > 8) strength += 1;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 1;
    return Math.min(strength, 3);
  };

  const pwdStrength = calculateStrength(password);

  const dict = translations[activeLang] || translations['en'];
  const t = (key) => dict[key] || key;

  const handleLangChange = (e) => {
    const newLang = e.target.value;
    setActiveLang(newLang);
    localStorage.setItem('gridpulse_lang', newLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError(activeLang === 'kn' ? 'ಬಳಕೆದಾರಹೆಸರು ಅಗತ್ಯವಿದೆ' : (activeLang === 'hi' ? 'उपयोगकर्ता नाम आवश्यक है' : 'Username is required'));
      return;
    }
    if (!password) {
      setError(activeLang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ಅಗತ್ಯವಿದೆ' : (activeLang === 'hi' ? 'पासवर्ड आवश्यक है' : 'Password is required'));
      return;
    }

    if (isRegister) {
      if (cleanUsername.length < 3) {
        setError(activeLang === 'kn' ? 'ಬಳಕೆದಾರಹೆಸರು ಕನಿಷ್ಠ ೩ ಅಕ್ಷರಗಳಾಗಿರಬೇಕು' : (activeLang === 'hi' ? 'उपयोगकर्ता नाम कम से कम 3 वर्णों का होना चाहिए' : 'Username must be at least 3 characters long'));
        return;
      }
      if (password.length < 6) {
        setError(activeLang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ ೬ ಅಕ್ಷರಗಳಾಗಿರಬೇಕು' : (activeLang === 'hi' ? 'पासवर्ड कम से कम 6 वर्णों का होना चाहिए' : 'Password must be at least 6 characters long'));
        return;
      }
      if (password !== confirmPassword) {
        setError(activeLang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುವುದಿಲ್ಲ' : (activeLang === 'hi' ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match'));
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegister) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername, password })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || t('auth-error-generic'));
        } else {
          setSuccess(t('auth-success-register'));
          setIsRegister(false);
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername, password })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || t('auth-invalid-credentials'));
        } else {
          localStorage.setItem('gridpulse_token', data.token);
          setAccessGranted(true);
          setTimeout(() => {
            onLoginSuccess(data);
          }, 1100); // Allow 1.1s for blast door transition
        }
      }
    } catch (err) {
      console.error(err);
      setError(t('auth-error-generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container split-screen">
      <AnimatePresence>
        {accessGranted && (
          <motion.div 
            className="access-granted-overlay"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="access-flash"></div>
            <div className="access-scanline"></div>
            <div className="access-content">
              <h1 className="glitch-text" data-text="ACCESS GRANTED">ACCESS GRANTED</h1>
              <div className="access-subtitles">
                <p className="sub-1">[ SYSTEM INITIALIZED: v4.2.9 ]</p>
                <p className="sub-2">[ ESTABLISHING SECURE CONNECTION ]</p>
                <p className="sub-3">[ DECRYPTING ASTRAM DASHBOARD... OK ]</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Hero Panel */}
      <motion.div 
        className="login-hero"
        animate={{ x: accessGranted ? '-100%' : 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: 'easeInOut' }}
      >
        <motion.div 
          className="hero-content"
          animate={{ opacity: accessGranted ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="logo hero-logo"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Shield className="pulse-icon" size={48} style={{ color: 'var(--accent-blue)' }} />
            <h1>{t('logo-title')}</h1>
          </motion.div>
          <motion.p 
            className="hero-tagline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {t('logo-tagline')}
          </motion.p>
        </motion.div>
        <div className="hero-mesh-background"></div>
        <div className="hero-particles">
          <div className="particle p1"></div>
          <div className="particle p2"></div>
          <div className="particle p3"></div>
          <div className="particle p4"></div>
          <div className="particle p5"></div>
        </div>
      </motion.div>

      {/* Right Form Panel */}
      <motion.div 
        className="login-form-side"
        animate={{ x: accessGranted ? '100%' : 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: 'easeInOut' }}
      >
        <motion.div 
          className="login-card glassmorphism"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: accessGranted ? 0 : 1, x: 0 }}
          transition={accessGranted ? { duration: 0.3 } : { duration: 0.5, ease: 'easeOut', delay: 0.2 }}
        >
          <div className="login-lang-select-container">
            <Globe className="login-lang-icon" />
            <select value={activeLang} onChange={handleLangChange} className="login-lang-picker">
              <option value="en">English</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

        <h2 className="login-form-title">
          {isRegister ? t('register-title') : t('login-title')}
        </h2>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-success">
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>{t('username-lbl')}</label>
            <div className="input-with-icon">
              <User className="input-icon" size={16} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('username-lbl')}
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <label>{t('password-lbl')}</label>
            <div className="input-with-icon">
              <Key className="input-icon" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password-lbl')}
                disabled={loading}
              />
              <button 
                type="button" 
                className="password-toggle-btn" 
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
            {/* Password Strength Meter */}
            {password && (
              <div className="password-strength-meter">
                <div className={`strength-segment ${pwdStrength >= 1 ? 'weak' : ''}`}></div>
                <div className={`strength-segment ${pwdStrength >= 2 ? 'fair' : ''}`}></div>
                <div className={`strength-segment ${pwdStrength >= 3 ? 'strong' : ''}`}></div>
              </div>
            )}
          </div>

          {isRegister && (
            <div className="input-group">
              <label>{activeLang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ' : (activeLang === 'hi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password')}</label>
              <div className="input-with-icon">
                <Key className="input-icon" size={16} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={activeLang === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ' : (activeLang === 'hi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password')}
                  disabled={loading}
                />
                <button 
                  type="button" 
                  className="password-toggle-btn" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              isRegister ? t('register-btn') : t('login-btn')
            )}
          </button>
        </form>

        <div className="auth-toggle">
          <button 
            type="button" 
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccess('');
            }}
            className="btn-auth-toggle"
            disabled={loading}
          >
            {isRegister ? t('have-account') : t('need-account')}
          </button>
        </div>
      </motion.div>
      </motion.div>
    </div>
  );
}
