import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ChatSession } from '../types';

interface Props {
  currentUserId: string;
  currentUserName: string;
  onMatch: (session: ChatSession) => void;
}

const LikesScreen: React.FC<Props> = ({ currentUserId, currentUserName, onMatch }) => {
  const [likers, setLikers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLikers = async () => {
      try {
        const q = query(collection(db, 'likes'), where('toUserId', '==', currentUserId));
        const snapshot = await getDocs(q);
        const likerIds = snapshot.docs.map(d => ({ likeId: d.id, fromUserId: d.data().fromUserId }));
        const profiles: (UserProfile & { likeId: string })[] = [];
        for (const { likeId, fromUserId } of likerIds) {
          const userSnap = await getDocs(query(collection(db, 'users'), where('id', '==', fromUserId)));
          userSnap.forEach(d => profiles.push({ ...(d.data() as UserProfile), likeId }));
        }
        setLikers(profiles);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    loadLikers();
  }, [currentUserId]);

  const handleLikeBack = async (profile: UserProfile & { likeId: string }) => {
    try {
      await addDoc(collection(db, 'likes'), {
        fromUserId: currentUserId,
        toUserId: profile.id,
        timestamp: serverTimestamp(),
      });
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        partner: profile,
        messages: [{ id: 'm1', senderId: profile.id, text: `C'est un match ! Amahoro ${currentUserName} ! 🇧🇮`, timestamp: Date.now() }],
      };
      onMatch(newSession);
      setLikers(prev => prev.filter(l => l.id !== profile.id));
    } catch (err) { console.error(err); }
  };

  const handleDislike = async (profile: UserProfile & { likeId: string }) => {
    try {
      await deleteDoc(doc(db, 'likes', profile.likeId));
      setLikers(prev => prev.filter(l => l.id !== profile.id));
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <i className="fa-solid fa-heart text-red-300 text-4xl mb-3 block animate-pulse"></i>
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">❤️ Qui t'a aimé</h2>
        <p className="text-sm text-gray-400 mt-1">
          {likers.length} personne(s) ont aimé ton profil
        </p>
      </div>

      {likers.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">💝</div>
          <p className="text-gray-500 font-medium">Personne encore...</p>
          <p className="text-gray-400 text-sm mt-2">Continue à swiper pour avoir plus de chances !</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {likers.map(profile => (
            <div key={profile.id} className="relative rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-100">
              {profile.images?.[0] ? (
                <img src={profile.images[0]} className="w-full h-48 object-cover" alt={profile.name} />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-red-100 to-green-100 flex items-center justify-center">
                  <span className="text-5xl font-bold text-white">{profile.name[0]}</span>
                </div>
              )}
              <div className="absolute bottom-12 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white font-bold text-sm">{profile.name}, {profile.age}</p>
                <p className="text-white/70 text-xs">📍 {profile.location}</p>
              </div>
              <div className="flex border-t border-gray-100">
                <button onClick={() => handleDislike(profile as any)}
                  className="flex-1 py-2.5 flex items-center justify-center text-red-400 hover:bg-red-50 transition-all">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
                <button onClick={() => handleLikeBack(profile as any)}
                  className="flex-1 py-2.5 flex items-center justify-center text-green-500 hover:bg-green-50 transition-all border-l border-gray-100">
                  <i className="fa-solid fa-heart text-lg"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LikesScreen;
