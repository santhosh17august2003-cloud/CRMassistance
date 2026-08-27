import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api';

const QUICK_PROMPTS = [
  "How many leads are in 'Contacted' status?",
  "Show deals worth over $10,000 inactive 2 weeks",
  "Summarize history with Acme Corporation",
  "Move TechCorp Solutions deal to 'Won'",
  "Add a note to Apex Systems: follow up next Monday",
  "Assign Apex Systems to Alice Parker",
  "Show me smart insights and cold deals",
];

function renderMarkdown(text) {
  // Simple inline markdown renderer
  return text
    .replace(/### (.+)/g, '<h3>$1</h3>')
    .replace(/#### (.+)/g, '<h4>$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)/gm, '<li>$1</li>');
}

export default function ChatAssistant({ onDataChanged }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: "👋 Hi! I'm your **AI CRM Assistant**.\n\nAsk me anything about your pipeline, customers, or deals — or tell me to take an action. All my responses are grounded in your live CRM data.\n\nTry: *\"Show me cold deals at risk\"* or *\"Move Acme to Won\"*",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolCalled: null,
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  const sendMessage = useCallback(async (promptText) => {
    const prompt = promptText || inputVal.trim();
    if (!prompt || isLoading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: prompt,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolCalled: null,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    const history = messages.map(m => ({ sender: m.sender, text: m.text }));

    try {
      const res = await api.chat(prompt, history);
      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: res.reply || 'Done.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalled: res.tool_called,
        parameters: res.parameters,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // If the AI took a mutating action, refresh the CRM data
      const mutatingTools = ['update_deal_status', 'add_customer_note', 'assign_lead'];
      if (res.tool_called && mutatingTools.includes(res.tool_called) && onDataChanged) {
        onDataChanged();
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'assistant',
        text: `⚠️ Failed to reach the assistant: ${err.message}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalled: null,
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputVal, isLoading, messages, onDataChanged]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  const TOOL_ICONS = {
    search_customers: '🔍',
    query_deals: '💰',
    get_customer_history: '📋',
    update_deal_status: '✅',
    add_customer_note: '📝',
    assign_lead: '👤',
    get_smart_insights: '💡',
  };

  if (collapsed) {
    return (
      <button
        className="btn btn-primary"
        style={{ position: 'fixed', bottom: 24, right: 24, width: 52, height: 52, borderRadius: '50%', padding: 0, fontSize: 22, zIndex: 100, boxShadow: '0 4px 20px rgba(79,142,247,0.5)' }}
        onClick={() => setCollapsed(false)}
        title="Open AI Assistant"
      >🤖</button>
    );
  }

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-icon">🤖</div>
        <div className="chat-header-info">
          <div className="chat-title">AI CRM Assistant</div>
          <div className="chat-sub"><span className="online-dot" />Live &amp; Grounded</div>
        </div>
        <button className="chat-close-btn" onClick={() => setCollapsed(true)} title="Minimize">✕</button>
      </div>

      {/* Quick Prompts */}
      <div className="quick-prompts">
        <div className="quick-prompts-label">Try asking…</div>
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            className="quick-prompt-chip"
            onClick={() => sendMessage(p)}
            disabled={isLoading}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`msg-bubble ${msg.sender}`}>
            <div
              className="msg-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
            />
            <div className="msg-meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {msg.time}
              {msg.toolCalled && (
                <span className="tool-badge">
                  {TOOL_ICONS[msg.toolCalled] || '⚙️'} {msg.toolCalled.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="msg-bubble assistant">
            <div className="typing-indicator">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Ask anything or give a command…"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            disabled={isLoading}
          />
          <button
            className="send-btn"
            onClick={() => sendMessage()}
            disabled={!inputVal.trim() || isLoading}
            title="Send"
          >➤</button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
          Shift+Enter for new line · All answers grounded in live CRM data
        </div>
      </div>
    </div>
  );
}
