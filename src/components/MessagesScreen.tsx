import React from 'react';
import { ChatSession } from '../types';

interface Props {
  matches: ChatSession[];
  onSelectChat: (session: ChatSession) => void;
}

const MessagesScreen: React.FC<Props> = ({ matches, onSelectChat }) => {
  return (
    <div className="p-4 space-y-6">
      <section>
        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4 px-2">New Matches</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {matches.map((match) => (
            <div
              key={match.id}
              className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer"
              onClick={() => onSelectChat(match)}
            >
              <div className="w-16 h-16 rounded-full p-0.5 border-2 border-red-500">
                <img
                  src={match.partner.images[0]}
                  className="w-full h-full rounded-full object-cover"
                  alt={match.partner.name}
                />
              </div>
              <span className="text-xs font-medium text-gray-700">{match.partner.name}</span>
            </div>
          ))}
          {matches.length === 0 && (
            <div className="flex items-center justify-center w-full py-4 text-gray-400 italic text-sm">
              Keep swiping to find matches!
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4 px-2">Messages</h3>
        <div className="space-y-1">
          {matches.map((session) => {
            const lastMessage = session.messages[session.messages.length - 1];
            return (
              <div
                key={session.id}
                onClick={() => onSelectChat(session)}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-sm transition-all cursor-pointer"
              >
                <img
                  src={session.partner.images[0]}
                  className="w-14 h-14 rounded-full object-cover"
                  alt={session.partner.name}
                />
                <div className="flex-1 border-b border-gray-100 pb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-800">{session.partner.name}</span>
                    <span className="text-[10px] text-gray-400">2h ago</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {lastMessage?.senderId === 'me' ? 'You: ' : ''}{lastMessage?.text}
                  </p>
                </div>
              </div>
            );
          })}
          {matches.length === 0 && (
            <div className="text-center py-20">
              <i className="fa-regular fa-comments text-gray-200 text-6xl mb-4 block"></i>
              <p className="text-gray-400">No conversations yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MessagesScreen;
