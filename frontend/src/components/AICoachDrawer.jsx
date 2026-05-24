import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, BrainCircuit, User } from 'lucide-react';

const AICoachDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '¡Hola Miguel! Eres tu preparador físico virtual y analista fisiológico de IA. Leo en tiempo real tu descanso, tu HRV de Withings, y tu TSB de Strava. ¿En qué puedo asesorar hoy tu planificación o entrenamiento?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const chatHistory = messages.map(m => ({ role: m.role, text: m.text }));
      const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');
      
      const response = await fetch(`${API_URL}/ai/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, chatHistory })
      });
      
      const data = await response.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Error procesando tu consulta con el servidor.' }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error conectando con el servidor backend.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FLOATING TRIGGER BUTTON WITH PULSE */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999,
          background: 'linear-gradient(135deg, #00e5ff, #8b5cf6)',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0, 229, 255, 0.4), 0 0 0 0px rgba(0, 229, 255, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          animation: 'pulseBtn 2s infinite ease-in-out',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 229, 255, 0.6)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 229, 255, 0.4)';
        }}
      >
        <Sparkles size={24} />
      </button>

      {/* CSS KEYFRAMES FOR PULSE */}
      <style>{`
        @keyframes pulseBtn {
          0% {
            box-shadow: 0 8px 24px rgba(0, 229, 255, 0.4), 0 0 0 0px rgba(0, 229, 255, 0.3);
          }
          70% {
            box-shadow: 0 8px 24px rgba(0, 229, 255, 0.4), 0 0 0 12px rgba(0, 229, 255, 0);
          }
          100% {
            box-shadow: 0 8px 24px rgba(0, 229, 255, 0.4), 0 0 0 0px rgba(0, 229, 255, 0);
          }
        }
      `}</style>

      {/* BACKGROUND BACKDROP */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(5, 8, 16, 0.4)',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.3s ease'
          }}
        />
      )}

      {/* DRAWER PANEL */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '430px',
          zIndex: 1001,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
        }}
      >
        {/* DRAWER HEADER */}
        <div style={{
          padding: '1.25rem',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.015)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(139, 92, 246, 0.15))',
              border: '1px solid rgba(0,229,255,0.25)',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BrainCircuit size={18} style={{ color: '#00e5ff' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'white' }}>Asistente Deportivo IA</h3>
              <span style={{ fontSize: '0.65rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span> En línea • Fisiólogo Copilot
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
              padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.color = 'white'}
            onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* DRAWER CHAT PANEL */}
        <div style={{
          flex: 1,
          padding: '1.25rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  maxWidth: '85%',
                  alignSelf: isUser ? 'flex-end' : 'flex-start'
                }}
              >
                {!isUser && (
                  <div style={{
                    background: 'rgba(0, 229, 255, 0.12)', border: '1px solid rgba(0, 229, 255, 0.2)',
                    borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: '2px', flexShrink: 0
                  }}>
                    <BrainCircuit size={14} style={{ color: '#00e5ff' }} />
                  </div>
                )}
                <div style={{
                  background: isUser ? 'var(--strava-orange)' : 'rgba(255, 255, 255, 0.03)',
                  border: isUser ? 'none' : '1px solid var(--glass-border)',
                  borderRadius: isUser ? '14px 14px 2px 14px' : '2px 14px 14px 14px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.8rem',
                  color: 'white',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>
                {isUser && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.08)', border: '1px solid var(--glass-border)',
                    borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: '2px', flexShrink: 0
                  }}>
                    <User size={14} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start', maxWidth: '80%', alignItems: 'center' }}>
              <div style={{
                background: 'rgba(0, 229, 255, 0.12)', border: '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <BrainCircuit size={14} style={{ color: '#00e5ff' }} />
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--glass-border)',
                borderRadius: '2px 14px 14px 14px', padding: '0.5rem 0.8rem', fontSize: '0.78rem', color: 'var(--text-secondary)'
              }}>
                Analizando métricas y redactando...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* CHAT INPUT AREA */}
        <form
          onSubmit={handleSend}
          style={{
            padding: '1.25rem',
            borderTop: '1px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.01)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre tu fatiga, sueño, TSB..."
            disabled={loading}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              fontSize: '0.8rem',
              color: 'white',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#00e5ff'}
            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              background: 'linear-gradient(135deg, #00e5ff, #8b5cf6)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.55rem 0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              opacity: !input.trim() || loading ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            <Send size={14} />
          </button>
        </form>

      </div>
    </>
  );
};

export default AICoachDrawer;
