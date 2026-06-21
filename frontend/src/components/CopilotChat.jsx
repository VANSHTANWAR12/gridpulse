import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CopilotChat({ activeLang, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState('Offline Mode');
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => {
          const spacing = prev && !prev.endsWith(' ') ? ' ' : '';
          return prev + spacing + transcript;
        });
      };

      rec.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          alert("Microphone permission denied.\n\nPlease click the lock/settings icon next to the URL in your browser address bar and set 'Microphone' to 'Allow', then refresh the page.");
        } else if (event.error === 'audio-capture') {
          alert("No microphone detected or audio capture failed. Please ensure your webcam microphone is plugged in, set as default, and not in use by another app.");
        } else if (event.error === 'no-speech') {
          alert("No speech detected. Please check if your microphone is unmuted, speak clearly, or verify your browser's default microphone settings.");
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Dynamically set recognition language
  useEffect(() => {
    if (recognitionRef.current) {
      if (activeLang === 'kn') {
        recognitionRef.current.lang = 'kn-IN';
      } else if (activeLang === 'hi') {
        recognitionRef.current.lang = 'hi-IN';
      } else {
        recognitionRef.current.lang = 'en-IN';
      }
    }
  }, [activeLang]);

  // Cancel TTS when chatbot is closed
  useEffect(() => {
    if (!isOpen && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMessageIndex(null);
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice typing is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Speech recognition start failed:", err);
      }
    }
  };

  // Pre-load voices on mount to initialize Web Speech API
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      // Listen for voice updates asynchronously
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const speakText = (text, index) => {
    if (!window.speechSynthesis) return;

    if (window.speechSynthesis.speaking && speakingMessageIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingMessageIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text of markdown blocks and tags
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/- /g, '')
      .replace(/&gt;/g, '')
      .replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/g, '')
      .replace(/`/g, '')
      .replace(/<[^>]*>/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (activeLang === 'kn') {
      utterance.lang = 'kn-IN';
    } else if (activeLang === 'hi') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    const voices = window.speechSynthesis.getVoices();
    console.log("SpeakText - Active Lang:", activeLang, "Utterance Lang:", utterance.lang, "Total Voices available:", voices.length);
    
    const targetLang = utterance.lang.toLowerCase().replace('_', '-');
    const matchingVoice = voices.find(v => {
      const voiceLang = v.lang.toLowerCase().replace('_', '-');
      return voiceLang === targetLang || voiceLang.startsWith(targetLang.split('-')[0]);
    });
    
    if (matchingVoice) {
      console.log("SpeechSynthesis: Matched voice:", matchingVoice.name, "[", matchingVoice.lang, "]");
      utterance.voice = matchingVoice;
    } else {
      console.warn("SpeechSynthesis: No matching voice found for language:", utterance.lang);
    }

    utterance.onend = () => {
      console.log("SpeechSynthesis: Finished speaking message index:", index);
      setSpeakingMessageIndex(prev => prev === index ? null : prev);
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error for message index", index, ":", e.error, e);
      // Only clear active status if this specific utterance's error is not caused by switching messages
      setSpeakingMessageIndex(prev => prev === index ? null : prev);
    };

    // Use a small timeout to circumvent the famous Chrome SpeechSynthesis cancel-interrupt bug.
    // Calling cancel() and speak() in the same tick immediately cancels the new utterance.
    setTimeout(() => {
      setSpeakingMessageIndex(index);
      window.speechSynthesis.speak(utterance);
      console.log("SpeechSynthesis: Speaking initiated for message index:", index);
    }, 80);
  };

  // Welcome Messages depending on the selected language (No English characters to avoid English-voice fallback reading ONLY English words)
  const getWelcomeMessage = (lang) => {
    switch (lang) {
      case 'kn':
        return "ನಮಸ್ಕಾರ, ನಾನು ಗ್ರಿಡ್‌ಪಲ್ಸ್ ಕೊಪೈಲಟ್ ಸಹಾಯಕ. ಬೆಂಗಳೂರಿನ ಸಕ್ರಿಯ ಸಂಚಾರ ಅಡಚಣೆಗಳು, ಸಂಪನ್ಮೂಲ ಹಂಚಿಕೆಗಳು ಅಥವಾ ಎಸ್‌ಒಪಿ ನಿಯಮಾವಳಿಗಳ ಬಗ್ಗೆ ನನ್ನನ್ನು ಕೇಳಿ.";
      case 'hi':
        return "नमस्ते, मैं ग्रिडपल्स कोपायलट सहायक हूँ। बेंगलुरु के सक्रिय यातायात अवरोधों, संसाधन आवंटन या एसओपी दिशानिर्देशों के बारे में मुझसे पूछें।";
      case 'en':
      default:
        return "Hello! I am the GridPulse Operations Copilot. Ask me about active traffic bottlenecks, resource deployments, or Standard Operating Procedures (SOP) in Bengaluru.";
    }
  };

  // Quick Suggestion Chips depending on the selected language
  const getSuggestions = (lang) => {
    switch (lang) {
      case 'kn':
        return [
          { text: "ಸಕ್ರಿಯ ಘಟನೆಗಳ ಪಟ್ಟಿ", query: "Show active traffic incidents" },
          { text: "ಎಸ್‌ಒಪಿ ನಿಯಮಗಳು", query: "What are the SOP rules for resource allocation?" },
          { text: "ಡೀಟೂರ್ ನಿಯಮಗಳು", query: "What is the route detour policy?" }
        ];
      case 'hi':
        return [
          { text: "सक्रिय घटनाओं की सूची", query: "Show active traffic incidents" },
          { text: "एसओपी दिशानिर्देश", query: "What are the SOP rules for resource allocation?" },
          { text: "डिटूर नीतियां", query: "What is the route detour policy?" }
        ];
      case 'en':
      default:
        return [
          { text: "List active incidents", query: "Show active traffic incidents" },
          { text: "SOP guidelines", query: "What are the SOP rules for resource allocation?" },
          { text: "Routing detour policy", query: "What is the route detour policy?" }
        ];
    }
  };

  // Sync initial welcome message when activeLang changes
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { sender: 'assistant', text: getWelcomeMessage(activeLang) }
      ]);
    } else if (messages.length === 1 && messages[0].sender === 'assistant') {
      const enWelcome = getWelcomeMessage('en');
      const knWelcome = getWelcomeMessage('kn');
      const hiWelcome = getWelcomeMessage('hi');
      if (messages[0].text === enWelcome || messages[0].text === knWelcome || messages[0].text === hiWelcome) {
        setMessages([
          { sender: 'assistant', text: getWelcomeMessage(activeLang) }
        ]);
      }
    }
  }, [activeLang]);

  // Scroll to bottom whenever messages list expands
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Escape HTML & parse markdown blocks safely (bold, lists, alerts, blockquotes, line breaks)
  const formatMarkdown = (text) => {
    if (!text) return '';
    let html = text;
    
    // Escape standard tags to prevent XSS
    html = html.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
                
    // Restore markdown standard blockquotes & alerts (GitHub style: [!NOTE], [!IMPORTANT], etc.)
    html = html.replace(/^&gt;\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n([\s\S]*?)$/gm, '<blockquote><strong>$1:</strong> $2</blockquote>');
    html = html.replace(/^&gt;\s*([\s\S]*?)$/gm, '<blockquote>$1</blockquote>');
    
    // Bold tags
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Lists elements
    html = html.replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, ''); // cleanup contiguous lists
    
    // Line breaks conversion
    html = html.replace(/\n/g, '<br/>');
    
    return html;
  };

  // Submit query
  const handleSendMessage = async (queryText) => {
    if (!queryText || queryText.trim() === '') return;

    // Add user message to state
    const userMsg = { sender: 'user', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: queryText,
          lang: activeLang
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Update chat mode badge from response telemetry
        if (data.mode && data.mode.toLowerCase().includes('gemini')) {
          setChatMode('Gemini Online');
        } else {
          setChatMode('Offline Mode');
        }

        // Add assistant response to state
        setMessages(prev => [...prev, { sender: 'assistant', text: data.response }]);
      } else {
        throw new Error("Bad response from chat server");
      }
    } catch (err) {
      console.error("Copilot Chat API Error:", err);
      setMessages(prev => [...prev, { 
        sender: 'system', 
        text: activeLang === 'kn' 
          ? 'ಕೊಪೈಲಟ್ ಸರ್ವರ್ ಸಂಪರ್ಕ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ನಂತರ ಪ್ರಯತ್ನಿಸಿ.' 
          : (activeLang === 'hi' ? 'कोपायलट सर्वर कनेक्शन विफल रहा। कृपया बाद में पुनः प्रयास करें।' : 'Failed to connect to the Copilot service. Please try again.') 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Reset conversation session history
  const handleResetSession = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/reset`, { method: 'POST' });
      if (res.ok) {
        setMessages([
          { sender: 'system', text: t('chat-reset-msg') || 'Conversation history has been cleared.' },
          { sender: 'assistant', text: getWelcomeMessage(activeLang) }
        ]);
        setChatMode('Offline Mode');
      }
    } catch (err) {
      console.error("Error resetting chat session:", err);
    }
  };

  const isOnlineMode = chatMode.toLowerCase().includes('gemini');

  return (
    <div className="chatbot-container">
      {/* Floating Action Toggle Button */}
      <motion.button 
        className="chat-toggle-btn"
        onClick={() => setIsOpen(prev => !prev)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-comments'}`}></i>
        {!isOpen && <span className="chat-badge">{t('copilot-badge') || 'Copilot'}</span>}
      </motion.button>

      {/* Floating Chat Drawer Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="chat-window"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-title">
                <i className="fa-solid fa-robot pulse-icon"></i>
                <div>
                  <h3>{t('chat-header-lbl') || 'Astram Copilot'}</h3>
                  <span 
                    id="chat-mode-badge" 
                    className={isOnlineMode ? 'badge-online' : 'badge-offline'}
                    style={{
                      backgroundColor: isOnlineMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isOnlineMode ? 'var(--accent-green)' : 'var(--accent-red)',
                      border: isOnlineMode ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                  >
                    {isOnlineMode ? t('chat-online') : t('chat-offline')}
                  </span>
                </div>
              </div>
              
              <div className="chat-header-actions">
                <button 
                  className="chat-reset-btn" 
                  onClick={handleResetSession}
                  title={t('chat-reset-title') || 'Reset Session'}
                >
                  <i className="fa-solid fa-arrow-rotate-left"></i>
                </button>
                <button 
                  className="chat-close-btn" 
                  onClick={() => setIsOpen(false)}
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Message Feed container */}
            <div className="chat-messages">
              {messages.map((msg, index) => {
                let msgClass = 'message system-message';
                if (msg.sender === 'user') msgClass = 'message user-message';
                if (msg.sender === 'assistant') msgClass = 'message assistant-message';

                return (
                  <motion.div 
                    key={index} 
                    className={msgClass}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {msg.sender === 'user' ? (
                      <div>{msg.text}</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }} />
                        {msg.sender === 'assistant' && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                              type="button"
                              className={`msg-speak-btn ${speakingMessageIndex === index ? 'speaking' : ''}`}
                              onClick={() => speakText(msg.text, index)}
                              title={speakingMessageIndex === index ? "Stop speaking" : "Speak response"}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: speakingMessageIndex === index ? 'var(--accent-blue)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                fontSize: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'color 0.2s'
                              }}
                            >
                              <i className={`fa-solid ${speakingMessageIndex === index ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
                              <span>{speakingMessageIndex === index ? (activeLang === 'kn' ? 'ನಿಲ್ಲಿಸು' : (activeLang === 'hi' ? 'रोकें' : 'Stop')) : (activeLang === 'kn' ? 'ಕೇಳಿ' : (activeLang === 'hi' ? 'सुनें' : 'Speak'))}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
              
              {/* Typing Indicator */}
              {loading && (
                <motion.div 
                  className="message assistant-message"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '12px 16px' }}
                >
                  <span className="pulse-icon" style={{ fontSize: '12px' }}>🧠</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('chat-thinking')}</span>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompt Chips */}
            <div className="chat-suggestions">
              {getSuggestions(activeLang).map((sug, i) => (
                <button 
                  key={i} 
                  className="suggestion-chip"
                  onClick={() => handleSendMessage(sug.query)}
                >
                  {sug.text}
                </button>
              ))}
            </div>

            {/* Input Form area */}
            <form 
              className="chat-input-area"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
            >
              <input 
                type="text"
                placeholder={t('chat-placeholder') || 'Ask Copilot...'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className={`chat-mic-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
                disabled={loading}
                title={isListening ? "Stop listening" : "Start voice typing"}
              >
                <i className={`fa-solid ${isListening ? 'fa-microphone-lines' : 'fa-microphone'}`}></i>
              </button>
              <button
                type="button"
                className="chat-mic-help-btn"
                onClick={() => alert("To switch your microphone:\n\n1. Click the settings/lock icon next to the URL in your browser address bar.\n2. Locate the 'Microphone' option and select your external webcam microphone from the dropdown list.\n3. Reload the page for browser changes to apply.\n\nAlternatively, you can set your external webcam microphone as the Default Recording Device under Windows Sound Settings (Settings -> Sound -> Input).")}
                title="How to switch microphone?"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.7,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              >
                <i className="fa-solid fa-circle-question"></i>
              </button>
              <button 
                type="submit" 
                className="chat-send-btn"
                disabled={loading || isListening}
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
