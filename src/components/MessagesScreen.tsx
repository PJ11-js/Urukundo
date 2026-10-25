import React from 'react';
import { ChatSession } from '../types';
import { cloudinaryUrl } from '../services/cloudinaryService';

interface Props {
  matches: ChatSession[];
  onSelectChat: (session: ChatSession) => void;
  currentUserId?: string;
  lang?: 'fr' | 'en';
}

// Photo du profil, ou son initiale si la personne n'a pas (encore) de photo :
// avant, une image cassée s'affichait.
const Avatar: React.FC<{ session: ChatSession; size: number; className: string }> = ({ session, size, className }) =>
  session.partner.images?.[0] ? (
    <img src={cloudinaryUrl(session.partner.images[0], size * 2, size * 2)} className={`${className} object-cover`} alt={session.partner.name} />
  ) : (
    <div className={`${className} bg-gradient-to-br from-red-300 to-green-300 flex items-center justify-center`}>
      <span className="text-white font-bold text-lg">{session.partner.name?.[0] || '?'}</span>
    </div>
  );

const timeAgo = (ts: number | undefined, lang: 'fr' | 'en') => {
  if (!ts) return '';
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return lang === 'fr' ? "à l'instant" : 'now';
  if (min < 60) return lang === 'fr' ? `${min} min` : `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return lang === 'fr' ? `${h} h` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return lang === 'fr' ? `${d} j` : `${d}d ago`;
  return new Date(ts).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' });
};

const MessagesScreen: React.FC<Props> = ({ matches, onSelectChat, currentUserId, lang = 'fr' }) => {
  const fr = lang === 'fr';
  return (
    <div className="p-4 space-y-6">
      <section>
        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4 px-2">{fr ? 'Nouveaux matchs' : 'New Matches'}</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {matches.map((match) => (
            <div
              key={match.id}
              className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer"
              onClick={() => onSelectChat(match)}
            >
              <div className="w-16 h-16 rounded-full p-0.5 border-2 border-red-500">
                <Avatar session={match} size={64} className="w-full h-full rounded-full" />
              </div>
              <span className="text-xs font-medium text-gray-700">{match.partner.name}</span>
            </div>
          ))}
          {matches.length === 0 && (
            <div className="flex items-center justify-center w-full py-4 text-gray-400 italic text-sm">
              {fr ? 'Continue à swiper pour trouver des matchs !' : 'Keep swiping to find matches!'}
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
                <Avatar session={session} size={56} className="w-14 h-14 rounded-full flex-shrink-0" />
                <div className="flex-1 border-b border-gray-100 pb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-800">{session.partner.name}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(lastMessage?.timestamp, lang)}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {lastMessage?.senderId === currentUserId ? (fr ? 'Toi : ' : 'You: ') : ''}{lastMessage?.text}
                  </p>
                </div>
              </div>
            );
          })}
          {matches.length === 0 && (
            <div className="text-center py-20">
              <i className="fa-regular fa-comments text-gray-200 text-6xl mb-4 block"></i>
              <p className="text-gray-400">{fr ? 'Pas encore de conversations.' : 'No conversations yet.'}</p>
            </div>
          )}
        </div>
      </section>

      {matches.length > 0 && (
        <div className="text-center py-10">
          <i className="fa-solid fa-heart-circle-check text-gray-200 text-4xl mb-3 block"></i>
          <p className="text-gray-400 text-sm">{fr ? "C'est tout pour le moment" : "That's all for now"}</p>
          <p className="text-gray-300 text-xs mt-1">{fr ? 'Continue à swiper pour trouver plus de matchs !' : 'Keep swiping to find more matches!'}</p>
        </div>
      )}
    </div>
  );
};

export default MessagesScreen;
