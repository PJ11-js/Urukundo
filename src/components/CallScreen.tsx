import React, { useEffect, useRef, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { ICE_SERVERS, endCall } from '../services/callService';
import { cloudinaryUrl } from '../services/cloudinaryService';

interface Props {
  callId: string;
  currentUserId: string;
  partner: UserProfile;
  type: 'audio' | 'video';
  role: 'caller' | 'callee';
  offer?: { type: RTCSdpType; sdp: string };
  lang?: 'fr' | 'en';
  onEnd: () => void;
}

const T = {
  fr: { calling: 'Appel en cours...', connecting: 'Connexion...', ended: 'Appel terminé', failed: "Impossible d'établir l'appel.",
    micDenied: "Impossible d'accéder au micro/caméra. Vérifie les autorisations." },
  en: { calling: 'Calling...', connecting: 'Connecting...', ended: 'Call ended', failed: 'Could not establish the call.',
    micDenied: 'Could not access microphone/camera. Check your permissions.' },
};

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const CallScreen: React.FC<Props> = ({ callId, currentUserId, partner, type, role, offer, lang = 'fr', onEnd }) => {
  const t = T[lang];
  const [status, setStatus] = useState<'connecting' | 'in-call' | 'ended' | 'failed'>('connecting');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [duration, setDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const endedRef = useRef(false);
  const durationTimerRef = useRef<number | null>(null);

  const cleanup = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    pcRef.current?.close();
  };

  const handleHangup = () => {
    endCall(callId);
    cleanup();
    onEnd();
  };

  useEffect(() => {
    let unsubCallDoc: (() => void) | undefined;
    let unsubCandidates: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      } catch (err) {
        console.error('getUserMedia failed', err);
        alert(t.micDenied);
        onEnd();
        return;
      }
      if (cancelled) { stream.getTracks().forEach(tr => tr.stop()); return; }
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (e) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        setStatus('in-call');
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') setStatus('failed');
      };

      const myCandidates = role === 'caller' ? 'callerCandidates' : 'calleeCandidates';
      const theirCandidates = role === 'caller' ? 'calleeCandidates' : 'callerCandidates';

      pc.onicecandidate = (e) => {
        if (e.candidate) addDoc(collection(db, 'calls', callId, myCandidates), e.candidate.toJSON()).catch(() => {});
      };

      try {
        if (role === 'caller') {
          const offerDesc = await pc.createOffer();
          await pc.setLocalDescription(offerDesc);
          await updateDoc(doc(db, 'calls', callId), { offer: { type: offerDesc.type, sdp: offerDesc.sdp } });

          unsubCallDoc = onSnapshot(doc(db, 'calls', callId), async (snap) => {
            const data = snap.data();
            if (!data) return;
            if (data.answer && !pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(() => {});
            }
            if (data.status === 'declined' || data.status === 'ended') { cleanup(); setStatus('ended'); onEnd(); }
          });
        } else {
          if (offer) await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answerDesc = await pc.createAnswer();
          await pc.setLocalDescription(answerDesc);
          await updateDoc(doc(db, 'calls', callId), { answer: { type: answerDesc.type, sdp: answerDesc.sdp }, status: 'accepted' });

          unsubCallDoc = onSnapshot(doc(db, 'calls', callId), (snap) => {
            if (snap.data()?.status === 'ended') { cleanup(); setStatus('ended'); onEnd(); }
          });
        }
      } catch (err) {
        console.error('WebRTC signaling failed', err);
        setStatus('failed');
      }

      unsubCandidates = onSnapshot(collection(db, 'calls', callId, theirCandidates), (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') pc.addIceCandidate(new RTCIceCandidate(change.doc.data() as RTCIceCandidateInit)).catch(() => {});
        });
      });
    })();

    return () => {
      cancelled = true;
      unsubCallDoc?.();
      unsubCandidates?.();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  useEffect(() => {
    if (status !== 'in-call') return;
    durationTimerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    return () => { if (durationTimerRef.current) clearInterval(durationTimerRef.current); };
  }, [status]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach(tr => { tr.enabled = !next; });
  };

  const toggleCam = () => {
    const next = !camOff;
    setCamOff(next);
    localStreamRef.current?.getVideoTracks().forEach(tr => { tr.enabled = !next; });
  };

  const statusLabel = status === 'failed' ? t.failed : status === 'in-call' ? formatDuration(duration) : role === 'caller' ? t.calling : t.connecting;

  return (
    <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col text-white" style={{ height: '100dvh' }}>
      {type === 'video' && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-black" />
      )}
      {type === 'audio' && <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />}

      {(type === 'audio' || status !== 'in-call') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-900 via-gray-900/95 to-black">
          {partner.images?.[0] ? (
            <img src={cloudinaryUrl(partner.images[0], 300, 300)} className="w-32 h-32 rounded-full object-cover shadow-xl" alt={partner.name} />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-400 to-green-400 flex items-center justify-center text-4xl font-bold">
              {partner.name[0]}
            </div>
          )}
          <h2 className="text-2xl font-bold">{partner.name}</h2>
          <p className="text-gray-300 text-sm">{statusLabel}</p>
        </div>
      )}

      {type === 'video' && status === 'in-call' && (
        <div className="absolute top-4 left-4 bg-black/40 px-3 py-1 rounded-full text-sm">{statusLabel}</div>
      )}

      {type === 'video' && (
        <video ref={localVideoRef} autoPlay playsInline muted
          className="absolute bottom-28 right-4 w-24 h-32 rounded-2xl object-cover border-2 border-white/30 shadow-lg bg-gray-800" />
      )}

      <div className="relative mt-auto flex items-center justify-center gap-6 pb-10 pt-6">
        <button onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-xl ${muted ? 'bg-white text-gray-900' : 'bg-white/20'}`}>
          <i className={`fa-solid ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
        </button>
        {type === 'video' && (
          <button onClick={toggleCam}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl ${camOff ? 'bg-white text-gray-900' : 'bg-white/20'}`}>
            <i className={`fa-solid ${camOff ? 'fa-video-slash' : 'fa-video'}`}></i>
          </button>
        )}
        <button onClick={handleHangup}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-transform">
          <i className="fa-solid fa-phone-slash"></i>
        </button>
      </div>
    </div>
  );
};

export default CallScreen;
