import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// STUN Google (gratuit) + relais TURN public "Open Relay Project" (gratuit,
// identifiants publics documentés) comme filet de secours quand une connexion
// directe échoue (réseaux mobiles restrictifs). Sans TURN payant, certains
// appels peuvent malgré tout échouer sur des réseaux très verrouillés — c'est
// une vraie limite du zéro-budget, pas un bug.
export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

export const createCallDoc = async (callerId: string, calleeId: string, type: 'audio' | 'video'): Promise<string> => {
  const ref = await addDoc(collection(db, 'calls'), { callerId, calleeId, type, status: 'ringing', createdAt: serverTimestamp() });
  return ref.id;
};

export const declineCall = (callId: string) => updateDoc(doc(db, 'calls', callId), { status: 'declined' }).catch(() => {});
export const endCall = (callId: string) => updateDoc(doc(db, 'calls', callId), { status: 'ended' }).catch(() => {});
export const deleteCall = (callId: string) => deleteDoc(doc(db, 'calls', callId)).catch(() => {});
