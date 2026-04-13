import React, { useState, useRef, useEffect } from 'react';
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

  const startX = useRef(0);
  const animating = useRef(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchIsHoriz = useRef<boolean | null>(null);

  // rAF pour limiter les re-renders
  const dragXRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const T = {
    fr: { noMore: 'Plus de profils', comeback: 'Reviens plus tard !', reload: 'Recharger', ia: 'IA prototype', online: 'En ligne' },
    en: { noMore: 'No more profiles', comeback: 'Come back later!', reload: 'Reload', ia: 'AI prototype', online: 'Online' }
  };
  const t = T[lang];

  const scheduleDragUpdate = (value: number) => {
    dragXRef.current = value;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      setDragX(dragXRef.current);
      frameRef.current = null;
    });
  };

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const resetCardState = () => {
    setActivePhoto(0);
    setSwipeAnim(null);
    setDragX(0);
    dragXRef.current = 0;
  };

  const triggerLike = (profile: UserProfile) => {
    if (animating.current) return;
    animating.current = true;
    setSwipeAnim('like');
    setTimeout(() => {
      onLike(profile);
      resetCardState();
      animating.current = false;
    }, 350);
  };

  const triggerDislike = (id: string) => {
    if (animating.current) return;
    animating.current = true;
    setSwipeAnim('nope');
    setTimeout(() => {
      onDislike(id);
      resetCardState();
      animating.current = false;
    }, 350);
  };

  // Souris (desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX.current;
    scheduleDragUpdate(dx);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (!profiles[0]) {
      resetCardState();
      return;
    }
    if (dragXRef.current > 80) triggerLike(profiles[0]);
    else if (dragXRef.current < -80) triggerDislike(profiles[0].id);
    else resetCardState();
  };

  // Touch (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchIsHoriz.current = null;
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX.current;
    const dy = touch.clientY - touchStartY.current;

    if (touchIsHoriz.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touchIsHoriz.current = Math.abs(dx) > Math.abs(dy);
    }

    if (touchIsHoriz.current === true) {
      // On gère le swipe horizontal → on bloque le scroll
      e.preventDefault();
      setIsDragging(true);
      scheduleDragUpdate(dx);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);
    if (!touchIsHoriz.current || !profiles[0]) {
      resetCardState();
      touchIsHoriz.current = null;
      return;
    }
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX.current;
    if (dx > 80) triggerLike(profiles[0]);
    else if (dx < -80) triggerDislike(profiles[0].id);
    else resetCardState();
    touchIsHoriz.current = null;
  };

  // Écran vide
  if (profiles.length === 0 && !swipeAnim) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center bg-white">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <i className="fa-solid fa-fire text-gray-300 text-4xl"></i>
        </div>
        <h3 className="text-xl font-semibold text-gray-800">{t.noMore}</h3>
        <p className="text-gray-500 mt-2">{t.comeback}</p>
        <button
          onClick={onUndo}
          className="mt-6 px-6 py-3 rounded-full border-2 border-red-500 text-red-500 font-medium flex items-center gap-2"
        >
          <i className="fa-solid fa-rotate-left"></i> {t.reload}
        </button>
      </div>
    );
  }

  if (!profiles[0] && !swipeAnim) return <div className="h-full bg-white" />;

  const currentProfile = profiles[0];
  const nextProfile = profiles[1];
  if (!currentProfile) return <div className="h-full bg-white" />;

  const photos = currentProfile.images?.length > 0 ? currentProfile.images : [];
  const cardTranslateX = swipeAnim === 'like' ? 600 : swipeAnim === 'nope' ? -600 : dragX;
  const cardRotation = swipeAnim === 'like' ? 35 : swipeAnim === 'nope' ? -35 : dragX * 0.06;
  const likeOpacity = swipeAnim === 'like' ? 1 : Math.min(1, dragX / 60);
  const nopeOpacity = swipeAnim === 'nope' ? 1 : Math.min(1, -dragX / 60);

  return (
    <div className="h-full flex flex-col bg-white select-none">
      <div className="relative flex-1 p-4 pb-0">
        {/* Carte suivante */}
        {nextProfile && (
          <div
            className="absolute inset-4 rounded-3xl overflow-hidden bg-gray-100"
            style={{ transform: 'scale(0.95)', zIndex: 0 }}
          >
            {nextProfile.images?.[0] && (
              <img
                src={nextProfile.images[0]}
                loading="lazy"
                className="w-full h-full object-cover opacity-60"
                alt=""
              />
            )}
          </div>
        )}

        {/* Carte principale */}
        <div
          className="absolute inset-4 z-10"
          style={{ touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            style={{
              transform: `translateX(${cardTranslateX}px) rotate(${cardRotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              willChange: 'transform',
              height: '100%',
              borderRadius: '1.5rem',
              overflow: 'hidden',
              background: 'white',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          >
            {photos[activePhoto] ? (
              <img
                src={photos[activePhoto]}
                loading="lazy"
                alt={currentProfile.name}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-100 to-green-100 flex items-center justify-center">
                <span className="text-6xl font-bold text-red-300">{currentProfile.name[0]}</span>
              </div>
            )}

            {photos.length > 1 && (
              <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 px-4 pointer-events-none">
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i === activePhoto ? 'bg-white' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}

            {/* Zones tap photo */}
            <div className="absolute inset-0 flex">
              <div
                className="flex-1"
                onClick={() => setActivePhoto(p => Math.max(0, p - 1))}
              />
              <div
                className="flex-1"
                onClick={() => setActivePhoto(p => Math.min(photos.length - 1, p + 1))}
              />
            </div>

            <div
              style={{ opacity: likeOpacity }}
              className="absolute top-8 left-6 border-4 border-green-400 text-green-400 px-4 py-1 rounded-xl rotate-[-20deg] text-2xl font-black pointer-events-none"
            >
              LIKE 💚
            </div>
            <div
              style={{ opacity: nopeOpacity }}
              className="absolute top-8 right-6 border-4 border-red-400 text-red-400 px-4 py-1 rounded-xl rotate-[20deg] text-2xl font-black pointer-events-none"
            >
              NOPE ❌
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 text-white pointer-events-none">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-2xl font-bold">
                  {currentProfile.name}, {currentProfile.age}
                </h2>
                {currentProfile.isDemo ? (
                  <span className="text-xs bg-gray-500/80 px-2 py-0.5 rounded-full italic">{t.ia}</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs bg-green-500/80 px-2 py-0.5 rounded-full">
                    <i className="fa-solid fa-circle text-[6px]"></i> {t.online}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 opacity-90 text-xs">
                <i className="fa-solid fa-location-dot"></i>
                <span>
                  {currentProfile.location}
                  {currentProfile.distance !== undefined ? ` • ${currentProfile.distance} km` : ''}
                </span>
              </div>
              <p className="mt-1 text-xs line-clamp-2 opacity-80">{currentProfile.bio}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {currentProfile.interests?.slice(0, 3).map(i => (
                  <span key={i} className="text-xs bg.white/20 px-2 py-0.5 rounded-full">
                    {i}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex justify-center items-center gap-4 py-4 px-4 bg-white">
        <button
          onClick={onUndo}
          className="w-12 h-12 rounded-full border-2 border-yellow-100 text-yellow-500 flex items-center justify-center shadow-md bg-white active:scale-95 transition-transform"
        >
          <i className="fa-solid fa-rotate-left text-lg"></i>
        </button>
        <button
          onClick={() => currentProfile && triggerDislike(currentProfile.id)}
          style={{ width: '4rem', height: '4rem' }}
          className="rounded-full border-2 border-red-100 text-red-500 flex items-center justify-center shadow-lg bg-white active:scale-95 transition-transform"
        >
          <i className="fa-solid fa-xmark text-2xl"></i>
        </button>
        <button
          className="w-12 h-12 rounded-full border-2 border-purple-100 text-purple-500 flex items-center justify-center shadow-md bg-white active:scale-95 transition-transform"
        >
          <i className="fa-solid fa-star text-lg"></i>
        </button>
        <button
          onClick={() => currentProfile && triggerLike(currentProfile)}
          style={{ width: '4rem', height: '4rem' }}
          className="rounded-full border-2 border-green-100 text-green-500 flex items-center justify-center shadow-lg bg-white active:scale-95 transition-transform"
        >
          <i className="fa-solid fa-heart text-2xl"></i>
        </button>
        <button
          className="w-12 h-12 rounded-full border-2 border-orange-100 text-orange-500 flex items-center justify-center shadow-md bg-white active:scale-95 transition-transform"
        >
          <i className="fa-solid fa-bolt text-lg"></i>
        </button>
      </div>
    </div>
  );
};

export default DiscoveryScreen;

