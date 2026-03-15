import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadImage } from '../services/cloudinaryService';
import { UserProfile } from '../types';

interface Props {
  userId: string;
  displayName: string;
  photoURL: string;
  onComplete: () => void;
}

const INTERESTS = ['Musique', 'Danse', 'Football', 'Voyage', 'Cuisine', 'Art', 'Tech', 'Lecture', 'Cinéma', 'Nature', 'Sport', 'Mode'];

const SetupScreen: React.FC<Props> = ({ userId, displayName, photoURL, onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(displayName || '');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(photoURL || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getGPSLocation = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      setLocation('Position non disponible');
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Position détectée';
          const country = data.address?.country || '';
          setLocation(`${city}, ${country}`);
        } catch {
          setLocation('Position détectée');
        }
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        alert('GPS non disponible. Entre ta ville manuellement.');
      }
    );
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (interests.length < 3) {
      setError('Choisis au moins 3 intérêts !');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let imageUrl = photoURL || '';
      if (image) {
        try {
          imageUrl = await uploadImage(image, userId);
        } catch (uploadErr) {
          console.warn('Upload photo échoué, on continue sans:', uploadErr);
        }
      }

      const profile: UserProfile = {
        id: userId,
        name: name.trim(),
        age: parseInt(age),
        bio: bio.trim() || `Amahoro ! Je suis ${name.trim()} et je cherche une belle rencontre. 🇧🇮`,
        location: location || 'Non précisé',
        images: imageUrl ? [imageUrl] : [],
        interests,
        photoURL: imageUrl,
      };

      await setDoc(doc(db, 'users', userId), profile);
      onComplete();
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la création. Réessaie.');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex gap-2 mb-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-red-500' : 'bg-gray-200'}`} />
          ))}
        </div>
        <h1 className="text-xl font-bold text-gray-800">
          {step === 1 ? '👤 Ton profil' : step === 2 ? '📍 Ta localisation' : '✨ Tes intérêts'}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {step === 1 && (
          <>
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-28 h-28">
                {imagePreview ? (
                  <img src={imagePreview} className="w-28 h-28 rounded-full object-cover border-4 border-red-100" alt="profil" />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center border-4 border-red-100">
                    <i className="fa-solid fa-user text-gray-300 text-4xl"></i>
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-9 h-9 bg-red-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                  <i className="fa-solid fa-camera text-white text-sm"></i>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
              <p className="text-xs text-gray-400">Photo optionnelle 📸</p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prénom *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Ton prénom"
                className="w-full mt-1 p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Âge *</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)}
                placeholder="Ton âge" min="18" max="99"
                className="w-full mt-1 p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bio (optionnel)</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)}
                placeholder="Dis-nous en plus sur toi... (Amahoro !)"
                className="w-full mt-1 p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 min-h-[80px]" />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Utilise le GPS ou entre ta ville manuellement.</p>
            <button onClick={getGPSLocation} disabled={locationLoading}
              className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all">
              <i className="fa-solid fa-location-dot"></i>
              {locationLoading ? 'Détection en cours...' : '📍 Détecter ma position automatiquement'}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-gray-400">ou</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Entre ta ville manuellement..."
              className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            {location && (
              <div className="p-3 bg-green-50 rounded-2xl flex items-center gap-2">
                <i className="fa-solid fa-check text-green-500"></i>
                <span className="text-sm text-green-700 font-medium">📍 {location}</span>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
              Choisis tes intérêts (min. 3) — {interests.length} sélectionné(s)
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button key={interest} onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                    interests.includes(interest) ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}>
                  {interest}
                </button>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm mt-3 font-medium">{error}</p>}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100">
        {step < 3 ? (
          <button onClick={() => setStep(s => s + 1)}
            disabled={(step === 1 && (!name.trim() || !age)) || (step === 2 && !location)}
            className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold disabled:opacity-40 active:scale-95 transition-all">
            Continuer →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={interests.length < 3 || loading}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-2xl font-bold disabled:opacity-40 active:scale-95 transition-all">
            {loading ? '⏳ Création du profil...' : '🇧🇮 Rejoindre Urukundo !'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SetupScreen;
