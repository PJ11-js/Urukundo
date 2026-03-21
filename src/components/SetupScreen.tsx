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
  lang: 'fr' | 'en';
}

const INTERESTS = ['Musique/Music', 'Danse/Dance', 'Football', 'Voyage/Travel', 'Cuisine/Cooking', 'Art', 'Tech', 'Lecture/Reading', 'Cinéma/Cinema', 'Nature', 'Sport', 'Mode/Fashion'];

const T = {
  fr: {
    step1: '👤 Ton profil', step2: '📍 Ta localisation', step3: '✨ Tes intérêts',
    photos: 'Photos (max 6) 📸', photoOptional: 'Photo optionnelle',
    firstName: 'Prénom *', age: 'Âge *', bio: 'Bio (optionnel)',
    bioPlaceholder: 'Dis-nous en plus sur toi... (Amahoro !)',
    gender: 'Tu es *', man: '👨 Homme', woman: '👩 Femme',
    lookingFor: 'Tu cherches *',
    detectGPS: '📍 Détecter ma position', detecting: 'Détection...',
    or: 'ou', cityPlaceholder: 'Entre ta ville...',
    interests: 'Intérêts (min. 3)', selected: 'sélectionné(s)',
    next: 'Continuer →', join: '🇧🇮 Rejoindre Urukundo !', creating: '⏳ Création...',
    errorInterests: 'Choisis au moins 3 intérêts !', errorGeneral: 'Erreur. Réessaie.',
    add: 'Ajouter', max6: 'Maximum 6 photos !', main: 'Principal',
  },
  en: {
    step1: '👤 Your profile', step2: '📍 Your location', step3: '✨ Your interests',
    photos: 'Photos (max 6) 📸', photoOptional: 'Optional photo',
    firstName: 'First name *', age: 'Age *', bio: 'Bio (optional)',
    bioPlaceholder: 'Tell us about yourself... (Amahoro !)',
    gender: 'You are *', man: '👨 Man', woman: '👩 Woman',
    lookingFor: 'Looking for *',
    detectGPS: '📍 Detect my location', detecting: 'Detecting...',
    or: 'or', cityPlaceholder: 'Enter your city...',
    interests: 'Interests (min. 3)', selected: 'selected',
    next: 'Continue →', join: '🇧🇮 Join Urukundo!', creating: '⏳ Creating...',
    errorInterests: 'Choose at least 3 interests!', errorGeneral: 'Error. Try again.',
    add: 'Add', max6: 'Maximum 6 photos!', main: 'Main',
  }
};

const SetupScreen: React.FC<Props> = ({ userId, displayName, photoURL, onComplete, lang }) => {
  const t = T[lang];
  const [step, setStep] = useState(1);
  const [name, setName] = useState(displayName || '');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme' | ''>('');
  const [lookingFor, setLookingFor] = useState<'homme' | 'femme'>('femme');
  const [location, setLocation] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getGPSLocation = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) { setLocationLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Position détectée';
          const country = data.address?.country || '';
          setLocation(`${city}, ${country}`);
        } catch { setLocation('Position détectée'); }
        setLocationLoading(false);
      },
      () => { setLocationLoading(false); }
    );
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 6) { alert(t.max6); return; }
    setImages(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (interests.length < 3) { setError(t.errorInterests); return; }
    setLoading(true);
    setError('');
    try {
      const uploadedUrls: string[] = [];
      for (const file of images) {
        try { uploadedUrls.push(await uploadImage(file, userId)); } catch {}
      }

      const profile: UserProfile = {
        id: userId,
        name: name.trim(),
        age: parseInt(age),
        bio: bio.trim() || `Amahoro ! ${lang === 'fr' ? 'Je suis' : 'I am'} ${name.trim()} 🇧🇮`,
        location: location || 'Non précisé',
        images: uploadedUrls,
        interests,
        photoURL: uploadedUrls[0] || '',
        gender: gender as 'homme' | 'femme',
        lookingFor,
        isDemo: false,
        lang,
        isOnline: true,
        lastSeen: Date.now(),
      };

      await setDoc(doc(db, 'users', userId), profile);
      onComplete();
    } catch { setError(t.errorGeneral); }
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
          {step === 1 ? t.step1 : step === 2 ? t.step2 : t.step3}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {step === 1 && (
          <>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">{t.photos}</label>
              <div className="grid grid-cols-3 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden">
                    <img src={preview} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs">✕</button>
                    {index === 0 && <span className="absolute bottom-1 left-1 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">{t.main}</span>}
                  </div>
                ))}
                {imagePreviews.length < 6 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-red-300 transition-all">
                    <i className="fa-solid fa-plus text-gray-300 text-2xl"></i>
                    <span className="text-[10px] text-gray-300 mt-1">{t.add}</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.firstName}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t.firstName}
                className="w-full mt-1 p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.age}</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder={t.age} min="18" max="99"
                className="w-full mt-1 p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">{t.gender}</label>
              <div className="flex gap-2">
                {(['homme', 'femme'] as const).map(g => (
                  <button key={g} onClick={() => { setGender(g); setLookingFor(g === 'homme' ? 'femme' : 'homme'); }}
                    className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-all ${gender === g ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                    {g === 'homme' ? t.man : t.woman}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.bio}</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={t.bioPlaceholder}
                className="w-full mt-1 p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 min-h-[80px]" />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <button onClick={getGPSLocation} disabled={locationLoading}
              className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <i className="fa-solid fa-location-dot"></i>
              {locationLoading ? t.detecting : t.detectGPS}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-gray-400">{t.or}</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder={t.cityPlaceholder}
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
              {t.interests} — {interests.length} {t.selected}
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button key={interest} onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${interests.includes(interest) ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                  {interest}
                </button>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100">
        {step < 3 ? (
          <button onClick={() => setStep(s => s + 1)}
            disabled={(step === 1 && (!name.trim() || !age || !gender)) || (step === 2 && !location)}
            className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold disabled:opacity-40 active:scale-95 transition-all">
            {t.next}
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={interests.length < 3 || loading}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-2xl font-bold disabled:opacity-40 active:scale-95 transition-all">
            {loading ? t.creating : t.join}
          </button>
        )}
      </div>
    </div>
  );
};

export default SetupScreen;
