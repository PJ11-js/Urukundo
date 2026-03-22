import React, { useState, useRef, useEffect } from 'react';
import Hammer from 'hammerjs';
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
  const [swipeAnim, setSwipeAnim] = useState<'like' | 'nope' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hammerRef = useRef<HammerManager | null>(null);
  const profilesRef = useRef(profiles);
  useEffect(() => { profilesRef.current = profiles; }, [profiles]);

  const T = {
    fr: { noMore: 'Plus de profils', comeback: 'Reviens plus tard!', reload: 'Recharger', ia: 'IA prototype' },
    en: { noMore: 'No more profiles', comeback: 'Come back later!', reload: 'Reload', ia: 'AI prototype' }
  };
  const t = T[lang];

  const triggerLike = (profile: UserProfile) => {
    setSwipeAnim('like');
    setTimeout(() => { onLike(profile); setActivePhoto(0); setSwipeAnim(null); setDragX(0); }, 350);
  };

  const triggerDislike = (id: string) => {
    setSwipeAnim('nope');
    setTimeout(() => { onDislike(id); setActivePhoto(0); setSwipeAnim(null); setDragX(0); }, 350);
  };

  useEffect(() => {
    if (!cardRef.current || profiles.length === 0) return;

    const hammer = new Hammer(cardRef.current, {
      recognizers: [
        [Hammer.Pan, { direction: Hammer.DIRECTION_HORIZONTAL, threshold: 10 }],
        [Hammer.Tap],
      ]
    });

    hammer.on('panstart', () => setIsDragging(true));
    hammer.on('panmove', (e) => setDragX(e.deltaX));
    hammer.on('panend', (e) => {
      setIsDragging(false);
      const current = profilesRef.current[0];
      if (!current) return;
      if (e.deltaX > 80) triggerLike(current);
      else if (e.deltaX < -80) triggerDislike(current.id);
      else setDragX(0);
    });

    hammer.on('tap', (e) => {
      const rect = cardRef.current!.getBoundingClientRect();
      const x = e.center.x - rect.left;
      if (x > rect.width / 2) setActivePhoto(p => Math.min((profilesRef.current[0]?.images?.length || 1) - 1, p + 1));
      else setActivePhoto(p => Math.max(0, p - 1));
    });

    hammerRef.current = hammer;
    return () => { hammer.destroy(); };
  }, [profiles.length]);

  // Mouse — desktop
  const startX = useRef(0);
  const handleMouseDown = (e: React.MouseEvent) => { startX.current = e.clientX; setIsDragging(true); };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setDragX(e.clientX - startX.current); };
  const handleMouseUp = () => {
    setIsDragging(false);
    if (dragX > 80 && profiles.length > 0) triggerLike(profiles[0]);
    else if (dragX < -80 && profiles.length > 0) triggerDislike(profiles[0].id);
    else setDragX(0);
  };

  if (profiles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <i className="fa-solid fa-fire text-gray-300 text-4xl"></i>
        </div>
        <h3 className="text-xl font-semibold text-gray-800">{t.noMore}</h3>
        <p className="text-gray-500 mt-2">{t.comeback}</p>
        <button onClick={onUndo} className="mt-6 px-6 py-3 rounded-full border-2 border-red-500 text-red-500 font-medium flex items-center gap-2">
          <i className="fa-solid fa-rotate-left"></i> {t.reload}
        </button>
      </div>
    );
  }

  const currentProfile = profiles[0];
  const photos = currentProfile.images?.length > 0 ? currentProfile.images : [];
  const cardTranslateX = swipeAnim === 'like' ? 500 : swipeAnim === 'nope' ? -500 : dragX;
  const cardRotation = swipeAnim === 'like' ? 30 : swipeAnim === 'nope' ? -30 : dragX * 0.06;
  const likeOpacity = swipeAnim === 'like' ? 1 : Math.min(1, dragX / 60);
  const nopeOpacity = swipeAnim === 'nope' ? 1 : Math.min(1, -dragX / 60);

  return (
    <div className="h-full p-4 flex flex-col select-none" style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}>
      <div className="relative flex-1"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

        <div ref={cardRef}
          style={{
            transform: `translateX(${cardTranslateX}px) rotate(${cardRotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform',
            userSelect: 'none',
            touchAction: 'none',
          }}
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl bg-white cursor-grab">

          {photos[activePhoto] ? (
            <img src={photos[activePhoto]} alt={currentProfile.name}
              className="w-full h-full object-cover pointer-events-none" draggable={false} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-100 to-green-100 flex items-center justify-center">
              <span className="text-6xl font-bold text-red-300">{currentProfile.name[0]}</span>
            </div>
          )}

          {photos.length > 1 && (
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 px-4 pointer-events-none">
              {photos.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i === activePhoto ? 'bg-white' : 'bg-white/40'}`} />)}
            </div>
          )}

          <div style={{ opacity: likeOpacity }} className="absolute top-8 left-6 border-4 border-green-400 text-green-400 px-4 py-1 rounded-xl rotate-[-20deg] text-2xl font-black pointer-events-none">LIKE 💚</div>
          <div style={{ opacity: nopeOpacity }} className="absolute top-8 right-6 border-4 border-red-400 text-red-400 px-4 py-1 rounded-xl rotate-[20deg] text-2xl font-black pointer-events-none">NOPE ❌</div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 text-white pointer-events-none">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-3xl font-bold">{currentProfile.name}, {currentProfile.age}</h2>
              {currentProfile.isDemo
                ? <span className="text-xs bg-gray-500/80 px-2 py-0.5 rounded-full italic">{t.ia}</span>
                : <span className="flex items-center gap-1 text-xs bg-green-500/80 px-2 py-0.5 rounded-full"><i className="fa-solid fa-circle text-[6px]"></i> Online</span>
              }
            </div>
            <div className="flex items-center gap-2 mt-1 opacity-90 text-sm">
              <i className="fa-solid fa-location-dot"></i>
              <span>{currentProfile.location}{currentProfile.distance !== undefined ? ` • ${currentProfile.distance} km` : ''}</span>
            </div>
            <p className="mt-2 text-sm line-clamp-2 opacity-80">{currentProfile.bio}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {currentProfile.interests?.map(i => <span key={i} className="text-xs bg-white/20 px-3 py-1 rounded-full">{i}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-4 py-5">
        <button onClick={onUndo} className="w-12 h-12 rounded-full border-2 border-yellow-100 text-yellow-500 flex items-center justify-center shadow-md bg-white active:scale-95 transition-transform">
          <i className="fa-solid fa-rotate-left text-lg"></i>
        </button>
        <button onClick={() => triggerDislike(currentProfile.id)}
          style={{ width: '4.5rem', height: '4.5rem' }}
          className="rounded-full border-2 border-red-100 text-red-500 flex items-center justify-center shadow-lg bg-white active:scale-95 transition-transform">
          <i className="fa-solid fa-xmark text-3xl"></i>
        </button>
        <button className="w-12 h-12 rounded-full border-2 border-purple-100 text-purple-500 flex items-center justify-center shadow-md bg-white active:scale-95 transition-transform">
          <i className="fa-solid fa-star text-lg"></i>
        </button>
        <button onClick={() => triggerLike(currentProfile)}
          style={{ width: '4.5rem', height: '4.5rem' }}
          className="rounded-full border-2 border-green-100 text-green-500 flex items-center justify-center shadow-lg bg-white active:scale-95 transition-transform">
          <i className="fa-solid fa-heart text-3xl"></i>
        </button>
        <button className="w-12 h-12 rounded-full border-2 border-orange-100 text-orange-500 flex items-center justify-center shadow-md bg-white active:scale-95 transition-transform">
          <i className="fa-solid fa-bolt text-lg"></i>
        </button>
      </div>
    </div>
  );
};

export default DiscoveryScreen;
