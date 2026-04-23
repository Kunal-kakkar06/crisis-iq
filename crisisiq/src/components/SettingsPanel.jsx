import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPanel({ onClose }) {
  const { language, setLanguage, t, currentLang, LANGUAGES } = useLanguage();
  const { isDark } = useTheme();
  const [view, setView] = useState('main'); // 'main' | 'language'

  const bg = isDark ? '#0D1B2A' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8EF';
  const text = isDark ? '#FFFFFF' : '#0F1E2E';
  const sub = isDark ? '#A0AEC0' : '#64748B';
  const rowHover = isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC';

  const sectionLabel = (label) => (
    <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'1.5px', color:sub, textTransform:'uppercase', padding:'16px 24px 8px' }}>{label}</div>
  );

  const row = (icon, label, right, onClick) => (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%',
      padding:'14px 24px', background:'transparent', border:'none', borderBottom:`1px solid ${border}`,
      color:text, fontSize:'14px', fontWeight:500, cursor:'pointer', fontFamily:'inherit',
      textAlign:'left', transition:'background 0.15s',
    }} onMouseOver={e=>e.currentTarget.style.background=rowHover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
      <span style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <span style={{ fontSize:'16px' }}>{icon}</span>
        <span>{label}</span>
      </span>
      <span style={{ display:'flex', alignItems:'center', gap:'8px', color:sub, fontSize:'13px' }}>
        {right && <span>{right}</span>}
        <span style={{ fontSize:'16px' }}>›</span>
      </span>
    </button>
  );

  const handleSelectLang = (code) => { setLanguage(code); setView('main'); };

  // Main settings view
  if (view === 'main') return (
    <div style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:isDark?'rgba(5,10,20,0.7)':'rgba(15,30,46,0.4)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:'16px', width:'420px', maxWidth:'92vw', maxHeight:'80vh', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ margin:0, fontSize:'18px', fontWeight:800, color:text }}>{t('settings')}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:sub, fontSize:'22px', cursor:'pointer', padding:'4px 8px', lineHeight:1 }}>✕</button>
        </div>
        <div style={{ overflowY:'auto', maxHeight:'calc(80vh - 60px)' }}>
          {sectionLabel(t('general'))}
          {row('🔔', t('notifications'), null, ()=>{})}
          {row('🎨', t('theme'), isDark ? '🌙' : '☀️', ()=>{})}
          {sectionLabel(t('languageRegion'))}
          {row('🌐', t('language'), currentLang.native, () => setView('language'))}
          {sectionLabel(t('account'))}
          {row('ℹ️', t('about'), null, ()=>{})}
        </div>
      </div>
    </div>
  );

  // Language sub-screen
  return (
    <div style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:isDark?'rgba(5,10,20,0.7)':'rgba(15,30,46,0.4)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:'16px', width:'420px', maxWidth:'92vw', maxHeight:'80vh', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={()=>setView('main')} style={{ background:'none', border:'none', color:isDark?'#378ADD':'#185FA5', fontSize:'15px', cursor:'pointer', fontWeight:700, fontFamily:'inherit', padding:0 }}>← {t('back')}</button>
          <h2 style={{ margin:0, fontSize:'18px', fontWeight:800, color:text, flex:1 }}>{t('selectLanguage')}</h2>
        </div>
        <div style={{ overflowY:'auto', maxHeight:'calc(80vh - 120px)' }}>
          {LANGUAGES.map(lang => (
            <button key={lang.code} onClick={()=>handleSelectLang(lang.code)} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%',
              padding:'12px 24px', background: language===lang.code ? (isDark?'rgba(55,138,221,0.12)':'#E6F1FB') : 'transparent',
              border:'none', borderBottom:`1px solid ${border}`, color:text, fontSize:'14px',
              cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'background 0.15s',
            }} onMouseOver={e=>{ if(language!==lang.code) e.currentTarget.style.background=rowHover; }} onMouseOut={e=>{ if(language!==lang.code) e.currentTarget.style.background='transparent'; }}>
              <span style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontWeight:700, fontSize:'15px', minWidth:'90px' }}>{lang.native}</span>
                <span style={{ color:sub, fontSize:'12px' }}>{lang.name}</span>
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ color:sub, fontSize:'11px', fontFamily:'monospace' }}>{lang.code}</span>
                {language===lang.code && <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:isDark?'#378ADD':'#185FA5' }}></span>}
              </span>
            </button>
          ))}
        </div>
        {language !== 'en' && (
          <div style={{ padding:'12px 24px', borderTop:`1px solid ${border}` }}>
            <button onClick={()=>handleSelectLang('en')} style={{
              width:'100%', padding:'10px', borderRadius:'8px', background:isDark?'rgba(255,255,255,0.04)':'#F8FAFC',
              border:`1px solid ${border}`, color:sub, fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            }}>🔄 {t('resetToEnglish')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
