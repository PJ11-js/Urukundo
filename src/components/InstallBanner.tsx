import React, { useState, useEffect } from 'react';
import { isIOS, isStandalone, canPromptInstall, onInstallPromptChange, promptInstall } from '../services/installPrompt';

interface Props {
  lang: 'fr' | 'en';
}

// "Plus tard" ne cache la bannière que quelques jours (avant : pour toujours).
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;
const DISMISS_KEY = 'urukundo_install_dismissed_at';

const T = {
  fr: {
    title: '📲 Installer Urukundo',
    subtitle: 'Installe l\'app sur ton téléphone !',
    install: 'Installer gratuitement',
    iosTitle: 'Installer sur iPhone',
    iosStep1: '1. Appuie sur le bouton partage (carré avec une flèche ⬆️)',
    iosStep2: '2. Choisis "Sur l\'écran d\'accueil"',
    iosStep3: '3. Appuie sur "Ajouter"',
    androidTitle: 'Installer sur Android',
    androidStep1: '1. Ouvre le site dans Chrome',
    androidStep2: '2. Appuie sur le menu ⋮ en haut à droite',
    androidStep3: '3. Choisis "Installer l\'application" (ou "Ajouter à l\'écran d\'accueil")',
    androidNote: 'Si tu ne vois pas cette option, l\'app est peut-être déjà installée : cherche l\'icône Urukundo sur ton écran d\'accueil.',
    close: 'Fermer',
    later: 'Plus tard',
  },
  en: {
    title: '📲 Install Urukundo',
    subtitle: 'Install the app on your phone!',
    install: 'Install for free',
    iosTitle: 'Install on iPhone',
    iosStep1: '1. Tap the share button (square with an arrow ⬆️)',
    iosStep2: '2. Choose "Add to Home Screen"',
    iosStep3: '3. Tap "Add"',
    androidTitle: 'Install on Android',
    androidStep1: '1. Open the site in Chrome',
    androidStep2: '2. Tap the ⋮ menu at the top right',
    androidStep3: '3. Choose "Install app" (or "Add to Home screen")',
    androidNote: 'If you don\'t see this option, the app may already be installed: look for the Urukundo icon on your home screen.',
    close: 'Close',
    later: 'Later',
  }
};

// Guide manuel, quand le navigateur ne propose pas sa fenêtre d'installation
// (iPhone, ou Android si Chrome ne l'a pas encore proposée).
export const InstallGuideModal: React.FC<{ lang: 'fr' | 'en'; onClose: () => void }> = ({ lang, onClose }) => {
  const t = T[lang];
  const ios = isIOS();
  const steps = ios
    ? [['⬆️', t.iosStep1], ['➕', t.iosStep2], ['✅', t.iosStep3]]
    : [['🌐', t.androidStep1], ['⋮', t.androidStep2], ['📲', t.androidStep3]];
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-lg text-center">{ios ? t.iosTitle : t.androidTitle}</h3>
        <div className="space-y-3">
          {steps.map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
              <span className="text-2xl w-8 text-center">{icon}</span>
              <p className="text-sm text-gray-700">{text}</p>
            </div>
          ))}
        </div>
        {!ios && <p className="text-xs text-gray-400 text-center">{t.androidNote}</p>}
        <button onClick={onClose} className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold">
          {t.close}
        </button>
      </div>
    </div>
  );
};

// Ouvre la fenêtre d'installation si possible, sinon le guide manuel.
export const useInstallApp = () => {
  const [showGuide, setShowGuide] = useState(false);
  const install = async () => {
    const prompted = await promptInstall();
    if (!prompted) setShowGuide(true);
  };
  return { install, showGuide, closeGuide: () => setShowGuide(false) };
};

const InstallBanner: React.FC<Props> = ({ lang }) => {
  const [, forceRender] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      return Date.now() - at < DISMISS_MS;
    } catch { return false; }
  });
  const { install, showGuide, closeGuide } = useInstallApp();
  const t = T[lang];

  useEffect(() => onInstallPromptChange(() => forceRender(n => n + 1)), []);

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  };

  if (showGuide) return <InstallGuideModal lang={lang} onClose={() => { closeGuide(); handleDismiss(); }} />;
  // Sur iPhone il n'y a jamais de fenêtre automatique : on montre toujours la
  // bannière (avec le guide). Sur Android, seulement quand Chrome a dit que
  // l'app est installable.
  const visible = !isStandalone() && !dismissed && (isIOS() || canPromptInstall());
  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-center gap-3">
        <img src="/icon-192.png" className="w-12 h-12 rounded-xl flex-shrink-0" alt="Urukundo" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">{t.title}</p>
          <p className="text-xs text-gray-400">{t.subtitle}</p>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button onClick={install}
            className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition-all">
            {t.install}
          </button>
          <button onClick={handleDismiss}
            className="px-3 py-1 text-gray-400 rounded-xl text-xs whitespace-nowrap">
            {t.later}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;
