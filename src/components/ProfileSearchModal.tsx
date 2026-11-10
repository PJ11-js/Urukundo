import React, { useMemo, useState } from 'react';
import { UserProfile } from '../types';
import { cloudinaryUrl } from '../services/cloudinaryService';
import ProfileDetailModal from './ProfileDetailModal';

interface Props {
  people: UserProfile[];          // profils déjà autorisés (sans bloqués / masqués)
  likedIds: Set<string>;
  matchedIds: Set<string>;
  lang?: 'fr' | 'en';
  onClose: () => void;
  onLike: (profile: UserProfile) => void;
  onOpenChat: (profileId: string) => void;
}

// "abé" == "Abe" : on compare sans accents ni majuscules.
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Recherche par prénom : retrouver un profil liké (qui n'a pas encore répondu),
// un match, ou n'importe qui de la découverte. Rien ne s'affiche avant 2 lettres,
// pour ne pas transformer ça en annuaire qu'on fait défiler.
const ProfileSearchModal: React.FC<Props> = ({ people, likedIds, matchedIds, lang = 'fr', onClose, onLike, onOpenChat }) => {
  const fr = lang === 'fr';
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<UserProfile | null>(null);

  const results = useMemo(() => {
    const needle = norm(q);
    if (needle.length < 2) return [];
    return people
      .filter(p => p.name && norm(p.name).includes(needle))
      .sort((a, b) => (norm(a.name).startsWith(needle) ? 0 : 1) - (norm(b.name).startsWith(needle) ? 0 : 1))
      .slice(0, 30);
  }, [q, people]);

  const badge = (p: UserProfile) => {
    if (matchedIds.has(p.id)) return <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Match 💬</span>;
    if (likedIds.has(p.id)) return <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{fr ? 'Liké ❤️ · en attente' : 'Liked ❤️ · pending'}</span>;
    return null;
  };

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-2 p-3 border-b border-gray-100">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center" aria-label={fr ? 'Fermer' : 'Close'}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 border border-gray-100">
          <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={fr ? 'Chercher un prénom…' : 'Search a name…'}
            className="flex-1 bg-transparent outline-none text-sm text-gray-800"
          />
          {q && <button onClick={() => setQ('')} className="text-gray-400"><i className="fa-solid fa-xmark"></i></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {norm(q).length < 2 ? (
          <p className="p-8 text-center text-sm text-gray-400">
            {fr ? 'Tape au moins 2 lettres du prénom. Tu retrouveras aussi les personnes que tu as déjà likées.' : 'Type at least 2 letters of the name. People you already liked show up too.'}
          </p>
        ) : results.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">{fr ? 'Aucun profil trouvé.' : 'No profile found.'}</p>
        ) : (
          results.map(p => (
            <button key={p.id} onClick={() => setSelected(p)} className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 text-left active:bg-gray-50">
              {p.images?.[0] ? (
                <img src={cloudinaryUrl(p.images[0], 112, 112)} className="w-14 h-14 rounded-full object-cover" alt={p.name} />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-300 to-green-300 flex items-center justify-center text-white font-bold text-lg">{p.name[0]}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{p.name}{p.age ? `, ${p.age}` : ''}</p>
                <p className="text-xs text-gray-500 truncate">{p.location || p.country || ''}</p>
                <div className="mt-1">{badge(p)}</div>
              </div>
              <i className="fa-solid fa-chevron-right text-gray-300"></i>
            </button>
          ))
        )}
      </div>

      {selected && (
        <>
          <ProfileDetailModal
            profile={selected}
            lang={lang}
            onClose={() => setSelected(null)}
            // Like seulement si pas encore liké ni matché (sinon doublon).
            onLike={!likedIds.has(selected.id) && !matchedIds.has(selected.id) ? () => { onLike(selected); setSelected(null); } : undefined}
          />
          {matchedIds.has(selected.id) && (
            <button
              onClick={() => onOpenChat(selected.id)}
              className="fixed z-[60] bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-green-600 text-white font-semibold shadow-lg"
            >
              <i className="fa-solid fa-comment mr-2"></i>{fr ? 'Envoyer un message' : 'Send a message'}
            </button>
          )}
          {likedIds.has(selected.id) && !matchedIds.has(selected.id) && (
            <div className="fixed z-[60] bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-gray-900/85 text-white text-sm shadow-lg whitespace-nowrap">
              ❤️ {fr ? "Tu l'as liké·e, en attente de sa réponse" : 'You liked them, waiting for a reply'}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProfileSearchModal;
