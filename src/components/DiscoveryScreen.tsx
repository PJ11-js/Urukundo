import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';

interface Props {
  profiles: UserProfile[];
  onLike: (profile: UserProfile) => void;
  onDislike: (id: string) => void;
  onUndo: () => void;
  lang?: 'fr' | 'en';
}

const DiscoveryScreen: React.FC<Props> = ({ profiles, onLike, onDislike, onUndo, lang = 'fr' }) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const startX = useRef(0);

  const T = {
    fr: { noMore: 'Plus de profils', comeback: 'Reviens plus tard !', reload: 'Recharger', online: 'En ligne', ia: 'IA prototype' },
    en: { noMore: 'No more profiles', comeback: 'Come back later!', reload: 'Reload', online: 'Online', ia: 'AI prototype' }
  };
  const t = T[lang];

  if (profiles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <i className="fa-solid fa-fire text-gray-300 text-4xl"></i>
        </div>
        <h3 className="text-xl font-semibold text-gray-800">{t.noMore}</h3>
        <p className="text-gray-500 mt-2">{t.comeback}</p>
        <button onClick={onUndo}
          className="mt-6 px-6 py-3 rounded-full border-2 border-red-500 text-red-500 font-medium flex items-center gap-2">
          <i className="fa-solid fa-rotate-left"></i> {t.reload}
        </button>
      </div>
    );
  }

  const currentProfile = profiles[0];
  const photos = currentProfile.images?.length > 0 ? currentProfile.images : [];

  const handleStart = (clientX: number) => { startX.current = clientX; setIsDragging(true); };
  const handleMove = (clientX: number) => { if (!isDragging) return; setDragX(clientX - startX.current); };
  const handleEnd = () => {
    setIsDragging(false);
    if (dragX > 100) { onLike(currentProfile); setActivePhoto(0); }
    else if (dragX < -100) { onDislike(currentProfile.id); setActivePhoto(0); }
    setDragX(0);
  };

  const handlePhotoTap = (e: React.MouseEvent) => {
    if (Math.abs(dragX) > 5) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left > rect.width / 2) setActivePhoto(p => Math.min(photos.length - 1, p + 1));
    else setActivePhoto(p => Math.max(0, p - 1));
  };

  const rotation = dragX * 0.08;
  const likeOpacity = Math.min(1, dragX / 100);
  const nopeOpacity = Math.min(1, -dragX / 100);

  return (
    <div className="h-full p-4 flex flex-col select-none">
      <div className="relative flex-1"
        onMouseDown={e => handleStart(e.clientX)} onMouseMove={e => handleMove(e.clientX)} onMouseUp={handleEnd} onMouseLeave={handleEnd}
        onTouchStart={e => handleStart(e.touches[0].clientX)} onTouchMove={e => { e.preventDefault(); handleMove(e.touches[0].clientX); }} onTouchEnd={handleEnd}>

        <div style={{ transform: `translateX(${dragX}px) rotate(${rotation}deg)`, transition: isDragging ? 'none' : 'transform 0.3s ease', cursor: isDragging ? 'grabbing' : 'grab' }}
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl bg-white" onClick={handlePhotoTap}>

          {photos[activePhoto] ? (
            <img src={photos[activePhoto]} alt={currentProfile.name} className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-100 to-green-100 flex items-center justify-center">
              <span className="text-6xl font-bold text-red-300">{currentProfile.name[0]}</span>
            </div>
          )}

          {photos.length > 1 && (
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 px-4">
              {photos.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i === activePhoto ? 'bg-white' : 'bg-white/40'}`} />)}
            </div>
          )}

          <div style={{ opacity: likeOpacity }} className="absolute top-8 left-6 border-4 border-green-400 text-green-400 px-4 py-1 rounded-xl rotate-[-20deg] text-2xl font-black pointer-events-none">LIKE 💚</div>
          <div style={{ opacity: nopeOpacity }} className="absolute top-8 right-6 border-4 border-red-400 text-red-400 px-4 py-1 rounded-xl rotate-[20deg] text-2xl font-black pointer-events-none">NOPE ❌</div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 text-white pointer-events-none">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-3xl font-bold">{currentProfile.name}, {currentProfile.age}</h2>
              {currentProfile.isDemo ? (
                <span className="text-xs bg-gray-500/80 px-2 py-0.5 rounded-full italic">{t.ia}</span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium bg-green-500/80 px-2 py-0.5 rounded-full">
                  <i className="fa-solid fa-circle text-[6px]"></i> {t.online}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 opacity-90 text-sm">
              <i className="fa-solid fa-location-dot"></i>
              <span>{currentProfile.location}{currentProfile.distance !== undefined ? ` • ${currentProfile.distance} km` : ''}</span>
            </div>
            <p className="mt-2 text-sm line-clamp-2 opacity-80">{currentProfile.bio}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {currentProfile.interests?.map(interest => (
                <span key={interest} className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">{interest}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-4 py-5">
        <button onClick={onUndo} className="w-12 h-12 rounded-full border-2 border-yellow-100 text-yellow-500 flex items-center justify-center shadow-md bg-white hover:scale-110 transition-transform">
          <i className="fa-solid fa-rotate-left text-lg"></i>
        </button>
        <button onClick={() => { onDislike(currentProfile.id); setActivePhoto(0); }} className="w-16 h-16 rounded-full border-2 border-red-100 text-red-500 flex items-center justify-center shadow-lg bg-white hover:scale-110 transition-transform active:scale-95">
          <i className="fa-solid fa-xmark text-2xl"></i>
        </button>
        <button className="w-12 h-12 rounded-full border-2 border-purple-100 text-purple-500 flex items-center justify-center shadow-md bg-white hover:scale-110 transition-transform">
          <i className="fa-solid fa-star text-lg"></i>
        </button>
        <button onClick={() => { onLike(currentProfile); setActivePhoto(0); }} className="w-16 h-16 rounded-full border-2 border-green-100 text-green-500 flex items-center justify-center shadow-lg bg-white hover:scale-110 transition-transform active:scale-95">
          <i className="fa-solid fa-heart text-2xl"></i>
        </button>
        <button className="w-12 h-12 rounded-full border-2 border-orange-100 text-orange-500 flex items-center justify-center shadow-md bg-white hover:scale-110 transition-transform">
          <i className="fa-solid fa-bolt text-lg"></i>
        </button>
      </div>
    </div>
  );
};

export default DiscoveryScreen;
