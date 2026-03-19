import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppScreen, UserProfile, ChatSession } from './types';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import DiscoveryScreen from './components/DiscoveryScreen';
import MessagesScreen from './components/MessagesScreen';
import ProfileScreen from './components/ProfileScreen';
import ChatDetailScreen from './components/ChatDetailScreen';
import LikesScreen from './components/LikesScreen';
import BottomNav from './components/BottomNav';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
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
          loadProfiles(firebaseUser.uid);
          loadLikesCount(firebaseUser.uid);
        } else {
          setNeedsSetup(true);
        }
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const loadLikesCount = async (userId: string) => {
    try {
      const q = query(collection(db, 'likes'), where('toUserId', '==', userId));
      const snapshot = await getDocs(q);
      setLikesCount(snapshot.size);
    } catch {}
  };

  const loadProfiles = async (userId: string) => {
    try {
      const q = query(collection(db, 'users'), where('id', '!=', userId));
      const snapshot = await getDocs(q);
      const users: UserProfile[] = [];
      snapshot.forEach(doc => users.push(doc.data() as UserProfile));
      setProfiles(users.length > 0 ? users : getFallbackProfiles());
    } catch {
      setProfiles(getFallbackProfiles());
    }
  };

  const getFallbackProfiles = (): UserProfile[] => [
    { id: '1', name: 'Inès', age: 24, bio: 'Amahoro ! Looking for someone to explore Lake Tanganyika with.', location: 'Bujumbura', images: ['https://i.pravatar.cc/600?img=47'], interests: ['Danse', 'Plage', 'Culture'], distance: 2 },
    { id: '2', name: 'Fabrice', age: 28, bio: 'Chef cuisinier à Gitega.', location: 'Gitega', images: ['https://i.pravatar.cc/600?img=68'], interests: ['Cuisine', 'Art', 'Voyage'], distance: 45 },
    { id: '3', name: 'Bella', age: 22, bio: 'Étudiante à Bujumbura. La musique est ma vie !', location: 'Bujumbura', images: ['https://i.pravatar.cc/600?img=44'], interests: ['Musique', 'Randonnée', 'Social'], distance: 5 },
    { id: '4', name: 'Arnaud', age: 31, bio: 'Entrepreneur à Paris. Fier Burundais !', location: 'Paris', images: ['https://i.pravatar.cc/600?img=51'], interests: ['Business', 'Sport', 'Tech'], distance: 120 },
    { id: '5', name: 'Diane', age: 26, bio: 'Infirmière à Bruxelles.', location: 'Bruxelles', images: ['https://i.pravatar.cc/600?img=48'], interests: ['Santé', 'Voyage', 'Lecture'], distance: 200 },
    { id: '6', name: 'Patrick', age: 30, bio: 'Développeur web à Montréal. Amahoro !', location: 'Montréal', images: ['https://i.pravatar.cc/600?img=56'], interests: ['Tech', 'Football', 'Cinéma'], distance: 300 },
  ];

  const handleProfileSetupComplete = async () => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setCurrentUser(userDoc.data() as UserProfile);
        setNeedsSetup(false);
        loadProfiles(user.uid);
        loadLikesCount(user.uid);
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
    const isMatch = Math.random() > 0.4;
    if (isMatch) {
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
