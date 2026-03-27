import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppScreen, UserProfile, ChatSession } from './types';
import { getCurrentPosition, calculateDistance } from './services/locationService';
import { calculateCompatibility, isMatch } from './services/matchingService';
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

const DEMO_PROFILES: UserProfile[] = [
  { id: 'demo1', name: 'Amina', age: 23, gender: 'femme', bio: 'Amahoro ! Étudiante en droit à Bujumbura. 🇧🇮', location: 'Bujumbura, Burundi', images: ['https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&h=800&fit=crop&crop=face'], interests: ['Danse', 'Droit', 'Culture', 'Musique'], distance: 2, isDemo: true },
  { id: 'demo3', name: 'Grace', age: 25, gender: 'femme', bio: 'Infirmière à Paris. La musique africaine est ma passion.', location: 'Paris, France', images: ['https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=600&h=800&fit=crop&crop=face'], interests: ['Musique', 'Santé', 'Voyage', 'Mode'], distance: 200, isDemo: true },
  { id: 'demo5', name: 'Sandrine', age: 26, gender: 'femme', bio: 'Comptable à Gitega. Fan de football. 🇧🇮', location: 'Gitega, Burundi', images: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop&crop=face'], interests: ['Football', 'Nature', 'Lecture', 'Voyage'], distance: 45, isDemo: true },
  { id: 'demo7', name: 'Clarisse', age: 24, gender: 'femme', bio: 'Enseignante à Bujumbura. 🌍', location: 'Bujumbura, Burundi', images: ['https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&h=800&fit=crop&crop=face'], interests: ['Éducation', 'Culture', 'Lecture', 'Danse'], distance: 5, isDemo: true },
  { id: 'demo2', name: 'Jean-Pierre', age: 28, gender: 'homme', bio: 'Ingénieur à Bruxelles, fier Burundais.', location: 'Bruxelles, Belgique', images: ['https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=600&h=800&fit=crop&crop=face'], interests: ['Tech', 'Football', 'Voyage', 'Cuisine'], distance: 150, isDemo: true },
  { id: 'demo4', name: 'Emmanuel', age: 31, gender: 'homme', bio: 'Entrepreneur à Montréal. Burundais dans l\'âme.', location: 'Montréal, Canada', images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop&crop=face'], interests: ['Business', 'Cuisine', 'Sport', 'Musique'], distance: 500, isDemo: true },
  { id: 'demo6', name: 'Patrick', age: 29, gender: 'homme', bio: 'Musicien à Nairobi. Amahoro !', location: 'Nairobi, Kenya', images: ['https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=600&h=800&fit=crop&crop=face'], interests: ['Musique', 'Art', 'Culture', 'Voyage'], distance: 800, isDemo: true },
  { id: 'demo8', name: 'Thierry', age: 33, gender: 'homme', bio: 'Médecin à Londres.', location: 'Londres, UK', images: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop&crop=face'], interests: ['Santé', 'Sport', 'Voyage', 'Cinéma'], distance: 300, isDemo: true },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>((localStorage.getItem('urukundo_lang') as 'fr' | 'en') || 'fr');
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(localStorage.getItem('urukundo_legal_accepted') === 'true');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.DISCOVERY);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [needsGenderUpdate, setNeedsGenderUpdate] = useState(false);

  const handleLangSelect = (l: 'fr' | 'en') => {
    setLang(l);
    localStorage.setItem('urukundo_lang', l);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setCurrentUser(userData);
          if (userData.lang) setLang(userData.lang);
          setNeedsSetup(false);
          loadLikesCount(firebaseUser.uid);
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
      await updateDoc(doc(db, 'users', userId), { lat: coords.lat, lng: coords.lng });
      loadProfiles(userId, coords, gender);
    } catch { loadProfiles(userId, null, gender); }
  };

  const loadProfiles = async (userId: string, coords: { lat: number; lng: number } | null, myGender?: string) => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      let realUsers: UserProfile[] = [];
      snapshot.forEach(d => {
        const data = d.data() as UserProfile & { lat?: number; lng?: number };
        if (data.id === userId) return;
        let distance: number | undefined;
        if (coords && data.lat && data.lng) distance = calculateDistance(coords.lat, coords.lng, data.lat, data.lng);
        realUsers.push({ ...data, distance });
      });
      realUsers.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));

      // Filtre par genre — hétérosexuel
      const lookingForGender = myGender === "homme" ? "femme" : myGender === "femme" ? "homme" : null;
      const filteredReal = lookingForGender ? realUsers.filter(u => !u.gender || u.gender === lookingForGender) : realUsers;
      const filteredDemo = lookingForGender ? DEMO_PROFILES.filter(d => d.gender === lookingForGender) : DEMO_PROFILES;

      setProfiles([...filteredReal, ...filteredDemo]);
    } catch { setProfiles(DEMO_PROFILES); }
  };

  const loadLikesCount = async (userId: string) => {
    try {
      const q = query(collection(db, 'likes'), where('toUserId', '==', userId));
      const snapshot = await getDocs(q);
      setLikesCount(snapshot.size);
    } catch {}
  };

  const handleProfileSetupComplete = async () => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setCurrentUser(userDoc.data() as UserProfile);
        setNeedsSetup(false);
        loadLikesCount(user.uid);
        updateUserLocation(user.uid);
      }
    }
  };

  const handleLike = (profile: UserProfile) => {
    if (user) {
      addDoc(collection(db, 'likes'), { fromUserId: user.uid, toUserId: profile.id, timestamp: serverTimestamp() }).catch(() => {});
    }
    const compatibility = currentUser ? calculateCompatibility(currentUser, profile) : 50;
    if (isMatch(compatibility)) {
      const newSession: ChatSession = { id: `session-${Date.now()}`, partner: profile, messages: [{ id: 'm1', senderId: profile.id, text: lang === 'fr' ? `C'est un match ! Amahoro ${currentUser?.name} ! 🇧🇮` : `It's a match! Amahoro ${currentUser?.name}! 🇧🇮`, timestamp: Date.now() }] };
      setMatches(prev => [newSession, ...prev]);
    }
    setProfiles(prev => prev.filter(p => p.id !== profile.id));
  };

  const handleDislike = (profileId: string) => setProfiles(prev => prev.filter(p => p.id !== profileId));
  const handleUndo = () => { if (user) updateUserLocation(user.uid); };
  const openChat = (session: ChatSession) => { setActiveChat(session); setCurrentScreen(AppScreen.CHAT); };
  const handleMatch = (session: ChatSession) => { setMatches(prev => [session, ...prev]); setCurrentScreen(AppScreen.MESSAGES); setLikesCount(prev => Math.max(0, prev - 1)); };

  const handleSignOut = async () => {
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { isOnline: false, lastSeen: Date.now() });
    }
    await signOut(auth);
    setUser(null); setCurrentUser(null); setProfiles([]); setMatches([]);
    setShowFeedback(false);
  };

  const handleAcceptLegal = () => { localStorage.setItem('urukundo_legal_accepted', 'true'); setHasAcceptedLegal(true); };

  if (authLoading) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="text-center"><div className="text-4xl mb-3">🇧🇮</div><div className="text-red-500 font-bold text-xl">URUKUNDO</div><div className="text-gray-400 text-sm mt-2">{lang === 'fr' ? 'Chargement...' : 'Loading...'}</div></div>
    </div>
  );

  if (!hasAcceptedLegal) return <LegalScreen onAccept={handleAcceptLegal} />;
  if (!user) return <LoginScreen lang={lang} onLangSelect={handleLangSelect} />;
  if (needsSetup) return <SetupScreen userId={user.uid} displayName={user.displayName || ''} photoURL={user.photoURL || ''} onComplete={handleProfileSetupComplete} lang={lang} />;

  return (
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
        {currentScreen === AppScreen.DISCOVERY && <DiscoveryScreen profiles={profiles} onLike={handleLike} onDislike={handleDislike} onUndo={handleUndo} />}
        {currentScreen === AppScreen.LIKES && user && currentUser && <LikesScreen currentUserId={user.uid} currentUserName={currentUser.name} onMatch={handleMatch} />}
        {currentScreen === AppScreen.MESSAGES && <MessagesScreen matches={matches} onSelectChat={openChat} />}
        {currentScreen === AppScreen.PROFILE && currentUser && <ProfileScreen user={currentUser} setUser={setCurrentUser} onSignOut={() => setShowFeedback(true)} />}
        {currentScreen === AppScreen.CHAT && activeChat && user && <ChatDetailScreen session={activeChat} currentUserId={user.uid} onBack={() => setCurrentScreen(AppScreen.MESSAGES)} lang={lang} />}
      </main>

      {currentScreen !== AppScreen.CHAT && <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} matches={matches} likesCount={likesCount} />}
    </div>
  );
};

export default App;
