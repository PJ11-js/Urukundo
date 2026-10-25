import React, { useState, useEffect } from 'react';
import { signInWithPopup, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface Props {
  onLangSelect: (lang: 'fr' | 'en') => void;
  lang: 'fr' | 'en';
}

const LoginScreen: React.FC<Props> = ({ onLangSelect, lang }) => {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [emailMode, setEmailMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const T = {
    fr: { title: 'L\'application de rencontre pour les Burundais du monde entier', community: 'Rejoins la communauté Urukundo', google: 'Continuer avec Google', or: 'ou', email: 'E-mail', password: 'Mot de passe', login: 'Se connecter', signup: 'Créer mon compte', toSignup: 'Pas encore de compte ? Crée-le ici', toLogin: 'Déjà un compte ? Connecte-toi', forgot: 'Mot de passe oublié ?', resetSent: 'E-mail envoyé ! Regarde ta boîte mail (et les spams) pour choisir un nouveau mot de passe.', needEmail: 'Écris d\'abord ton adresse e-mail.', errInvalidEmail: 'Adresse e-mail invalide.', errWeak: 'Le mot de passe doit avoir au moins 6 caractères.', errInUse: 'Un compte existe déjà avec cet e-mail. Connecte-toi.', errWrong: 'E-mail ou mot de passe incorrect.', errTooMany: 'Trop d\'essais. Attends quelques minutes et réessaie.', errEmail: 'Erreur. Réessaie dans un moment.', connecting: 'Connexion...', error: 'Erreur de connexion. Ouvre ce site dans ton navigateur (Safari/Chrome) et réessaie.', diaspora: 'Diaspora', meetings: 'Rencontres', chat: 'Chat', browserTip: '💡 Pour une meilleure expérience, ouvre ce lien dans Safari ou Chrome' },
    en: { title: 'The dating app for Burundians around the world', community: 'Join the Urukundo community', google: 'Continue with Google', or: 'or', email: 'Email', password: 'Password', login: 'Log in', signup: 'Create my account', toSignup: 'No account yet? Create one here', toLogin: 'Already have an account? Log in', forgot: 'Forgot password?', resetSent: 'Email sent! Check your inbox (and spam) to choose a new password.', needEmail: 'Enter your email address first.', errInvalidEmail: 'Invalid email address.', errWeak: 'Password must be at least 6 characters.', errInUse: 'An account already exists with this email. Log in.', errWrong: 'Wrong email or password.', errTooMany: 'Too many attempts. Wait a few minutes and try again.', errEmail: 'Error. Try again in a moment.', connecting: 'Connecting...', error: 'Connection error. Open this site in your browser (Safari/Chrome) and try again.', diaspora: 'Diaspora', meetings: 'Dating', chat: 'Chat', browserTip: '💡 For a better experience, open this link in Safari or Chrome' }
  };
  const t = T[lang];

  // Vérifie si on est dans une webview Instagram/Facebook
  const isWebView = /Instagram|FBAN|FBAV|Twitter|Line\//.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  // App installée sur l'écran d'accueil (PWA), iOS ou Android : ni signInWithPopup ni
  // signInWithRedirect ne ramènent le résultat de façon fiable dans ce contexte (testé sur les
  // deux plateformes) - l'app perd le fil pendant l'aller-retour vers Google/Facebook et revient
  // simplement à l'écran de connexion, sans erreur. Seule solution fiable : ouvrir le vrai
  // navigateur (même mécanisme que pour les webviews Instagram/Facebook ci-dessous).
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

  useEffect(() => {
    // Récupère le résultat du redirect si on revient d'une auth Google/Facebook.
    // On affiche l'erreur réelle au lieu de l'avaler silencieusement : sans ça,
    // un échec de redirect renvoie juste à cet écran sans aucune explication.
    getRedirectResult(auth).catch((err: any) => {
      console.error('getRedirectResult error', err);
      setError(`${t.error} (${err?.code || 'erreur inconnue'})`);
    });
  }, []);

  const handleGoogleLogin = async () => {
    if (isWebView || isStandalone) {
      // Dans une webview ou l'app installée, ouvre dans le navigateur directement
      window.open(window.location.href, '_blank');
      return;
    }
    setLoadingProvider('google');
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      setError(`${t.error} (${err?.code || 'erreur inconnue'})`);
    }
    setLoadingProvider(null);
  };

  const emailErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/invalid-email': return t.errInvalidEmail;
      case 'auth/weak-password': return t.errWeak;
      case 'auth/email-already-in-use': return t.errInUse;
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found': return t.errWrong;
      case 'auth/too-many-requests': return t.errTooMany;
      default: return `${t.errEmail} (${code || 'erreur inconnue'})`;
    }
  };

  // Contrairement à Google, l'e-mail ne passe par aucune popup/redirect : ça marche aussi
  // dans l'app installée et dans les webviews, sans devoir ouvrir le navigateur.
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProvider('email');
    setError('');
    setInfo('');
    try {
      if (emailMode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        sendEmailVerification(cred.user).catch(err => console.error('sendEmailVerification error', err));
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      console.error(err);
      setError(emailErrorMessage(err?.code));
    }
    setLoadingProvider(null);
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) { setError(t.needEmail); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo(t.resetSent);
    } catch (err: any) {
      console.error(err);
      setError(emailErrorMessage(err?.code));
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
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

        {(isWebView || isStandalone) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-yellow-700 font-medium">{t.browserTip}</p>
            <p className="text-xs text-yellow-600 mt-1">urukundoapp.com</p>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center">{error}</div>}

        <button onClick={handleGoogleLogin} disabled={loadingProvider !== null}
          className="w-full py-4 px-6 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center gap-3 font-semibold text-gray-700 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm">
          {loadingProvider === 'google' ? (
            <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loadingProvider === 'google' ? t.connecting : t.google}
        </button>

        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="flex-1 h-px bg-gray-200"></div>{t.or}<div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {info && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl text-center">{info}</div>}

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            autoComplete="email" placeholder={t.email}
            className="w-full py-3.5 px-5 border-2 border-gray-200 rounded-2xl text-gray-800 focus:border-red-400 focus:outline-none" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
            autoComplete={emailMode === 'signup' ? 'new-password' : 'current-password'} placeholder={t.password}
            className="w-full py-3.5 px-5 border-2 border-gray-200 rounded-2xl text-gray-800 focus:border-red-400 focus:outline-none" />
          <button type="submit" disabled={loadingProvider !== null}
            className="w-full py-4 px-6 bg-red-500 rounded-2xl flex items-center justify-center gap-3 font-semibold text-white hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 shadow-sm">
            {loadingProvider === 'email' ? (
              <i className="fa-solid fa-spinner fa-spin text-white"></i>
            ) : (
              <i className="fa-solid fa-envelope text-lg"></i>
            )}
            {loadingProvider === 'email' ? t.connecting : (emailMode === 'signup' ? t.signup : t.login)}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 text-sm">
          <button onClick={() => { setEmailMode(emailMode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }}
            className="text-red-500 font-semibold">
            {emailMode === 'login' ? t.toSignup : t.toLogin}
          </button>
          {emailMode === 'login' && (
            <button onClick={handleForgotPassword} className="text-gray-500">{t.forgot}</button>
          )}
        </div>

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
