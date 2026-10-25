// Capture de l'événement "beforeinstallprompt" dès le chargement de la page.
// Chrome ne l'envoie qu'une fois par chargement, souvent pendant que
// l'utilisateur est encore sur l'écran CGU/connexion : la bannière
// d'installation (montée seulement après connexion) le ratait et ne
// s'affichait donc jamais.
let deferredPrompt: any = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(l => l());

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  deferredPrompt = e;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  notify();
});

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export const canPromptInstall = () => !!deferredPrompt;

export const onInstallPromptChange = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

// Ouvre la vraie fenêtre d'installation Chrome/Android si dispo.
// Renvoie false s'il faut plutôt montrer le guide manuel.
export const promptInstall = async (): Promise<boolean> => {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  prompt.prompt();
  try { await prompt.userChoice; } catch {}
  notify();
  return true;
};
