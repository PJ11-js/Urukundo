import React, { useState, useEffect } from 'react';
import { signInWithPopup, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface Props {
  onLangSelect: (lang: 'fr' | 'en') => void;
  lang: 'fr' | 'en';
}

const LoginScreen: React.FC<Props> = ({ onLangSelect, lang }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const T = {
    fr: { title: 'L\'application de rencontre pour les Burundais du monde entier', community: 'Rejoins la communauté Urukundo', google: 'Continuer avec Google', connecting: 'Connexion...', error: 'Erreur de connexion. Ouvre ce site dans ton navigateur (Safari/Chrome) et réessaie.', diaspora: 'Diaspora', meetings: 'Rencontres', chat: 'Chat', browserTip: '💡 Pour une meilleure expérience, ouvre ce lien dans Safari ou Chrome' },
    en: { title: 'The dating app for Burundians around the world', community: 'Join the Urukundo community', google: 'Continue with Google', connecting: 'Connecting...', error: 'Connection error. Open this site in your browser (Safari/Chrome) and try again.', diaspora: 'Diaspora', meetings: 'Dating', chat: 'Chat', browserTip: '💡 For a better experience, open this link in Safari or Chrome' }
  };
  const t = T[lang];

  // Vérifie si on est dans une webview Instagram/Facebook
  const isWebView = /Instagram|FBAN|FBAV|Twitter|Line\//.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    // Récupère le résultat du redirect si on revient d'une auth Google
    getRedirectResult(auth).catch(() => {});
  }, []);

  const handleGoogleLogin = async () => {
    if (isWebView) {
      // Dans une webview, ouvre dans le navigateur externe
      window.open(window.location.href, '_blank');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        setError(t.error);
      } else {
        setError(t.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex justify-end p-4 gap-2">
        <button onClick={() => onLangSelect('fr')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${lang === 'fr' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          🇫🇷 FR
        </button>
        <button onClick={() => onLangSelect('en')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${lang === 'en' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          🇬🇧 EN
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-white"
        style={{ background: 'linear-gradient(135deg, #ce1126 0%, #118b44 100%)' }}>
        <div className="text-6xl mb-4">🇧🇮</div>
        <h1 className="text-4xl font-black tracking-tighter mb-2">URUKUNDO</h1>
        <p className="text-white/80 text-center text-lg font-light">{t.title}</p>
        <div className="mt-8 flex gap-6 text-center">
          <div><div className="text-2xl font-bold">🌍</div><div className="text-xs text-white/70 mt-1">{t.diaspora}</div></div>
          <div><div className="text-2xl font-bold">❤️</div><div className="text-xs text-white/70 mt-1">{t.meetings}</div></div>
          <div><div className="text-2xl font-bold">💬</div><div className="text-xs text-white/70 mt-1">{t.chat}</div></div>
        </div>
      </div>

      <div className="p-8 space-y-4 bg-white">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-6">{t.community}</h2>

        {isWebView && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-yellow-700 font-medium">{t.browserTip}</p>
            <p className="text-xs text-yellow-600 mt-1">urukundo-2qq5.vercel.app</p>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center">{error}</div>}

        <button onClick={handleGoogleLogin} disabled={loading}
          className="w-full py-4 px-6 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center gap-3 font-semibold text-gray-700 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm">
          {loading ? (
            <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? t.connecting : t.google}
        </button>

        {(isIOS || isWebView) && (
          <p className="text-xs text-gray-400 text-center">
            📱 {lang === 'fr' ? 'Si ça ne marche pas, ouvre ce site directement dans Safari' : 'If it doesn\'t work, open this site directly in Safari'}
          </p>
        )}

        <p className="text-xs text-gray-400 text-center">
          {lang === 'fr' ? 'En continuant, tu acceptes nos conditions d\'utilisation.' : 'By continuing, you accept our terms of service.'}
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
