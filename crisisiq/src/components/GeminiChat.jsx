import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import './GeminiChat.css';

const SYSTEM_PROMPT = `You are CrisisIQ AI Assistant, an expert in disaster management and resource allocation for India. You have access to real Kerala 2018 flood data:
- 14 districts affected
- 483 total fatalities
- Wayanad: 47 landslides, highest risk
- Idukki: 143 landslides, most rainfall
- Current bias score: 0.71 before CrisisIQ, 0.23 after fair allocation
- Response time improved from 72 hours to 4.2 minutes
- 901 hospitals mapped across Kerala
- 20 resources deployed across 15 states

Answer questions about disaster response, resource allocation and CrisisIQ features.
Keep answers concise — 2-3 sentences max.
Always end with an actionable suggestion.`;

const SUGGESTED_QUESTIONS = [
  "Which district needs help most urgently?",
  "What is the current bias score?",
  "How many resources are deployed?",
  "Show me Wayanad situation",
  "What happened in Kerala 2018?"
];

const GeminiChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello! I'm your CrisisIQ Assistant. How can I help you today?" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    try {
      const result = await model.generateContent(
        SYSTEM_PROMPT + "\n\nUser: " + text
      );
      const responseText = result.response.text();
      setMessages([...newMessages, { role: 'ai', text: responseText }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages([...newMessages, { role: 'ai', text: "Sorry, I encountered an error. Please check your connection or API key." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSendMessage(inputText);
  };

  return (
    <div className="gemini-chat-container">
      {/* Floating Button */}
      <button 
        className={`gemini-chat-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Ask AI"
      >
        <span className="trigger-icon">🤖</span>
        <span className="trigger-label">Ask AI</span>
      </button>

      {/* Chat Panel */}
      <div className={`gemini-chat-panel ${isOpen ? 'open' : ''}`}>
        <div className="gemini-chat-header">
          <div className="header-info">
            <div className="gemini-icon-wrapper">
              <svg viewBox="0 0 24 24" className="gemini-colorful-icon">
                <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="url(#gemini-gradient)" />
                <defs>
                  <linearGradient id="gemini-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#4285F4" />
                    <stop offset="0.5" stopColor="#9B72CB" />
                    <stop offset="1" stopColor="#D96570" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="header-text">
              <h3>CrisisIQ AI Assistant</h3>
              <div className="status-row">
                <span className="status-dot"></span>
                <span>Online</span>
                <span className="powered-by">Powered by Google Gemini</span>
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="gemini-chat-body">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-bubble-wrapper ${msg.role}`}>
              {msg.role === 'ai' && (
                <div className="ai-mini-icon">
                  <svg viewBox="0 0 24 24"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="#9B72CB"/></svg>
                </div>
              )}
              <div className={`chat-bubble ${msg.role}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="chat-bubble-wrapper ai">
              <div className="ai-mini-icon">
                <svg viewBox="0 0 24 24"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="#9B72CB"/></svg>
              </div>
              <div className="chat-bubble ai typing">
                Gemini is thinking
                <span className="dots">
                  <span>.</span><span>.</span><span>.</span>
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />

          {messages.length === 1 && !isTyping && (
            <div className="suggested-questions">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} className="suggest-btn" onClick={() => handleSendMessage(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="gemini-chat-input-bar">
          <input 
            type="text" 
            placeholder="Ask about any district or resource..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className="send-btn" onClick={() => handleSendMessage(inputText)} disabled={!inputText.trim() || isTyping}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiChat;
