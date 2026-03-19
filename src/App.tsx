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
import BottomNav from './components/BottomNav';

const DEMO_PROFILES: UserProfile[] = [
  {
    id: 'demo1',
    name: 'Amina',
    age: 23,
    bio: 'Amahoro ! Étudiante en droit à Bujumbura. J\'aime la danse traditionnelle et la culture burundaise. 🇧🇮',
    location: 'Bujumbura, Burundi',
    images: ['https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&h=800&fit=crop&crop=face'],
    interests: ['Danse', 'Droit', 'Culture', 'Musique'],
    distance: 2,
  },
  {
    id: 'demo2',
    name: 'Jean-Pierre',
    age: 28,
    bio: 'Ingénieur à Bruxelles, fier Burundais de la diaspora. Je cherche une connexion sincère. Amahoro !',
    location: 'Bruxelles, Belgique',
    images: ['https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=600&h=800&fit=crop&crop=face'],
    interests: ['Tech', 'Football', 'Voyage', 'Cuisine'],
    distance: 150,
  },
  {
    id: 'demo3',
    name: 'Grace',
    age: 25,
    bio: 'Infirmière à Paris. La musique africaine est ma passion. Je cherche quelqu\'un de sincère et respectueux.',
    location: 'Paris, France',
    images: ['https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=600&h=800&fit=crop&crop=face'],
    interests: ['Musique', 'Santé', 'Voyage', 'Mode'],
    distance: 200,
  },
  {
    id: 'demo4',
    name: 'Emmanuel',
    age: 31,
    bio: 'Entrepreneur à Montréal. Burundais dans l\'âme, citoyen du monde. J\'adore cuisiner les plats burundais.',
    location: 'Montréal, Canada',
    images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop&crop=face'],
    interests: ['Business', 'Cuisine', 'Sport', 'Musique'],
    distance: 500,
  },
  {
    id: 'demo5',
    name: 'Sandrine',
    age: 26,
    bio: 'Comptable à Gitega. Fan de football et de randonnée. Je cherche quelqu\'un de sérieux. 🇧🇮',
    location: 'Gitega, Burundi',
    images: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop&crop=face'],
    interests: ['Football', 'Nature', 'Lecture', 'Voyage'],
    distance: 45,
  },
  {
    id: 'demo6',
    name: 'Patrick',
    age: 29,
    bio: 'Musicien à Nairobi. Je joue de la guitare et du tam-tam. Amahoro à tous les Burundais du monde !',
    location: 'Nairobi, Kenya',
    images: ['https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=600&h=800&fit=crop&crop=face'],
    interests: ['Musique', 'Art', 'Culture', 'Voyage'],
    distance: 800,
  },
  {
    id: 'demo7',
    name: 'Clarisse',
    age: 24,
    bio: 'Enseignante à Bujumbura. J\'aime partager la culture burundaise et apprendre des autres. 🌍',
    location: 'Bujumbura, Burundi',
    images: ['https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&h=800&fit=crop&crop=face'],
    interests: ['Éducation', 'Culture', 'Lecture', 'Danse'],
    distance: 5,
  },
  {
    id: 'demo8',
    name: 'Thierry',
    age: 33,
    bio: 'Médecin à Londres. Burundais de la diaspora depuis 10 ans. Je cherche une âme sœur burundaise.',
    location: 'Londres, UK',
    images: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop&crop=face'],
    interests: ['Santé', 'Sport', 'Voyage', 'Cinéma'],
    distance: 300,
  },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(
    localStorage.getItem('urukundo_legal_accepted') === 'true'
  );
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.DISCOVERY);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data() as UserProfile);
          setNeedsSetup(false);
          loadLikesCount(firebaseUser.uid);
          updateUserLocation(firebaseUser.uid);
        } else {
          setNeedsSetup(true);
        }
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const updateUserLocation = async (userId: string) => {
    try {
      const coords = await getCurrentPosition();
      await updateDoc(doc(db, 'users', userId), { lat: coords.lat, lng: coords.lng });
      loadProfiles(userId, coords);
    } catch {
      loadProfiles(userId, null);
    }
  };

  const loadProfiles = async (userId: string, coords: { lat: number; lng: number } | null) => {
    try {
      const q = query(collection(db, 'users'), where('id', '!=', userId));
      const snapshot = await getDocs(q);
      let realUsers: UserProfile[] = [];
      snapshot.forEach(d => {
        const data = d.data() as UserProfile & { lat?: number; lng?: number };
        let distance: number | undefined;
        if (coords && data.lat && data.lng) {
          distance = calculateDistance(coords.lat, coords.lng, data.lat, data.lng);
        }
        realUsers.push({ ...data, distance });
      });
      realUsers.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
      const allProfiles = realUsers.length > 0
        ? [...realUsers, ...DEMO_PROFILES.filter(d => !realUsers.find(r => r.id === d.id))]
        : DEMO_PROFILES;
      setProfiles(allProfiles);
    } catch {
      setProfiles(DEMO_PROFILES);
    }
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

  const handleLike = async (profile: UserProfile) => {
    if (user) {
      try {
        await addDoc(collection(db, 'likes'), {
          fromUserId: user.uid,
          toUserId: profile.id,
          timestamp: serverTimestamp(),
        });
      } catch {}
    }
    const compatibility = currentUser ? calculateCompatibility(currentUser, profile) : 50;
    const matched = isMatch(compatibility);
    if (matched) {
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        partner: profile,
        messages: [{ id: 'm1', senderId: profile.id, text: `C'est un match ! Amahoro ${currentUser?.name} ! 🇧🇮`, timestamp: Date.now() }],
      };
      setMatches(prev => [newSession, ...prev]);
    }
    setProfiles(prev => prev.filter(p => p.id !== profile.id));
  };

  const handleDislike = (profileId: string) => {
    setProfiles(prev => prev.filter(p => p.id !== profileId));
  };

  const openChat = (session: ChatSession) => {
    setActiveChat(session);
    setCurrentScreen(AppScreen.CHAT);
  };

  const handleMatch = (session: ChatSession) => {
    setMatches(prev => [session, ...prev]);
    setCurrentScreen(AppScreen.MESSAGES);
    setLikesCount(prev => Math.max(0, prev - 1));
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setCurrentUser(null);
    setProfiles([]);
    setMatches([]);
  };

  const handleAcceptLegal = () => {
    localStorage.setItem('urukundo_legal_accepted', 'true');
    setHasAcceptedLegal(true);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="text-4xl mb-3">🇧🇮</div>
          <div className="text-red-500 font-bold text-xl">URUKUNDO</div>
          <div className="text-gray-400 text-sm mt-2">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!hasAcceptedLegal) return <LegalScreen onAccept={handleAcceptLegal} />;
  if (!user) return <LoginScreen />;
  if (needsSetup) return <SetupScreen userId={user.uid} displayName={user.displayName || ''} photoURL={user.photoURL || ''} onComplete={handleProfileSetupComplete} />;

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-2xl relative overflow-hidden border-x border-gray-100">
      <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-gray-100 z-10">
        <h1 className="text-2xl font-black tracking-tighter" style={{ color: '#ce1126' }}>
          URUKUNDO <span className="text-gray-300 font-light">| 🇧🇮</span>
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto relative bg-gray-50/50">
        {currentScreen === AppScreen.DISCOVERY && (
          <DiscoveryScreen profiles={profiles} onLike={handleLike} onDislike={handleDislike} />
        )}
        {currentScreen === AppScreen.LIKES && user && currentUser && (
          <LikesScreen currentUserId={user.uid} currentUserName={currentUser.name} onMatch={handleMatch} />
        )}
        {currentScreen === AppScreen.MESSAGES && (
          <MessagesScreen matches={matches} onSelectChat={openChat} />
        )}
        {currentScreen === AppScreen.PROFILE && currentUser && (
          <ProfileScreen user={currentUser} setUser={setCurrentUser} onSignOut={handleSignOut} />
        )}
        {currentScreen === AppScreen.CHAT && activeChat && user && (
          <ChatDetailScreen session={activeChat} currentUserId={user.uid} onBack={() => setCurrentScreen(AppScreen.MESSAGES)} />
        )}
      </main>

      {currentScreen !== AppScreen.CHAT && (
        <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} matches={matches} likesCount={likesCount} />
      )}
    </div>
  );
};

export default App;
