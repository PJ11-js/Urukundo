import React, { useEffect, useRef, useState } from 'react';

interface Props {
  lang: 'fr' | 'en';
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

const T = {
  fr: { title: "Vérification d'identité", hint: 'Place ton visage dans le cadre.', shoot: 'Prendre la photo', cancel: 'Annuler', denied: "Impossible d'accéder à la caméra. Vérifie les autorisations." },
  en: { title: 'Identity verification', hint: 'Center your face in the frame.', shoot: 'Take photo', cancel: 'Cancel', denied: 'Could not access the camera. Check your permissions.' },
};

// Capture directement via getUserMedia à basse résolution, plutôt que de
// passer par l'appareil photo natif (via <input capture>) : les selfies natifs
// peuvent peser des dizaines de Mo en pleine résolution et ont fait planter
// le navigateur (mémoire insuffisante) une fois décodés côté client. Ici la
// photo n'existe jamais qu'à la petite taille demandée au flux caméra.
const SelfieCaptureScreen: React.FC<Props> = ({ lang, onCapture, onCancel }) => {
  const t = T[lang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(tr => tr.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(tr => tr.stop());
    };
  }, []);

  const handleShot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const size = 640;
    const side = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    canvas.toBlob(blob => { if (blob) onCapture(blob); }, 'image/jpeg', 0.85);
  };

  return (
    <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col text-white">
      <div className="p-4 flex items-center justify-between">
        <h2 className="font-bold">{t.title}</h2>
        <button onClick={onCancel} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative px-8">
        {error ? (
          <p className="text-center text-gray-300 text-sm">{t.denied}</p>
        ) : (
          <div className="w-full max-w-xs aspect-square rounded-full overflow-hidden border-4 border-white/30">
            <video ref={videoRef} autoPlay playsInline muted
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          </div>
        )}
      </div>

      <div className="p-8 pt-0 space-y-4 text-center">
        {!error && <p className="text-sm text-gray-300">{t.hint}</p>}
        <div className="flex items-center justify-center gap-6">
          {!error && (
            <button onClick={handleShot}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-90 transition-transform">
              <i className="fa-solid fa-camera text-gray-800 text-xl"></i>
            </button>
          )}
        </div>
        <button onClick={onCancel} className="text-sm text-gray-400 underline">{t.cancel}</button>
      </div>
    </div>
  );
};

export default SelfieCaptureScreen;
