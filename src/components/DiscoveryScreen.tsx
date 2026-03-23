import React from 'react';
import { UserProfile } from '../types';

interface DiscoveryScreenProps {
  profiles: UserProfile[];
  onLike: (profile: UserProfile) => void;
  onDislike: (profileId: string) => void;
}

const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ profiles, onLike, onDislike }) => {
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-4xl mb-4">🌍</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Plus de profils autour de vous</h3>
        <p className="text-gray-500">Revenez plus tard pour découvrir de nouvelles personnes !</p>
      </div>
    );
  }

  const currentProfile = profiles[0];

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-50 p-4">
      <div className="relative h-[600px] w-full max-w-sm mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <img 
          src={currentProfile.images[0]} 
          alt={currentProfile.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold">{currentProfile.name}, {currentProfile.age}</h2>
            {currentProfile.isOnline && <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
          </div>
          <p className="text-sm opacity-90 mb-4">{currentProfile.location}</p>
          <p className="text-sm line-clamp-2">{currentProfile.bio}</p>
        </div>
      </div>

      <div className="flex justify-center gap-6 mt-8">
        <button 
          onClick={() => onDislike(currentProfile.id)}
          className="w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-lg text-red-500 hover:scale-110 transition-transform border border-red-50 border-b-4 border-b-red-100"
        >
          ✕
        </button>
        <button 
          onClick={() => onLike(currentProfile)}
          className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-600 rounded-full shadow-lg text-white hover:scale-110 transition-transform border-b-4 border-b-red-700"
        >
          ❤️
        </button>
      </div>
    </div>
  );
};

export default DiscoveryScreen;
