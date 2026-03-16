import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadImage } from '../services/cloudinaryService';
import { UserProfile } from '../types';
import DiscoverySettingsScreen from './DiscoverySettingsScreen';
import SafetyScreen from './SafetyScreen';

interface Props {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  onSignOut: () => void;
}

const ProfileScreen: React.FC<Props> = ({ user, setUser, onSignOut }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [subScreen, setSubScreen] = useState<'main' | 'discovery' | 'safety'>('main');

  if (subScreen === 'discovery') return <DiscoverySettingsScreen user={user} setUser={setUser} onBack={() => setSubScreen('main')} />;
  if (subScreen === 'safety') return <SafetyScreen userId={user.id} onBack={() => setSubScreen('main')} onSignOut={onSignOut} />;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadImage(file, user.id);
      await updateDoc(doc(db, 'users', user.id), { images: [url] });
      setUser(prev => prev ? { ...prev, images: [url] } : null);
    } catch (err) {
      alert('Erreur upload. Réessaie.');
    }
    setIsUploading(false);
  };

  const handleBioChange = async (bio: string) => {
    setUser(prev => prev ? { ...prev, bio } : null);
    try { await updateDoc(doc(db, 'users', user.id), { bio }); } catch {}
  };

  const handleShareApp = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Urukundo', text: "Rejoins Urukundo 🇧🇮", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Lien copié !");
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="relative h-64 w-full">
        {user.images[0] ? (
          <img src={user.images[0]} className="w-full h-full object-cover" alt="Profil" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-100 to-green-100 flex items-center justify-center">
            <i className="fa-solid fa-user text-gray-300 text-6xl"></i>
          </div>
        )}
        <div className="absolute inset-0 bg-black/20"></div>
        <label className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg text-red-500 cursor-pointer">
          {isUploading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-camera"></i>}
          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>
      </div>
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="flex justify-between items-end">
          <h3 className="text-2xl font-bold text-gray-800">{user.name}, {user.age}</h3>
          <span className="text-sm text-gray-500 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">📍 {user.location}</span>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">À propos de moi</label>
          <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:ring-1 focus:ring-red-200 min-h-[100px]"
            value={user.bio} onChange={(e) => handleBioChange(e.target.value)} placeholder="Dis-nous en plus sur toi..." />
        </div>
        <button onClick={handleShareApp}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
          <i className="fa-solid fa-share-nodes"></i> INVITER DES AMIS
        </button>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Centres d'intérêt</label>
          <div className="flex flex-wrap gap-2">
            {user.interests.map(i => (
              <span key={i} className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium border border-red-100">{i}</span>
            ))}
          </div>
        </div>
        <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100 pb-8">
          <button onClick={() => setSubScreen('discovery')}
            className="w-full p-4 flex justify-between items-center hover:bg-gray-100 transition-all">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-sliders text-red-500"></i>
              <span className="text-sm text-gray-700">Paramètres de découverte</span>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
          </button>
          <button onClick={() => setSubScreen('safety')}
            className="w-full p-4 flex justify-between items-center hover:bg-gray-100 transition-all">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-shield text-green-500"></i>
              <span className="text-sm text-gray-700">Centre de sécurité</span>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
          </button>
          <button onClick={onSignOut}
            className="w-full p-4 flex items-center gap-3 text-red-500 font-medium hover:bg-red-50 transition-all">
            <i className="fa-solid fa-right-from-bracket"></i> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
