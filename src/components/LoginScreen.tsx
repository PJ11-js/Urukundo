import React, { useState } from 'react';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const LoginScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      if (isIOS) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      setError('Erreur de connexion. Réessaie.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-white"
        style={{ background: 'linear-gradient(135deg, #ce1126 0%, #118b44 100%)' }}>
        <div className="text-6xl mb-4">🇧🇮</div>
        <h1 className="text-4xl font-black tracking-tighter mb-2">URUKUNDO</h1>
        <p className="text-white/80 text-center text-lg font-light">
          L'application de rencontre pour les Burundais du monde entier
        </p>
        <div className="mt-8 flex gap-6 text-center">
          <div><div className="text-2xl font-bold">🌍</div><div className="text-xs text-white/70 mt-1">Diaspora</div></div>
          <div><div className="text-2xl font-bold">❤️</div><div className="text-xs text-white/70 mt-1">Rencontres</div></div>
          <div><div className="text-2xl font-bold">💬</div><div className="text-xs text-white/70 mt-1">Chat</div></div>
        </div>
      </div>

      <div className="p-8 space-y-4 bg-white">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-6">Rejoins la communauté Urukundo</h2>

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center">{error}</div>}

        <button onClick={handleGoogleLogin} disabled={loading}
          className="w-full py-4 px-6 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center gap-3 font-semibold text-gray-700 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Connexion...' : 'Continuer avec Google'}
        </button>

        {isIOS && (
          <p className="text-xs text-gray-400 text-center">
            📱 iPhone détecté — tu seras redirigé vers Google
          </p>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">
          En continuant, tu acceptes nos conditions d'utilisation.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
