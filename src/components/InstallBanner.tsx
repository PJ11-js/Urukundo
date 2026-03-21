import React, { useState, useEffect } from 'react';

interface Props {
  lang: 'fr' | 'en';
}

const InstallBanner: React.FC<Props> = ({ lang }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  const T = {
    fr: {
      title: '📲 Installer Urukundo',
      subtitle: 'Installe l\'app sur ton téléphone !',
      install: 'Installer gratuitement',
      installed: '✅ App installée !',
      iosTitle: 'Installer sur iPhone',
      iosStep1: '1. Appuie sur le bouton partage',
      iosStep2: '2. Choisis "Sur l\'écran d\'accueil"',
      iosStep3: '3. Appuie sur "Ajouter"',
      close: 'Fermer',
      later: 'Plus tard',
    },
    en: {
      title: '📲 Install Urukundo',
      subtitle: 'Install the app on your phone!',
      install: 'Install for free',
      installed: '✅ App installed!',
      iosTitle: 'Install on iPhone',
      iosStep1: '1. Tap the share button',
      iosStep2: '2. Choose "Add to Home Screen"',
      iosStep3: '3. Tap "Add"',
      close: 'Close',
      later: 'Later',
    }
  };
  const t = T[lang];

  useEffect(() => {
    if (isStandalone) return; // Déjà installée

    if (isIOS) {
      const dismissed = localStorage.getItem('urukundo_ios_banner_dismissed');
      if (!dismissed) setShowBanner(true);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('urukundo_install_dismissed');
      if (!dismissed) setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(isIOS ? 'urukundo_ios_banner_dismissed' : 'urukundo_install_dismissed', 'true');
  };

  if (isStandalone || installed || !showBanner) return null;

  return (
    <>
      {/* Banner en bas */}
      <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-center gap-3">
          <img src="/icon-192.png" className="w-12 h-12 rounded-xl flex-shrink-0" alt="Urukundo" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm">{t.title}</p>
            <p className="text-xs text-gray-400">{t.subtitle}</p>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button onClick={handleInstall}
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

      {/* Guide iOS */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-800 text-lg text-center">{t.iosTitle}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <span className="text-2xl">⬆️</span>
                <p className="text-sm text-gray-700">{t.iosStep1}</p>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <span className="text-2xl">➕</span>
                <p className="text-sm text-gray-700">{t.iosStep2}</p>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <span className="text-2xl">✅</span>
                <p className="text-sm text-gray-700">{t.iosStep3}</p>
              </div>
            </div>
            <button onClick={() => { setShowIOSGuide(false); setShowBanner(false); localStorage.setItem('urukundo_ios_banner_dismissed', 'true'); }}
              className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold">
              {t.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallBanner;
