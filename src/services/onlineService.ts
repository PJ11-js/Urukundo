import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const setOnlineStatus = async (userId: string, isOnline: boolean) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isOnline,
      lastSeen: Date.now(),
    });
  } catch (err) {
    console.error('Erreur mise à jour statut:', err);
  }
};
