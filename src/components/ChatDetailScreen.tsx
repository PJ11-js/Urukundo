import React, { useState, useRef, useEffect } from 'react';
import { ChatSession } from '../types';
import { getConversationStarter } from '../services/geminiService';

interface Props {
  session: ChatSession;
  onSendMessage: (text: string) => void;
  onBack: () => void;
}

const ChatDetailScreen: React.FC<Props> = ({ session, onSendMessage, onBack }) => {
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleAiWingman = async () => {
    setIsAiLoading(true);
    const suggestion = await getConversationStarter(session.partner.name, session.partner.interests);
    setInputText(suggestion);
    setIsAiLoading(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col h-full">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="text-gray-500 hover:text-red-500 p-1">
          <i className="fa-solid fa-chevron-left text-xl"></i>
        </button>
        <img
          src={session.partner.images[0]}
          className="w-10 h-10 rounded-full object-cover"
          alt={session.partner.name}
        />
        <div className="flex-1">
          <h4 className="font-bold text-gray-800 leading-none">{session.partner.name}</h4>
          <span className="text-[10px] text-green-500 font-medium">Active now</span>
        </div>
        <button className="text-gray-300">
          <i className="fa-solid fa-video"></i>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        <div className="text-center py-6">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            You matched today 🎉
          </p>
        </div>
        {session.messages.map((msg) => {
          const isMe = msg.senderId === 'me';
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-red-500 text-white rounded-br-none'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex flex-col gap-2">
          <button
            onClick={handleAiWingman}
            disabled={isAiLoading}
            className="self-start text-[10px] font-bold py-1 px-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            {isAiLoading ? 'Winging it...' : 'AI WINGMAN: SUGGEST A START LINE'}
          </button>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={handleSend}
              className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatDetailScreen;
