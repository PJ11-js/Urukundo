import React from 'react';
import { UserProfile } from '../types';

interface Props {
  profiles: UserProfile[];
  onLike: (profile: UserProfile) => void;
  onDislike: (id: string) => void;
}

const DiscoveryScreen: React.FC<Props> = ({ profiles, onLike, onDislike }) => {
  if (profiles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <i className="fa-solid fa-location-dot text-gray-300 text-4xl"></i>
        </div>
        <h3 className="text-xl font-semibold text-gray-800">No more profiles nearby</h3>
        <p className="text-gray-500 mt-2">Try expanding your search radius or come back later!</p>
        <button className="mt-6 px-6 py-2 rounded-full border border-red-500 text-red-500 font-medium">
          Refresh Discovery
        </button>
      </div>
    );
  }

  const currentProfile = profiles[0];

  return (
    <div className="h-full p-4 flex flex-col">
      <div className="relative flex-1 rounded-3xl overflow-hidden shadow-xl bg-white swipe-card group">
        <img
          src={currentProfile.images[0]}
          alt={currentProfile.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 text-white">
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold">{currentProfile.name}, {currentProfile.age}</h2>
            <span className="flex items-center gap-1 text-sm font-medium bg-green-500/80 px-2 py-0.5 rounded-full">
              <i className="fa-solid fa-circle text-[8px]"></i> Online
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 opacity-90">
            <i className="fa-solid fa-location-dot"></i>
            <span>{currentProfile.location} • {currentProfile.distance} km away</span>
          </div>
          <p className="mt-3 text-sm line-clamp-2 opacity-80">{currentProfile.bio}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {currentProfile.interests.map((interest) => (
              <span key={interest} className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-6 py-6">
        <button
          onClick={() => onDislike(currentProfile.id)}
          className="w-16 h-16 rounded-full border-2 border-red-100 text-red-500 flex items-center justify-center shadow-lg bg-white hover:scale-110 transition-transform active:scale-95"
        >
          <i className="fa-solid fa-xmark text-2xl"></i>
        </button>
        <button className="w-12 h-12 rounded-full border-2 border-purple-100 text-purple-500 flex items-center justify-center shadow-md bg-white hover:scale-110 transition-transform">
          <i className="fa-solid fa-star text-lg"></i>
        </button>
        <button
          onClick={() => onLike(currentProfile)}
          className="w-16 h-16 rounded-full border-2 border-green-100 text-green-500 flex items-center justify-center shadow-lg bg-white hover:scale-110 transition-transform active:scale-95"
        >
          <i className="fa-solid fa-heart text-2xl"></i>
        </button>
        <button className="w-12 h-12 rounded-full border-2 border-yellow-100 text-yellow-500 flex items-center justify-center shadow-md bg-white hover:scale-110 transition-transform">
          <i className="fa-solid fa-bolt text-lg"></i>
        </button>
      </div>
    </div>
  );
};

export default DiscoveryScreen;
