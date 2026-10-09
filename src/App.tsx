import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, addDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppScreen, UserProfile, ChatSession } from './types';
import { getCurrentPosition, calculateDistance, reverseGeocode } from './services/locationService';
import { registerPush, notifyUser } from './services/pushService';
import LoginScreen from './components/LoginScreen';
import LegalScreen from './components/LegalScreen';
import SetupScreen from './components/SetupScreen';
import DiscoveryScreen from './components/DiscoveryScreen';
import MessagesScreen from './components/MessagesScreen';
import ProfileScreen from './components/ProfileScreen';
import ChatDetailScreen from './components/ChatDetailScreen';
import LikesScreen from './components/LikesScreen';
import FeedbackScreen from './components/FeedbackScreen';
import InstallBanner from './components/InstallBanner';
import GenderUpdateScreen from './components/GenderUpdateScreen';
import BottomNav from './components/BottomNav';
import ThemeToggle, { Theme } from './components/ThemeToggle';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>((localStorage.getItem('urukundo_lang') as 'fr' | 'en') || 'fr');
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(localStorage.getItem('urukundo_legal_accepted') === 'true');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.DISCOVERY);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [allRealUsers, setAllRealUsers] = useState<UserProfile[]>([]);
  const [countryFilter, setCountryFilter] = useState('');
  const [matches, setMatches] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [needsGenderUpdate, setNeedsGenderUpdate] = useState(false);
  const [theme, setTheme] = useState<Theme>((localStorage.getItem('urukundo_theme') as Theme) || 'light');
  const likesUnsubRef = useRef<(() => void) | null>(null);

  const handleLangSelect = (l: 'fr' | 'en') => {
    setLang(l);
    localStorage.setItem('urukundo_lang', l);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    localStorage.setItem('urukundo_theme', t);
    if (user) updateDoc(doc(db, 'users', user.uid), { theme: t }).catch(() => {});
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setCurrentUser({ ...userData, interests: userData.interests || [], images: userData.images || [] });
          if (userData.lang) setLang(userData.lang);
          if (userData.theme) { setTheme(userData.theme); localStorage.setItem('urukundo_theme', userData.theme); }
          setNeedsSetup(false);
          likesUnsubRef.current?.();
          likesUnsubRef.current = loadLikesCount(firebaseUser.uid);
          registerPush(firebaseUser.uid);
          const userData2 = userDoc.data() as UserProfile;
          updateUserLocation(firebaseUser.uid, userData2.gender);
          // Marquer en ligne
          await updateDoc(doc(db, 'users', firebaseUser.uid), { isOnline: true, lastSeen: Date.now() });
        } else {
          setNeedsSetup(true);
        }
      }
      setAuthLoading(false);
    });
    // Marquer hors ligne quand l'onglet se ferme
    const handleBeforeUnload = async () => {
      if (user) await updateDoc(doc(db, 'users', user.uid), { isOnline: false, lastSeen: Date.now() });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { unsub(); window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, []);

  const updateUserLocation = async (userId: string, gender?: string) => {
    try {
      const coords = await getCurrentPosition();
      const updates: Partial<UserProfile> = { lat: coords.lat, lng: coords.lng };
      try {
        const { city, country } = await reverseGeocode(coords.lat, coords.lng);
        updates.location = `${city}, ${country}`;
        updates.country = country;
        updates.locationVerified = true;
      } catch {}
      await updateDoc(doc(db, 'users', userId), updates);
      setCurrentUser(prev => prev ? { ...prev, ...updates } : prev);
      loadProfiles(userId, coords, gender);
    } catch { loadProfiles(userId, null, gender); }
  };

  const loadProfiles = async (userId: string, coords: { lat: number; lng: number } | null, myGender?: string) => {
    try {
      const [usersSnap, blockedByMeSnap, blockedMeSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'blocks'), where('blockerId', '==', userId))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, 'blocks'), where('blockedId', '==', userId))).catch(() => ({ docs: [] } as any)),
      ]);
      const blockedIds = new Set<string>([
        ...blockedByMeSnap.docs.map((d: any) => d.data().blockedId),
        ...blockedMeSnap.docs.map((d: any) => d.data().blockerId),
      ]);
      let realUsers: UserProfile[] = [];
      usersSnap.forEach(d => {
        const data = d.data() as UserProfile & { lat?: number; lng?: number };
        if (data.id === userId) return;
        if (data.hidden) return;
        if (blockedIds.has(data.id)) return;
        let distance: number | undefined;
        if (coords && data.lat && data.lng) distance = calculateDistance(coords.lat, coords.lng, data.lat, data.lng);
        realUsers.push({ ...data, interests: data.interests || [], images: data.images || [], distance });
      });
      const now = Date.now();
      realUsers.sort((a, b) => {
        const aBoost = a.boostedUntil && a.boostedUntil > now ? 1 : 0;
        const bBoost = b.boostedUntil && b.boostedUntil > now ? 1 : 0;
        if (aBoost !== bBoost) return bBoost - aBoost;
        return (a.distance || 9999) - (b.distance || 9999);
      });
      setAllRealUsers(realUsers);
    } catch { setAllRealUsers([]); }
  };

  // Profils près de chez soi en premier, puis le reste de la diaspora.
  // Le filtre par pays (recherche premium) et les préférences de découverte
  // (âge, distance, genre) s'appliquent au-dessus de ce tri.
  useEffect(() => {
    const myGender = currentUser?.gender;
    const settings = currentUser?.settings;
    const settingsGender = settings?.gender === 'hommes' ? 'homme' : settings?.gender === 'femmes' ? 'femme' : settings?.gender === 'tous' ? null : undefined;
    const lookingForGender = settingsGender !== undefined ? settingsGender : (myGender === 'homme' ? 'femme' : myGender === 'femme' ? 'homme' : null);

    let filteredReal = lookingForGender ? allRealUsers.filter(u => !u.gender || u.gender === lookingForGender) : allRealUsers;

    if (settings) {
      filteredReal = filteredReal.filter(u => u.age === undefined || (u.age >= settings.ageMin && u.age <= settings.ageMax));
      if (settings.distance < 500) {
        filteredReal = filteredReal.filter(u => u.distance === undefined || u.distance <= settings.distance);
      }
    }

    if (countryFilter) {
      const needle = countryFilter.trim().toLowerCase();
      filteredReal = filteredReal.filter(u => (u.country || u.location || '').toLowerCase().includes(needle));
    }

    setProfiles(filteredReal);
  }, [allRealUsers, countryFilter, currentUser?.gender, currentUser?.settings]);

  const handleCountrySearch = (country: string): boolean => {
    if (!currentUser?.isPremium) return false;
    setCountryFilter(country.trim());
    return true;
  };

  const clearCountryFilter = () => setCountryFilter('');

  const loadLikesCount = (userId: string) => {
    const q = query(collection(db, 'likes'), where('toUserId', '==', userId));
    return onSnapshot(q, snapshot => setLikesCount(snapshot.size), () => {});
  };

  const matchDocId = (a: string, b: string) => [a, b].sort().join('_');

  const createMatch = async (myUid: string, partner: UserProfile) => {
    const matchId = matchDocId(myUid, partner.id);
    await setDoc(doc(db, 'matches', matchId), { users: [myUid, partner.id], createdAt: serverTimestamp() }, { merge: true });
    const name = currentUser?.name || (lang === 'fr' ? 'Quelqu\'un' : 'Someone');
    notifyUser(partner.id, lang === 'fr' ? 'Nouveau match ! 🇧🇮' : 'New match! 🇧🇮',
      lang === 'fr' ? `${name} et toi avez matché sur Urukundo` : `You and ${name} matched on Urukundo`);
  };

  // Écoute en temps réel des matchs persistés (survit aux rechargements,
  // et se met à jour tout seul si l'autre personne match pendant que l'app est ouverte).
  useEffect(() => {
    if (!user) { setMatches([]); return; }
    const q = query(collection(db, 'matches'), where('users', 'array-contains', user.uid));
    const unsub = onSnapshot(q, async (snapshot) => {
      const sessions = await Promise.all(snapshot.docs.map(async (d): Promise<ChatSession | null> => {
        const data = d.data() as any;
        const partnerId = (data.users as string[]).find(id => id !== user.uid);
        if (!partnerId) return null;
        let partner: UserProfile | undefined;
        try {
          const pSnap = await getDoc(doc(db, 'users', partnerId));
          if (pSnap.exists()) partner = pSnap.data() as UserProfile;
        } catch {}
        if (!partner) return null;
        const previewText = data.lastMessageText || (lang === 'fr' ? `C'est un match ! Amahoro ! 🇧🇮` : `It's a match! Amahoro! 🇧🇮`);
        const previewSenderId = data.lastMessageSenderId || partner.id;
        const previewTime = data.lastMessageAt?.toMillis?.() || data.createdAt?.toMillis?.() || Date.now();
        return { id: d.id, partner, messages: [{ id: 'preview', senderId: previewSenderId, text: previewText, timestamp: previewTime }] };
      }));
      const valid = sessions.filter((s): s is ChatSession => s !== null);
      valid.sort((a, b) => (b.messages[0]?.timestamp || 0) - (a.messages[0]?.timestamp || 0));
      setMatches(valid);
    }, () => setMatches([]));
    return () => unsub();
  }, [user, lang]);

  const handleProfileSetupComplete = async () => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        setCurrentUser({ ...userData, interests: userData.interests || [], images: userData.images || [] });
        setNeedsSetup(false);
        likesUnsubRef.current?.();
        likesUnsubRef.current = loadLikesCount(user.uid);
        registerPush(user.uid);
        updateUserLocation(user.uid);
      }
    }
  };

  const refillProfiles = (prev: UserProfile[], removedId: string): UserProfile[] =>
    prev.filter(p => p.id !== removedId);

  const canSuperLike = (): boolean => {
    if (!currentUser) return false;
    if (currentUser.isPremium) return true;
    const last = currentUser.lastSuperLikeAt;
    return !last || Date.now() - last > 24 * 60 * 60 * 1000;
  };

  const handleSuperLike = (profile: UserProfile) => {
    if (!user || !currentUser) return;
    const now = Date.now();
    setCurrentUser(prev => prev ? { ...prev, lastSuperLikeAt: now } : prev);
    updateDoc(doc(db, 'users', user.uid), { lastSuperLikeAt: now }).catch(() => {});

    const alreadyMatched = matches.some(m => m.partner.id === profile.id);
    if (!alreadyMatched) {
      addDoc(collection(db, 'likes'), { fromUserId: user.uid, toUserId: profile.id, timestamp: serverTimestamp(), type: 'super' }).catch(() => {});
      (async () => {
        try {
          const q = query(collection(db, 'likes'), where('fromUserId', '==', profile.id), where('toUserId', '==', user.uid));
          const snap = await getDocs(q);
          if (!snap.empty) await createMatch(user.uid, profile);
        } catch {}
      })();
    }
    setProfiles(prev => refillProfiles(prev, profile.id));
  };

  const handleBoost = (): boolean => {
    if (!user || !currentUser) return false;
    if (currentUser.boostedUntil && currentUser.boostedUntil > Date.now()) return false;
    const last = currentUser.lastBoostAt;
    const allowed = currentUser.isPremium || !last || Date.now() - last > 24 * 60 * 60 * 1000;
    if (!allowed) return false;
    const now = Date.now();
    const boostedUntil = now + 30 * 60 * 1000;
    setCurrentUser(prev => prev ? { ...prev, lastBoostAt: now, boostedUntil } : prev);
    updateDoc(doc(db, 'users', user.uid), { lastBoostAt: now, boostedUntil }).catch(() => {});
    return true;
  };

  const handleLike = async (profile: UserProfile) => {
    if (user) {
      const alreadyMatched = matches.some(m => m.partner.id === profile.id);
      if (!alreadyMatched) {
        addDoc(collection(db, 'likes'), { fromUserId: user.uid, toUserId: profile.id, timestamp: serverTimestamp() }).catch(() => {});
        try {
          // Match réel seulement si cette personne t'a déjà liké en retour.
          const q = query(collection(db, 'likes'), where('fromUserId', '==', profile.id), where('toUserId', '==', user.uid));
          const snap = await getDocs(q);
          if (!snap.empty) await createMatch(user.uid, profile);
        } catch {}
      }
    }
    setProfiles(prev => refillProfiles(prev, profile.id));
  };

  const handleDislike = (profileId: string) => setProfiles(prev => prev.filter(p => p.id !== profileId));
  const handleUndo = () => { if (user) updateUserLocation(user.uid); };

  const handleBlock = async (profile: UserProfile) => {
    setProfiles(prev => prev.filter(p => p.id !== profile.id));
    setAllRealUsers(prev => prev.filter(p => p.id !== profile.id));
    if (currentScreen === AppScreen.CHAT) { setActiveChat(null); setCurrentScreen(AppScreen.MESSAGES); }
    if (!user) return;
    try {
      await setDoc(doc(db, 'blocks', `${user.uid}_${profile.id}`), { blockerId: user.uid, blockedId: profile.id, timestamp: serverTimestamp() });
      await deleteDoc(doc(db, 'matches', matchDocId(user.uid, profile.id)));
    } catch {}
  };

  const handleReport = async (profile: UserProfile, reason: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'reports'), { reporterId: user.uid, reportedId: profile.id, reason, timestamp: serverTimestamp() });
    } catch {}
  };
  const openChat = (session: ChatSession) => { setActiveChat(session); setCurrentScreen(AppScreen.CHAT); };
  const handleMatch = async (partner: UserProfile) => {
    if (user) await createMatch(user.uid, partner).catch(() => {});
    setCurrentScreen(AppScreen.MESSAGES);
    setLikesCount(prev => Math.max(0, prev - 1));
  };

  const handleSignOut = async () => {
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { isOnline: false, lastSeen: Date.now() });
    }
    likesUnsubRef.current?.();
    likesUnsubRef.current = null;
    await signOut(auth);
    setUser(null); setCurrentUser(null); setProfiles([]); setMatches([]);
    setShowFeedback(false);
  };

  const handleAcceptLegal = () => { localStorage.setItem('urukundo_legal_accepted', 'true'); setHasAcceptedLegal(true); };

  let content: React.ReactNode;

  if (authLoading) {
    content = (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center"><div className="text-4xl mb-3">🇧🇮</div><div className="text-red-500 font-bold text-xl">URUKUNDO</div><div className="text-gray-400 text-sm mt-2">{lang === 'fr' ? 'Chargement...' : 'Loading...'}</div></div>
      </div>
    );
  } else if (!hasAcceptedLegal) {
    content = <LegalScreen onAccept={handleAcceptLegal} />;
  } else if (!user) {
    content = <LoginScreen lang={lang} onLangSelect={handleLangSelect} />;
  } else if (needsSetup) {
    content = <SetupScreen userId={user.uid} displayName={user.displayName || ''} photoURL={user.photoURL || ''} onComplete={handleProfileSetupComplete} lang={lang} />;
  } else {
    content = (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-2xl relative overflow-hidden border-x border-gray-100">
      {showFeedback && user && (
        <FeedbackScreen userId={user.uid} lang={lang} onConfirm={handleSignOut} onCancel={() => setShowFeedback(false)} />
      )}

      <InstallBanner lang={lang} />
      <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-gray-100 z-10 flex-shrink-0">
        <h1 className="text-2xl font-black tracking-tighter" style={{ color: '#ce1126' }}>
          URUKUNDO <span className="text-gray-300 font-light">| 🇧🇮</span>
        </h1>
        <div className="flex gap-1">
          <button onClick={() => handleLangSelect('fr')} className={`px-2 py-1 rounded-lg text-xs font-medium ${lang === 'fr' ? 'bg-red-500 text-white' : 'text-gray-400'}`}>FR</button>
          <button onClick={() => handleLangSelect('en')} className={`px-2 py-1 rounded-lg text-xs font-medium ${lang === 'en' ? 'bg-red-500 text-white' : 'text-gray-400'}`}>EN</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative bg-gray-50/50">
        {currentScreen === AppScreen.DISCOVERY && (
          <DiscoveryScreen
            profiles={profiles}
            onLike={handleLike}
            onDislike={handleDislike}
            onUndo={handleUndo}
            lang={lang}
            isPremium={!!currentUser?.isPremium}
            countryFilter={countryFilter}
            onCountrySearch={handleCountrySearch}
            onClearCountryFilter={clearCountryFilter}
            onReport={handleReport}
            onBlock={handleBlock}
            canSuperLike={canSuperLike}
            onSuperLike={handleSuperLike}
            boostActive={!!(currentUser?.boostedUntil && currentUser.boostedUntil > Date.now())}
            onBoost={handleBoost}
          />
        )}
        {currentScreen === AppScreen.LIKES && user && currentUser && <LikesScreen currentUserId={user.uid} currentUserName={currentUser.name} onMatch={handleMatch} />}
        {currentScreen === AppScreen.MESSAGES && <MessagesScreen matches={matches} onSelectChat={openChat} />}
        {currentScreen === AppScreen.PROFILE && currentUser && <ProfileScreen user={currentUser} setUser={setCurrentUser} onSignOut={() => setShowFeedback(true)} matches={matches} lang={lang} />}
        {currentScreen === AppScreen.CHAT && activeChat && user && <ChatDetailScreen session={activeChat} currentUserId={user.uid} onBack={() => setCurrentScreen(AppScreen.MESSAGES)} lang={lang} onReport={handleReport} onBlock={handleBlock} />}
      </main>

      {currentScreen !== AppScreen.CHAT && <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} matches={matches} likesCount={likesCount} />}
    </div>
    );
  }

  return (
    <>
      {content}
      <ThemeToggle theme={theme} onChange={handleThemeChange} />
    </>
  );
};

export default App;
