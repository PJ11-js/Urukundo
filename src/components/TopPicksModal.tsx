import React, { useState } from 'react';
import { UserProfile } from '../types';
import { cloudinaryUrl } from '../services/cloudinaryService';
import { sharedInterests } from '../services/topPicks';
import ProfileDetailModal from './ProfileDetailModal';

interface Props {
  picks: UserProfile[];
  me: UserProfile;
  lang?: 'fr' | 'en';
  onClose: () => void;
  onLike: (profile: UserProfile) => void;
  onDislike: (id: string) => void;
}

// "Sélection du jour" façon Top Picks de Tinder : les profils les plus
// compatibles, renouvelés chaque jour (voir services/topPicks.ts).
const TopPicksModal: React.FC<Props> = ({ picks, me, lang = 'fr', onClose, onLike, onDislike }) => {
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const fr = lang === 'fr';

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button onClick={onClose} className="text-gray-500 hover:text-red-500 p-1">
          <i className="fa-solid fa-chevron-left text-xl"></i>
        </button>
        <div>
          <h2 className="font-bold text-gray-800 leading-tight">⭐ {fr ? 'Sélection du jour' : "Today's picks"}</h2>
          <p className="text-[11px] text-gray-400">{fr ? 'Les profils qui te correspondent le plus. Nouvelle sélection chaque jour.' : 'The profiles that match you best. New picks every day.'}</p>
        </div>
      </div>

      {picks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div className="text-5xl mb-3">⭐</div>
          <p className="text-gray-600 font-medium">{fr ? 'Plus de sélection pour aujourd\'hui' : 'No more picks today'}</p>
          <p className="text-gray-400 text-sm mt-1">{fr ? 'Reviens demain pour de nouveaux profils !' : 'Come back tomorrow for new profiles!'}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 content-start">
          {picks.map(p => {
            const shared = sharedInterests(p, me).length;
            return (
              <button key={p.id} onClick={() => setSelected(p)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-sm bg-gray-100 text-left active:scale-95 transition-transform">
                <img src={cloudinaryUrl(p.images[0], 300, 400)} alt={p.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2.5 text-white">
                  <p className="font-bold text-sm leading-tight truncate">
                    {p.name}{p.age ? `, ${p.age}` : ''}
                    {p.identityVerified && <i className="fa-solid fa-circle-check text-blue-400 text-xs ml-1"></i>}
                  </p>
                  {shared > 0 && (
                    <p className="text-[10px] text-white/85 mt-0.5">
                      ❤️ {shared} {fr ? (shared > 1 ? 'passions en commun' : 'passion en commun') : (shared > 1 ? 'shared passions' : 'shared passion')}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <ProfileDetailModal
          profile={selected}
          lang={lang}
          onClose={() => setSelected(null)}
          onLike={() => { onLike(selected); setSelected(null); }}
          onDislike={() => { onDislike(selected.id); setSelected(null); }}
        />
      )}
    </div>
  );
};

export default TopPicksModal;
