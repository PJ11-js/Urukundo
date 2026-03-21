import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  userId: string;
  onConfirm: () => void;
  onCancel: () => void;
  lang: 'fr' | 'en';
}

const T = {
  fr: {
    title: 'Avant de partir... 👋',
    subtitle: 'Ton avis nous aide à améliorer Urukundo !',
    liked: '❤️ Ce que tu as aimé',
    disliked: '👎 Ce qui t\'a déplu',
    improve: '🚀 Ce qu\'on doit améliorer',
    likedPlaceholder: 'Ex: Le swipe, les profils, le chat...',
    dislikedPlaceholder: 'Ex: Pas assez d\'utilisateurs, bugs...',
    improvePlaceholder: 'Tes suggestions pour Urukundo...',
    send: 'Envoyer et se déconnecter',
    skip: 'Se déconnecter sans feedback',
    sending: 'Envoi...',
    thanks: 'Merci pour ton retour ! 🇧🇮',
  },
  en: {
    title: 'Before you go... 👋',
    subtitle: 'Your feedback helps us improve Urukundo!',
    liked: '❤️ What you liked',
    disliked: '👎 What you disliked',
    improve: '🚀 What we should improve',
    likedPlaceholder: 'E.g: Swiping, profiles, chat...',
    dislikedPlaceholder: 'E.g: Not enough users, bugs...',
    improvePlaceholder: 'Your suggestions for Urukundo...',
    send: 'Send & Sign out',
    skip: 'Sign out without feedback',
    sending: 'Sending...',
    thanks: 'Thank you for your feedback! 🇧🇮',
  }
};

const FeedbackScreen: React.FC<Props> = ({ userId, onConfirm, onCancel, lang }) => {
  const t = T[lang];
  const [liked, setLiked] = useState('');
  const [disliked, setDisliked] = useState('');
  const [improve, setImprove] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId, liked, disliked, improve,
        lang, timestamp: serverTimestamp(),
      });
      setSent(true);
      setTimeout(() => onConfirm(), 1500);
    } catch {
      onConfirm();
    }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 text-center">
          <div className="text-5xl mb-3">🇧🇮</div>
          <p className="font-bold text-gray-800 text-lg">{t.thanks}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">{t.title}</h2>
          <p className="text-sm text-gray-400 mt-1">{t.subtitle}</p>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">{t.liked}</label>
          <textarea value={liked} onChange={e => setLiked(e.target.value)} placeholder={t.likedPlaceholder}
            className="w-full p-3 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 min-h-[80px]" style={{ fontSize: '16px' }} />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">{t.disliked}</label>
          <textarea value={disliked} onChange={e => setDisliked(e.target.value)} placeholder={t.dislikedPlaceholder}
            className="w-full p-3 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 min-h-[80px]" style={{ fontSize: '16px' }} />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">{t.improve}</label>
          <textarea value={improve} onChange={e => setImprove(e.target.value)} placeholder={t.improvePlaceholder}
            className="w-full p-3 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 min-h-[80px]" style={{ fontSize: '16px' }} />
        </div>

        <button onClick={handleSend} disabled={sending}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-2xl font-bold disabled:opacity-50">
          {sending ? t.sending : t.send}
        </button>
        <button onClick={onConfirm}
          className="w-full py-3 text-gray-400 text-sm">
          {t.skip}
        </button>
      </div>
    </div>
  );
};

export default FeedbackScreen;
