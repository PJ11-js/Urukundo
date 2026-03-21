import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ChatSession } from '../types';
import { getConversationStarter } from '../services/geminiService';

interface Props {
  session: ChatSession;
  currentUserId: string;
  onBack: () => void;
  lang?: 'fr' | 'en';
}

const ChatDetailScreen: React.FC<Props> = ({ session, currentUserId, onBack, lang = 'fr' }) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatId = [currentUserId, session.partner.id].sort().join('_');

  const T = {
    fr: { matched: 'Vous avez matché 🎉 Amahoro !', placeholder: 'Écris un message...', wingman: 'AI WINGMAN : SUGGÈRE UNE ACCROCHE', thinking: 'Réflexion...', whatsappPrompt: 'Entre ton numéro WhatsApp :', call: 'Appeler' },
    en: { matched: 'You matched 🎉 Amahoro!', placeholder: 'Type a message...', wingman: 'AI WINGMAN: SUGGEST AN OPENER', thinking: 'Thinking...', whatsappPrompt: 'Enter your WhatsApp number:', call: 'Call' }
  };
  const t = T[lang];

  useEffect(() => {
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toMillis() || Date.now() })));
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
    });
    return () => unsub();
  }, [chatId]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUserId, text, timestamp: serverTimestamp(),
      });
    } catch (err) { console.error(err); }
  };

  const handleAiWingman = async () => {
    setIsAiLoading(true);
    const suggestion = await getConversationStarter(session.partner.name, session.partner.interests);
    setInputText(suggestion);
    setIsAiLoading(false);
    inputRef.current?.focus();
  };

  const handleWhatsApp = () => {
    if (whatsappNumber) {
      const number = whatsappNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${number}`, '_blank');
    } else {
      setShowWhatsApp(true);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10 flex-shrink-0">
        <button onClick={onBack} className="text-gray-500 hover:text-red-500 p-1">
          <i className="fa-solid fa-chevron-left text-xl"></i>
        </button>
        {session.partner.images?.[0] ? (
          <img src={session.partner.images[0]} className="w-10 h-10 rounded-full object-cover" alt={session.partner.name} />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-200 to-green-200 flex items-center justify-center">
            <span className="text-white font-bold">{session.partner.name[0]}</span>
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-bold text-gray-800 leading-none">{session.partner.name}</h4>
          {session.partner.isDemo ? (
            <span className="text-[10px] text-gray-400 font-medium italic">IA prototype</span>
          ) : (
            <span className="text-[10px] text-green-500 font-medium">● {lang === 'fr' ? 'En ligne' : 'Online'}</span>
          )}
        </div>
        <button onClick={handleWhatsApp}
          className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md">
          <i className="fa-brands fa-whatsapp text-lg"></i>
        </button>
      </div>

      {showWhatsApp && (
        <div className="bg-green-50 p-4 border-b border-green-100 flex-shrink-0">
          <p className="text-xs text-green-700 font-medium mb-2">{t.whatsappPrompt}</p>
          <div className="flex gap-2">
            <input type="tel" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="+257 XX XXX XXX"
              className="flex-1 p-2 bg-white rounded-xl text-sm border border-green-200 focus:outline-none" />
            <button onClick={() => { handleWhatsApp(); setShowWhatsApp(false); }}
              className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium">{t.call}</button>
            <button onClick={() => setShowWhatsApp(false)} className="px-3 py-2 bg-gray-100 rounded-xl text-sm">✕</button>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50" style={{ overscrollBehavior: 'contain' }}>
        <div className="text-center py-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{t.matched}</p>
        </div>
        {messages.map(msg => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-red-500 text-white rounded-br-none' : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-none'}`}>
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border-t border-gray-100 flex-shrink-0 p-4">
        <div className="flex flex-col gap-2">
          <button onClick={handleAiWingman} disabled={isAiLoading}
            className="self-start text-[10px] font-bold py-1 px-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-1.5 disabled:opacity-50">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            {isAiLoading ? t.thinking : t.wingman}
          </button>
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
              placeholder={t.placeholder} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
              style={{ fontSize: '16px' }} />
            <button onClick={handleSend}
              className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform flex-shrink-0">
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatDetailScreen;
