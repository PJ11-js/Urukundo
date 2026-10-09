import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ChatSession } from '../types';
import { chatWithAssistant, AssistantMessage } from '../services/geminiService';

interface Props {
  userId: string;
  matches: ChatSession[];
  lang: 'fr' | 'en';
  aiConsent?: boolean;
  onConsentChange: (value: boolean) => void;
  onBack: () => void;
}

const T = {
  fr: {
    title: 'Assistant IA', placeholder: 'Pose ta question...',
    consentTitle: '🤖 Assistant IA personnel',
    consentBody: "Je peux t'aider à répondre à tes matchs et te donner des conseils de drague et de sécurité. Pour des conseils plus précis, veux-tu m'autoriser à voir le dernier message de chacun de tes matchs ?",
    consentYes: "Oui, j'autorise", consentNo: 'Non, merci',
    consentHint: 'Tu peux changer cela à tout moment avec le cadenas en haut.',
    privacyOn: 'Accès à tes conversations : activé', privacyOff: 'Accès à tes conversations : désactivé',
    empty: "Salut ! Demande-moi des conseils, de l'aide pour répondre à un match, ou pose-moi une question.",
    thinking: 'Réflexion...',
  },
  en: {
    title: 'AI Assistant', placeholder: 'Ask a question...',
    consentTitle: '🤖 Personal AI Assistant',
    consentBody: "I can help you reply to your matches and give dating/safety advice. For more precise advice, will you let me see the last message from each of your matches?",
    consentYes: 'Yes, I allow it', consentNo: 'No, thanks',
    consentHint: 'You can change this anytime with the lock icon above.',
    privacyOn: 'Access to your conversations: on', privacyOff: 'Access to your conversations: off',
    empty: "Hi! Ask me for advice, help replying to a match, or anything else.",
    thinking: 'Thinking...',
  },
};

const AIAssistantScreen: React.FC<Props> = ({ userId, matches, lang, aiConsent, onConsentChange, onBack }) => {
  const t = T[lang];
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConsent, setShowConsent] = useState(aiConsent === undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'aiAssistant', userId, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
    }, () => {});
    return () => unsub();
  }, [userId]);

  const handleConsent = (value: boolean) => {
    onConsentChange(value);
    setShowConsent(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');
    setLoading(true);
    try {
      await addDoc(collection(db, 'aiAssistant', userId, 'messages'), { role: 'user', text, timestamp: serverTimestamp() });

      const history: AssistantMessage[] = messages.map(m => ({ role: m.role, text: m.text }));
      const matchesContext = aiConsent
        ? matches.map(m => `${m.partner.name} : dernier message - "${m.messages[0]?.text || ''}"`).join('\n') || null
        : null;
      const reply = await chatWithAssistant(history, text, matchesContext, lang);
      await addDoc(collection(db, 'aiAssistant', userId, 'messages'), { role: 'model', text: reply, timestamp: serverTimestamp() });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
        <button onClick={onBack} className="text-gray-500 hover:text-red-500">
          <i className="fa-solid fa-chevron-left text-xl"></i>
        </button>
        <h2 className="text-lg font-bold text-gray-800 flex-1">{t.title}</h2>
        <button onClick={() => setShowConsent(true)} className="text-gray-400 hover:text-gray-600 w-9 h-9 flex items-center justify-center"
          title={aiConsent ? t.privacyOn : t.privacyOff}>
          <i className={`fa-solid ${aiConsent ? 'fa-unlock' : 'fa-lock'}`}></i>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-10 px-6">{t.empty}</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-red-500 text-white rounded-br-none' : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-none'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-400 shadow-sm border border-gray-100 rounded-2xl rounded-bl-none px-4 py-2.5 text-sm italic">{t.thinking}</div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-100 flex-shrink-0 p-4">
        <div className="flex items-center gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder={t.placeholder} onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
            style={{ fontSize: '16px' }} />
          <button onClick={handleSend} disabled={loading}
            className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform flex-shrink-0 disabled:opacity-50">
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>

      {showConsent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-3">
            <h3 className="text-lg font-bold text-gray-800">{t.consentTitle}</h3>
            <p className="text-sm text-gray-500">{t.consentBody}</p>
            <p className="text-xs text-gray-400">{t.consentHint}</p>
            <div className="flex flex-col gap-2 pt-2">
              <button onClick={() => handleConsent(true)} className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold text-sm">{t.consentYes}</button>
              <button onClick={() => handleConsent(false)} className="w-full py-2 text-sm text-gray-400">{t.consentNo}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantScreen;
