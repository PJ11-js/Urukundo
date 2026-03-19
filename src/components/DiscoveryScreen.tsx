import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';

interface Props {
  profiles: UserProfile[];
  onLike: (profile: UserProfile) => void;
  onDislike: (id: string) => void;
}

const DiscoveryScreen: React.FC<Props> = ({ profiles, onLike, onDislike }) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  if (profiles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <i className="fa-solid fa-fire text-gray-300 text-4xl"></i>
        </div>
        <h3 className="text-xl font-semibold text-gray-800">Plus de profils nearby</h3>
        <p className="text-gray-500 mt-2">Reviens plus tard ou élargis ta recherche !</p>
      </div>
    );
  }

  const currentProfile = profiles[0];

  const handleStart = (clientX: number) => {
    startX.current = clientX;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    setDragX(clientX - startX.current);
  };

  const handleEnd = () => {
    setIsDragging(false);
    if (dragX > 100) {
      onLike(currentProfile);
    } else if (dragX < -100) {
      onDislike(currentProfile.id);
    }
    setDragX(0);
  };

  const rotation = dragX * 0.08;
  const opacity = Math.max(0, 1 - Math.abs(dragX) / 400);
  const likeOpacity = Math.min(1, dragX / 100);
  const nopeOpacity = Math.min(1, -dragX / 100);

  return (
    <div className="h-full p-4 flex flex-col select-none">
      <div className="relative flex-1"
        onMouseDown={e => handleStart(e.clientX)}
        onMouseMove={e => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={e => handleStart(e.touches[0].clientX)}
        onTouchMove={e => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}>

        <div ref={cardRef}
          style={{
            transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl bg-white">

          <img src={currentProfile.images[0]} alt={currentProfile.name} className="w-full h-full object-cover pointer-events-none" />

          {/* LIKE overlay */}
          <div style={{ opacity: likeOpacity }}
            className="absolute top-8 left-6 border-4 border-green-400 text-green-400 px-4 py-1 rounded-xl rotate-[-20deg] text-2xl font-black">
            LIKE 💚
          </div>

          {/* NOPE overlay */}
          <div style={{ opacity: nopeOpacity }}
            className="absolute top-8 right-6 border-4 border-red-400 text-red-400 px-4 py-1 rounded-xl rotate-[20deg] text-2xl font-black">
            NOPE ❌
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 text-white">
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold">{currentProfile.name}, {currentProfile.age}</h2>
              <span className="flex items-center gap-1 text-sm font-medium bg-green-500/80 px-2 py-0.5 rounded-full">
                <i className="fa-solid fa-circle text-[8px]"></i> Online
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 opacity-90">
              <i className="fa-solid fa-location-dot"></i>
              <span>{currentProfile.location}{currentProfile.distance ? ` • ${currentProfile.distance} km` : ''}</span>
            </div>
            <p className="mt-3 text-sm line-clamp-2 opacity-80">{currentProfile.bio}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {currentProfile.interests.map(interest => (
                <span key={interest} className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">{interest}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-6 py-6">
        <button onClick={() => onDislike(currentProfile.id)}
          className="w-16 h-16 rounded-full border-2 border-red-100 text-red-500 flex items-center justify-center shadow-lg bg-white hover:scale-110 transition-transform active:scale-95">
          <i className="fa-solid fa-xmark text-2xl"></i>
        </button>
        <button className="w-12 h-12 rounded-full border-2 border-purple-100 text-purple-500 flex items-center justify-center shadow-md bg-white hover:scale-110 transition-transform">
          <i className="fa-solid fa-star text-lg"></i>
        </button>
        <button onClick={() => onLike(currentProfile)}
          className="w-16 h-16 rounded-full border-2 border-green-100 text-green-500 flex items-center justify-center shadow-lg bg-white hover:scale-110 transition-transform active:scale-95">
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
