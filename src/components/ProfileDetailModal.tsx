import React, { useState } from 'react';
import { UserProfile } from '../types';
import { cloudinaryUrl } from '../services/cloudinaryService';
import { activityStatus, detailChips, relationshipGoalLabel } from '../services/profileDetails';

interface Props {
  profile: UserProfile;
  lang?: 'fr' | 'en';
  onClose: () => void;
  // Boutons like/nope en bas, uniquement depuis la découverte.
  onLike?: () => void;
  onDislike?: () => void;
}

// Vue complète d'un profil (façon "flèche vers le haut" de Tinder) : toutes les
// photos, la bio entière, tous les prompts, passions et infos.
const ProfileDetailModal: React.FC<Props> = ({ profile, lang = 'fr', onClose, onLike, onDislike }) => {
  const [activePhoto, setActivePhoto] = useState(0);
  const photos = profile.images || [];
  const activity = activityStatus(profile, lang);
  const chips = detailChips(profile.details);
  const t = lang === 'fr'
    ? { about: 'À propos', lookingFor: 'Je cherche', basics: 'Infos', passions: 'Passions', km: 'km' }
    : { about: 'About me', lookingFor: 'Looking for', basics: 'Basics', passions: 'Interests', km: 'km' };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto">
      <div className="flex-1 overflow-y-auto">
        <div className="relative w-full" style={{ height: '60vh' }}>
          {photos[activePhoto] ? (
            <img src={cloudinaryUrl(photos[activePhoto], 750, 1000)} className="w-full h-full object-cover" alt={profile.name} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-100 to-green-100 flex items-center justify-center">
              <span className="text-6xl font-bold text-red-300">{profile.name?.[0] || '?'}</span>
            </div>
          )}
          {photos.length > 1 && (
            <>
              <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 px-4 pointer-events-none">
                {photos.map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i === activePhoto ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
              <div className="absolute inset-0 flex">
                <div className="flex-1" onClick={() => setActivePhoto(p => Math.max(0, p - 1))} />
                <div className="flex-1" onClick={() => setActivePhoto(p => Math.min(photos.length - 1, p + 1))} />
              </div>
            </>
          )}
          <button onClick={onClose}
            className="absolute -bottom-6 right-5 w-12 h-12 rounded-full bg-red-500 text-white shadow-lg flex items-center justify-center z-10">
            <i className="fa-solid fa-arrow-down"></i>
          </button>
        </div>

        <div className="p-5 space-y-5 pb-28">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-1.5">
              {profile.name}, {profile.age}
              {profile.identityVerified && <i className="fa-solid fa-circle-check text-blue-500 text-base"></i>}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
              <span><i className="fa-solid fa-location-dot mr-1"></i>{profile.location}{profile.distance !== undefined ? ` • ${profile.distance} ${t.km}` : ''}</span>
              {activity && (
                <span className={`flex items-center gap-1 text-xs ${activity.online ? 'text-green-600' : 'text-gray-400'}`}>
                  <i className="fa-solid fa-circle text-[6px]"></i> {activity.label}
                </span>
              )}
            </div>
          </div>

          {profile.details?.relationshipGoal && (
            <div className="bg-red-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">{t.lookingFor}</p>
              <p className="text-base font-semibold text-gray-800">{relationshipGoalLabel(profile.details.relationshipGoal, lang)}</p>
            </div>
          )}

          {profile.bio && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t.about}</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{profile.bio}</p>
            </div>
          )}

          {chips.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.basics}</p>
              <div className="flex flex-wrap gap-2">
                {chips.map(c => (
                  <span key={c.label} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs text-gray-700 flex items-center gap-1.5">
                    <i className={`fa-solid ${c.icon} text-gray-400`}></i> {c.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.interests?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.passions}</p>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map(i => (
                  <span key={i} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium border border-red-100">{i}</span>
                ))}
              </div>
            </div>
          )}

          {(profile.prompts || []).map((p, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-xs text-red-500 font-bold uppercase mb-1">{p.question}</p>
              <p className="text-base text-gray-800">{p.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {(onLike || onDislike) && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-6 py-4 bg-gradient-to-t from-white via-white to-transparent">
          {onDislike && (
            <button onClick={onDislike} className="w-16 h-16 rounded-full border-2 border-red-100 text-red-500 bg-white shadow-lg flex items-center justify-center active:scale-95">
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
          )}
          {onLike && (
            <button onClick={onLike} className="w-16 h-16 rounded-full border-2 border-green-100 text-green-500 bg-white shadow-lg flex items-center justify-center active:scale-95">
              <i className="fa-solid fa-heart text-2xl"></i>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileDetailModal;
