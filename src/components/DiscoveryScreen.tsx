import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { cloudinaryUrl } from '../services/cloudinaryService';

interface Props {
  profiles: UserProfile[];
  onLike: (profile: UserProfile) => void;
  onDislike: (id: string) => void;
  onUndo: () => void;
  lang?: 'fr' | 'en';
  isPremium?: boolean;
  countryFilter?: string;
  onCountrySearch?: (country: string) => boolean;
  onClearCountryFilter?: () => void;
  onReport?: (profile: UserProfile, reason: string) => void;
  onBlock?: (profile: UserProfile) => void;
  canSuperLike?: () => boolean;
  onSuperLike?: (profile: UserProfile) => void;
  boostActive?: boolean;
  onBoost?: () => boolean;
}

const REPORT_REASONS = ['Faux profil', 'Contenu inapproprié', 'Harcèlement', 'Autre'];

const DiscoveryScreen: React.FC<Props> = ({ profiles, onLike, onDislike, onUndo, lang = 'fr', isPremium = false, countryFilter = '', onCountrySearch, onClearCountryFilter, onReport, onBlock, canSuperLike, onSuperLike, boostActive = false, onBoost }) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState<'like' | 'nope' | 'super' | null>(null);
  const [showCountrySearch, setShowCountrySearch] = useState(false);
  const [countryInput, setCountryInput] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCardMenu, setShowCardMenu] = useState(false);
  const [showReportReasons, setShowReportReasons] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showSuperLikePaywall, setShowSuperLikePaywall] = useState(false);
  const [showBoostPaywall, setShowBoostPaywall] = useState(false);
  const [boostToast, setBoostToast] = useState<string | null>(null);

  const startX = useRef(0);
  const animating = useRef(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchIsHoriz = useRef<boolean | null>(null);

  // rAF pour limiter les re-renders
  const dragXRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const T = {
    fr: {
      noMore: 'Plus de profils', comeback: 'Reviens plus tard !', reload: 'Recharger', ia: 'IA prototype', online: 'En ligne',
      verified: 'Position vérifiée', searchCountry: 'Rechercher un pays', countryPlaceholder: 'Ex: Canada',
      search: 'Chercher', clear: 'Réinitialiser', premiumTitle: '🔒 Fonctionnalité Premium',
      premiumBody: "Passe Premium pour chercher des profils burundais dans n'importe quel pays (Canada, France, Belgique...).",
      premiumClose: 'Compris',
      report: 'Signaler', block: 'Bloquer', cancel: 'Annuler',
      reportTitle: 'Pourquoi signaler ce profil ?',
      blockTitle: 'Bloquer ce profil ?', blockBody: "Cette personne ne pourra plus voir ton profil, ni toi le sien.",
      blockConfirm: 'Bloquer',
      superLikeTitle: '⭐ Plus de Super Like',
      superLikeBody: "Tu as utilisé ton Super Like gratuit du jour. Reviens demain ou passe Premium pour un accès illimité.",
      boostTitle: '⚡ Boost indisponible',
      boostBody: "Tu as déjà utilisé ton Boost gratuit du jour (ou il est encore actif). Reviens demain ou passe Premium pour un accès illimité.",
      boostOn: 'Boost activé pendant 30 minutes ⚡', boostRunning: 'Boost déjà actif ⚡',
    },
    en: {
      noMore: 'No more profiles', comeback: 'Come back later!', reload: 'Reload', ia: 'AI prototype', online: 'Online',
      verified: 'Verified location', searchCountry: 'Search a country', countryPlaceholder: 'E.g. Canada',
      search: 'Search', clear: 'Reset', premiumTitle: '🔒 Premium feature',
      premiumBody: 'Go Premium to search Burundian profiles in any country (Canada, France, Belgium...).',
      premiumClose: 'Got it',
      report: 'Report', block: 'Block', cancel: 'Cancel',
      reportTitle: 'Why are you reporting this profile?',
      blockTitle: 'Block this profile?', blockBody: "This person won't be able to see your profile, or you theirs.",
      blockConfirm: 'Block',
      superLikeTitle: '⭐ No Super Likes left',
      superLikeBody: "You've used your free daily Super Like. Come back tomorrow or go Premium for unlimited access.",
      boostTitle: '⚡ Boost unavailable',
      boostBody: "You've already used your free daily Boost (or it's still active). Come back tomorrow or go Premium for unlimited access.",
      boostOn: 'Boost activated for 30 minutes ⚡', boostRunning: 'Boost already active ⚡',
    }
  };
  const t = T[lang];

  const submitCountrySearch = () => {
    if (!countryInput.trim()) return;
    const ok = onCountrySearch?.(countryInput.trim());
    if (!ok) setShowPaywall(true);
    else setShowCountrySearch(false);
  };

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
    setShowCardMenu(false);
    setShowReportReasons(false);
    setShowBlockConfirm(false);
  };

  const submitReport = (profile: UserProfile, reason: string) => {
    onReport?.(profile, reason);
    setShowReportReasons(false);
    setShowCardMenu(false);
  };

  const confirmBlock = (profile: UserProfile) => {
    onBlock?.(profile);
    setShowBlockConfirm(false);
    setShowCardMenu(false);
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

  const triggerSuperLike = (profile: UserProfile) => {
    if (animating.current) return;
    if (canSuperLike && !canSuperLike()) { setShowSuperLikePaywall(true); return; }
    animating.current = true;
    setSwipeAnim('super');
    setTimeout(() => {
      onSuperLike?.(profile);
      resetCardState();
      animating.current = false;
    }, 350);
  };

  const triggerBoost = () => {
    if (boostActive) { setBoostToast(t.boostRunning); setTimeout(() => setBoostToast(null), 2000); return; }
    const ok = onBoost?.();
    if (ok) { setBoostToast(t.boostOn); setTimeout(() => setBoostToast(null), 2500); }
    else setShowBoostPaywall(true);
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
        {countryFilter && (
          <button onClick={onClearCountryFilter} className="mt-3 text-sm text-gray-400 underline">
            {t.clear} ({countryFilter})
          </button>
        )}
      </div>
    );
  }

  if (!profiles[0] && !swipeAnim) return <div className="h-full bg-white" />;

  const currentProfile = profiles[0];
  const nextProfile = profiles[1];
  if (!currentProfile) return <div className="h-full bg-white" />;

  const photos = currentProfile.images?.length > 0 ? currentProfile.images : [];
  const cardTranslateX = swipeAnim === 'like' ? 600 : swipeAnim === 'nope' ? -600 : dragX;
  const cardTranslateY = swipeAnim === 'super' ? -700 : 0;
  const cardRotation = swipeAnim === 'like' ? 35 : swipeAnim === 'nope' ? -35 : dragX * 0.06;
  const likeOpacity = swipeAnim === 'like' ? 1 : Math.min(1, dragX / 60);
  const nopeOpacity = swipeAnim === 'nope' ? 1 : Math.min(1, -dragX / 60);
  const superOpacity = swipeAnim === 'super' ? 1 : 0;

  return (
    <div className="h-full flex flex-col bg-white select-none">
      {/* Recherche par pays (Premium) */}
      <div className="px-4 pt-3 flex-shrink-0">
        {!showCountrySearch ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => (isPremium ? setShowCountrySearch(true) : setShowPaywall(true))}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-2 rounded-full border border-gray-100"
            >
              <i className="fa-solid fa-globe text-red-400"></i>
              {countryFilter ? `🌍 ${countryFilter}` : t.searchCountry}
              {!isPremium && <i className="fa-solid fa-lock text-[10px] text-yellow-500"></i>}
            </button>
            {countryFilter && (
              <button onClick={onClearCountryFilter} className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={countryInput}
              onChange={e => setCountryInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitCountrySearch()}
              placeholder={t.countryPlaceholder}
              className="flex-1 px-3 py-2 bg-gray-50 rounded-full text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            <button onClick={submitCountrySearch} className="px-3 py-2 bg-red-500 text-white rounded-full text-xs font-medium">{t.search}</button>
            <button onClick={() => setShowCountrySearch(false)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>
        )}
      </div>

      {showPaywall && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowPaywall(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800">{t.premiumTitle}</h3>
            <p className="text-sm text-gray-500">{t.premiumBody}</p>
            <button onClick={() => setShowPaywall(false)} className="mt-2 w-full py-3 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-2xl font-bold">
              {t.premiumClose}
            </button>
          </div>
        </div>
      )}

      {showReportReasons && currentProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowReportReasons(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800">{t.reportTitle}</h3>
            <div className="space-y-2">
              {REPORT_REASONS.map(reason => (
                <button key={reason} onClick={() => submitReport(currentProfile, reason)}
                  className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left text-sm text-gray-700">
                  {reason}
                </button>
              ))}
            </div>
            <button onClick={() => setShowReportReasons(false)} className="w-full py-2 text-sm text-gray-400">{t.cancel}</button>
          </div>
        </div>
      )}

      {showBlockConfirm && currentProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowBlockConfirm(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800">{t.blockTitle}</h3>
            <p className="text-sm text-gray-500">{t.blockBody}</p>
            <button onClick={() => confirmBlock(currentProfile)} className="mt-2 w-full py-3 bg-red-500 text-white rounded-2xl font-bold">
              {t.blockConfirm}
            </button>
            <button onClick={() => setShowBlockConfirm(false)} className="w-full py-2 text-sm text-gray-400">{t.cancel}</button>
          </div>
        </div>
      )}

      <div className="relative flex-1 p-4 pb-0">
        {/* Carte suivante */}
        {nextProfile && (
          <div
            className="absolute inset-4 rounded-3xl overflow-hidden bg-gray-100"
            style={{ transform: 'scale(0.95)', zIndex: 0 }}
          >
            {nextProfile.images?.[0] && (
              <img
                src={cloudinaryUrl(nextProfile.images[0], 750, 1000)}
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
              transform: `translate(${cardTranslateX}px, ${cardTranslateY}px) rotate(${cardRotation}deg)`,
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
                src={cloudinaryUrl(photos[activePhoto], 750, 1000)}
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

            {(onReport || onBlock) && (
              <div className="absolute top-3 right-3">
                <button
                  onClick={() => setShowCardMenu(v => !v)}
                  className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
                >
                  <i className="fa-solid fa-ellipsis"></i>
                </button>
                {showCardMenu && (
                  <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden" style={{ minWidth: 140 }}>
                    {onReport && (
                      <button onClick={() => { setShowReportReasons(true); setShowCardMenu(false); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <i className="fa-solid fa-flag text-orange-500"></i> {t.report}
                      </button>
                    )}
                    {onBlock && (
                      <button onClick={() => { setShowBlockConfirm(true); setShowCardMenu(false); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100">
                        <i className="fa-solid fa-ban"></i> {t.block}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

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
            <div
              style={{ opacity: superOpacity }}
              className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-center pointer-events-none"
            >
              <span className="border-4 border-blue-400 text-blue-400 bg-white/90 px-4 py-1 rounded-xl text-2xl font-black">
                SUPER LIKE ⭐
              </span>
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
                {currentProfile.locationVerified && (
                  <span className="flex items-center gap-1 text-green-300" title={t.verified}>
                    <i className="fa-solid fa-circle-check"></i>
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs line-clamp-2 opacity-80">{currentProfile.bio}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {currentProfile.interests?.slice(0, 3).map(i => (
                  <span key={i} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    {i}
                  </span>
                ))}
              </div>
              {currentProfile.prompts?.[0] && (
                <div className="mt-2 bg-white/15 rounded-xl px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide opacity-70">{currentProfile.prompts[0].question}</p>
                  <p className="text-xs font-medium mt-0.5 line-clamp-2">{currentProfile.prompts[0].answer}</p>
                </div>
              )}
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
          onClick={() => currentProfile && triggerSuperLike(currentProfile)}
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
          onClick={triggerBoost}
          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-md active:scale-95 transition-transform ${boostActive ? 'border-orange-500 bg-orange-500 text-white' : 'border-orange-100 text-orange-500 bg-white'}`}
        >
          <i className="fa-solid fa-bolt text-lg"></i>
        </button>
      </div>

      {boostToast && (
        <div className="fixed bottom-24 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
            {boostToast}
          </div>
        </div>
      )}

      {showSuperLikePaywall && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowSuperLikePaywall(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800">{t.superLikeTitle}</h3>
            <p className="text-sm text-gray-500">{t.superLikeBody}</p>
            <button onClick={() => setShowSuperLikePaywall(false)} className="mt-2 w-full py-3 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-2xl font-bold">
              {t.premiumClose}
            </button>
          </div>
        </div>
      )}

      {showBoostPaywall && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setShowBoostPaywall(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800">{t.boostTitle}</h3>
            <p className="text-sm text-gray-500">{t.boostBody}</p>
            <button onClick={() => setShowBoostPaywall(false)} className="mt-2 w-full py-3 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-2xl font-bold">
              {t.premiumClose}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryScreen;

