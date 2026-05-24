import React, { useState, useEffect } from 'react';
import { BrainCircuit, RefreshCw, Sparkles, BookOpen } from 'lucide-react';

const AIReportCard = () => {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');
      const res = await fetch(`${API_URL}/ai/weekly-report`);
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
      } else {
        setReport('Error cargando el diagnóstico.');
      }
    } catch (e) {
      console.error(e);
      setReport('Error conectando con el servidor para obtener el diagnóstico deportivo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Parseador de Markdown ultra-liviano basado en Regex para evitar agregar dependencias npm pesadas
  const parseMarkdownToHTML = (md) => {
    if (!md) return '';
    let html = md;
    
    // Encabezados
    html = html.replace(/^### (.*?)$/gm, '<h3 style="font-size: 0.95rem; font-weight: 800; color: #00e5ff; margin: 0.75rem 0 0.35rem 0; display: flex; align-items: center; gap: 4px;">$1</h3>');
    html = html.replace(/^#### (.*?)$/gm, '<h4 style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin: 0.5rem 0 0.25rem 0;">$1</h4>');
    
    // Negritas
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: white; font-weight: 700;">$1</strong>');
    
    // Citas estilo Blockquote (Coach Tips)
    html = html.replace(/^> \*(.*?)\*$/gm, '<div style="background: rgba(139, 92, 246, 0.06); border-left: 3px solid #8b5cf6; border-radius: 4px; padding: 0.5rem 0.75rem; margin: 0.75rem 0; font-size: 0.72rem; color: #ebd8ff; font-style: italic;">💡 $1</div>');
    html = html.replace(/^> (.*?)$/gm, '<div style="background: rgba(255,255,255,0.01); border-left: 3px solid var(--glass-border); padding: 0.5rem; margin: 0.5rem 0; font-size: 0.72rem; color: var(--text-secondary); font-style: italic;">$1</div>');
    
    // Viñetas estilo lista
    html = html.replace(/^\* (.*?)$/gm, '<li style="margin-left: 1rem; list-style-type: disc; margin-bottom: 0.25rem;">$1</li>');
    
    // Código de comando
    html = html.replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 0.7rem; color: #ff7b47;">$1</code>');
    
    // Párrafos y Saltos de línea
    html = html.replace(/\n/g, '<br />');

    return html;
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      
      {/* BACKGROUND DECORATIVE GLOW */}
      <div style={{
        position: 'absolute', top: '-60px', left: '-60px', width: '130px', height: '130px',
        borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', filter: 'blur(30px)', pointerEvents: 'none'
      }} />

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(0, 229, 255, 0.15))',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BrainCircuit size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <h2 className="text-xl" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              Diagnóstico Fisiológico IA <Sparkles size={14} style={{ color: '#8b5cf6' }} />
            </h2>
            <p className="text-muted text-xs">Informe predictivo sintetizado por Inteligencia Artificial.</p>
          </div>
        </div>

        <button
          onClick={fetchReport}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
            borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--text-secondary)', transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* CUERPO DEL REPORTE */}
      {loading ? (
        <div style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span className="text-gradient" style={{ fontSize: '0.88rem', fontWeight: 600 }}>Sintetizando datos y analizando TSB/HRV...</span>
        </div>
      ) : (
        <div 
          style={{ 
            fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5,
            background: 'rgba(255,255,255,0.005)', border: '1px solid var(--glass-border)',
            borderRadius: '10px', padding: '1rem', overflowY: 'auto'
          }}
          dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(report) }}
        />
      )}

      {/* CSS PARA SPIN */}
      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
};

export default AIReportCard;
