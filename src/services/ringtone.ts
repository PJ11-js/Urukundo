// Sonnerie d'appel entrant générée avec Web Audio (pas de fichier à charger),
// + vibration sur Android. Les navigateurs peuvent bloquer le son tant que la
// personne n'a jamais touché la page : dans ce cas l'écran d'appel s'affiche
// quand même, simplement sans son.
let ctx: AudioContext | null = null;
let timer: number | null = null;

const ringOnce = () => {
  if (!ctx) return;
  const now = ctx.currentTime;
  // Deux "dring" courts, façon téléphone.
  [0, 0.45].forEach(offset => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now + offset);
    osc.frequency.setValueAtTime(660, now + offset + 0.15);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.4);
  });
  navigator.vibrate?.([700, 300, 700]);
};

export const startRingtone = () => {
  if (timer !== null) return;
  try {
    ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    ctx.resume().catch(() => {});
  } catch { ctx = null; }
  ringOnce();
  timer = window.setInterval(ringOnce, 2500);
};

export const stopRingtone = () => {
  if (timer !== null) { clearInterval(timer); timer = null; }
  navigator.vibrate?.(0);
};
