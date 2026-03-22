import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';

interface Props {
  profiles: UserProfile[];
  onLike: (profile: UserProfile) => void;
  onDislike: (id: string) => void;
  onUndo: () => void;
  lang?: 'fr' | 'en';
}

const EDGE_THRESHOLD = 40; // pixels depuis le bord — ignorer ce swipe

const DiscoveryScreen: React.FC<Props> = ({ profiles, onLike, onDislike, onUndo, lang = 'fr' }) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState<'like' | 'nope' | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isEdgeSwipe = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const T = {
    fr: { noMore: 'Plus de profils', comeback: 'Reviens plus tard !', reload: 'Recharger', ia: 'IA prototype' },
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
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const screenW = window.innerWidth;

      // Ignorer si trop près des bords gauche ou droit
      if (x < EDGE_THRESHOLD || x > screenW - EDGE_THRESHOLD) {
        isEdgeSwipe.current = true;
        return;
      }

      isEdgeSwipe.current = false;
      isHorizontal.current = null;
      startX.current = x;
      startY.current = y;
      setIsDragging(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isEdgeSwipe.current || swipeAnim) return;

      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      // Détecter direction au premier mouvement
      if (isHorizontal.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }

      if (isHorizontal.current === true) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setDragX(dx);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (isEdgeSwipe.current || !isHorizontal.current) {
        setIsDragging(false);
        setDragX(0);
        return;
      }

      const dx = e.changedTouches[0].clientX - startX.current;
      setIsDragging(false);

      if (dx > 80 && profiles.length > 0) triggerLike(profiles[0]);
      else if (dx < -80 && profiles.length > 0) triggerDislike(profiles[0].id);
      else setDragX(0);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [profiles, swipeAnim]);

  // Mouse — desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - startX.current);
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    if (dragX > 80 && profiles.length > 0) triggerLike(profiles[0]);
    else if (dragX < -80 && profiles.length > 0) triggerDislike(profiles[0].id);
    else setDragX(0);
  };

  const handlePhotoTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (Math.abs(dragX) > 10) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
    if (clientX - rect.left > rect.width / 2) setActivePhoto(p => Math.min((profiles[0]?.images?.length || 1) - 1, p + 1));
    else setActivePhoto(p => Math.max(0, p - 1));
  };

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

  const cardTranslateX = swipeAnim === 'like' ? 500 : swipeAnim === 'nope' ? -500 : dragX;
  const cardRotation = (swipeAnim === 'like' ? 30 : swipeAnim === 'nope' ? -30 : dragX * 0.06);
  const likeOpacity = swipeAnim === 'like' ? 1 : Math.min(1, dragX / 60);
  const nopeOpacity = swipeAnim === 'nope' ? 1 : Math.min(1, -dragX / 60);

  return (
    <div ref={containerRef} className="h-full p-4 flex flex-col select-none"
      style={{ overscrollBehavior: 'none', touchAction: 'pan-y' }}>

      <div className="relative flex-1"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}>

        <div
          style={{
            transform: `translateX(${cardTranslateX}px) rotate(${cardRotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            cursor: isDragging ? 'grabbing' : 'grab',
            willChange: 'transform',
            userSelect: 'none',
          }}
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl bg-white"
          onClick={handlePhotoTap}>

          {photos[activePhoto] ? (
            <img src={photos[activePhoto]} alt={currentProfile.name}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-100 to-green-100 flex items-center justify-center">
              <span className="text-6xl font-bold text-red-300">{currentProfile.name[0]}</span>
            </div>
          )}

          {photos.length > 1 && (
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 px-4 pointer-events-none">
              {photos.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i === activePhoto ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}

          <div style={{ opacity: likeOpacity }}
            className="absolute top-8 left-6 border-4 border-green-400 text-green-400 px-4 py-1 rounded-xl rotate-[-20deg] text-2xl font-black pointer-events-none">
            LIKE 💚
          </div>
          <div style={{ opacity: nopeOpacity }}
            className="absolute top-8 right-6 border-4 border-red-400 text-red-400 px-4 py-1 rounded-xl rotate-[20deg] text-2xl font-black pointer-events-none">
            NOPE ❌
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 text-white pointer-events-none">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-3xl font-bold">{currentProfile.name}, {currentProfile.age}</h2>
              {currentProfile.isDemo ? (
                <span className="text-xs bg-gray-500/80 px-2 py-0.5 rounded-full italic">{t.ia}</span>
              ) : (
                <span className="flex items-center gap-1 text-xs bg-green-500/80 px-2 py-0.5 rounded-full">
                  <i className="fa-solid fa-circle text-[6px]"></i> Online
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
                <span key={interest} className="text-xs bg-white/20 px-3 py-1 rounded-full">{interest}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-4 py-5">
        <button onClick={onUndo}
          className="w-12 h-12 rounded-full border-2 border-yellow-100 text-yellow-500 flex items-center justify-center shadow-md bg-white active:scale-95 transition-transform">
          <i className="fa-solid fa-rotate-left text-lg"></i>
        </button>
        <button onClick={() => triggerDislike(currentProfile.id)}
          className="w-18 h-18 rounded-full border-2 border-red-100 text-red-500 flex items-center justify-center shadow-lg bg-white active:scale-95 transition-transform"
          style={{ width: '4.5rem', height: '4.5rem' }}>
          <i className="fa-solid fa-xmark text-3xl"></i>
        </button>
        <button className="w-12 h-12 rounded-full border-2 border-purple-100 text-purple-500 flex items-center justify-center shadow-md bg-white active:scale-95 transition-transform">
          <i className="fa-solid fa-star text-lg"></i>
        </button>
        <button onClick={() => triggerLike(currentProfile)}
          className="w-18 h-18 rounded-full border-2 border-green-100 text-green-500 flex items-center justify-center shadow-lg bg-white active:scale-95 transition-transform"
          style={{ width: '4.5rem', height: '4.5rem' }}>
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
