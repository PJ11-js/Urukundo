import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { app, db } from '../firebase';

const VAPID_KEY = 'BMkpBvtsSIpCvYs6FwOSCGtPPo95cagNewk2eIZ3H7kDL8wMhW9Qzhq2YACqiYGh4dsiluI2wC8cg66FUwU8cx8';

// Demande la permission et enregistre le token FCM de cet appareil sur le profil.
// Échoue silencieusement sur les navigateurs/contextes qui ne supportent pas le push
// (Safari ancien, iframe, etc.) plutôt que de bloquer le reste de l'app.
export const registerPush = async (userId: string): Promise<void> => {
  try {
    if (!('Notification' in window) || !(await isSupported())) return;
    if (Notification.permission === 'denied') return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await updateDoc(doc(db, 'users', userId), { fcmTokens: arrayUnion(token) });
    }
  } catch (err) {
    console.error('registerPush failed', err);
  }
};

// Déclenche l'envoi côté serveur (fonction Vercel) — fire-and-forget.
export const notifyUser = (toUserId: string, title: string, body: string): void => {
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toUserId, title, body }),
  }).catch(() => {});
};
