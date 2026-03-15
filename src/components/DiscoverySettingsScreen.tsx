import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  onBack: () => void;
}

const DiscoverySettingsScreen: React.FC<Props> = ({ user, setUser, onBack }) => {
  const settings = (user as any).settings || {};
  const [ageMin, setAgeMin] = useState(settings.ageMin || 18);
  const [ageMax, setAgeMax] = useState(settings.ageMax || 50);
  const [distance, setDistance] = useState(settings.distance || 100);
  const [gender, setGender] = useState(settings.gender || 'tous');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const newSettings = { ageMin, ageMax, distance, gender };
      await updateDoc(doc(db, 'users', user.id), { settings: newSettings });
      setUser(prev => prev ? { ...prev, settings: newSettings } as any : null);
      setSaved(true);
      setTimeout(() => { setSaved(false); onBack(); }, 1000);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
        <button onClick={onBack} className="text-gray-500 hover:text-red-500">
          <i className="fa-solid fa-chevron-left text-xl"></i>
        </button>
        <h2 className="text-lg font-bold text-gray-800">Paramètres de découverte</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Je recherche</label>
          <div className="flex gap-2">
            {['hommes', 'femmes', 'tous'].map(g => (
              <button key={g} onClick={() => setGender(g)}
                className={`flex-1 py-3 rounded-2xl text-sm font-medium capitalize transition-all ${gender === g ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                {g === 'hommes' ? '👨 Hommes' : g === 'femmes' ? '👩 Femmes' : '👥 Tous'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
            Tranche d'âge : {ageMin} - {ageMax} ans
          </label>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Âge minimum</span><span>{ageMin} ans</span></div>
              <input type="range" min="18" max="80" value={ageMin} onChange={e => setAgeMin(Math.min(parseInt(e.target.value), ageMax - 1))} className="w-full accent-red-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Âge maximum</span><span>{ageMax} ans</span></div>
              <input type="range" min="18" max="80" value={ageMax} onChange={e => setAgeMax(Math.max(parseInt(e.target.value), ageMin + 1))} className="w-full accent-red-500" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
            Distance : {distance === 500 ? 'Illimitée' : `${distance} km`}
          </label>
          <input type="range" min="10" max="500" step="10" value={distance} onChange={e => setDistance(parseInt(e.target.value))} className="w-full accent-red-500" />
        </div>
      </div>
      <div className="p-6 border-t border-gray-100">
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-2xl font-bold disabled:opacity-50">
          {saved ? '✅ Sauvegardé !' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
};

export default DiscoverySettingsScreen;
