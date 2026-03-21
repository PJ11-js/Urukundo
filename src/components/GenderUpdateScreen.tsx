import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  userId: string;
  userName: string;
  onComplete: (gender: 'homme' | 'femme') => void;
  lang: 'fr' | 'en';
}

const GenderUpdateScreen: React.FC<Props> = ({ userId, userName, onComplete, lang }) => {
  const [selected, setSelected] = useState<'homme' | 'femme' | ''>('');
  const [loading, setLoading] = useState(false);

  const T = {
    fr: { title: `Salut ${userName} ! 👋`, subtitle: 'Pour améliorer tes suggestions, dis-nous qui tu es :', man: '👨 Homme', woman: '👩 Femme', confirm: 'Confirmer', saving: 'Sauvegarde...' },
    en: { title: `Hey ${userName}! 👋`, subtitle: 'To improve your suggestions, tell us who you are:', man: '👨 Man', woman: '👩 Woman', confirm: 'Confirm', saving: 'Saving...' }
  };
  const t = T[lang];

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        gender: selected,
        lookingFor: selected === 'homme' ? 'femme' : 'homme',
      });
      onComplete(selected);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🇧🇮</div>
          <h2 className="text-xl font-bold text-gray-800">{t.title}</h2>
          <p className="text-sm text-gray-500 mt-2">{t.subtitle}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setSelected('homme')}
            className={`flex-1 py-4 rounded-2xl text-lg font-medium transition-all ${selected === 'homme' ? 'bg-red-500 text-white scale-105' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
            {t.man}
          </button>
          <button onClick={() => setSelected('femme')}
            className={`flex-1 py-4 rounded-2xl text-lg font-medium transition-all ${selected === 'femme' ? 'bg-red-500 text-white scale-105' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
            {t.woman}
          </button>
        </div>

        <button onClick={handleConfirm} disabled={!selected || loading}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-2xl font-bold disabled:opacity-40 active:scale-95 transition-all">
          {loading ? t.saving : t.confirm}
        </button>
      </div>
    </div>
  );
};

export default GenderUpdateScreen;
