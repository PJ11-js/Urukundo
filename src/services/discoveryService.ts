import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

// Économie du quota Firestore gratuit (voir api/discovery.ts) : la découverte lit
// une liste résumée côté serveur au lieu de chaque profil un par un.

const authHeader = async () => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('not signed in');
  return { Authorization: `Bearer ${token}` };
};

export const fetchDiscoveryProfiles = async (): Promise<UserProfile[]> => {
  try {
    const res = await fetch('/api/discovery', { headers: await authHeader() });
    if (!res.ok) throw new Error(`discovery ${res.status}`);
    const { profiles } = await res.json();
    return profiles as UserProfile[];
  } catch {
    // Secours (serveur indisponible) : l'ancienne méthode, plus coûteuse mais qui marche.
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ ...(d.data() as UserProfile), id: d.id }));
  }
};

// Champs qui comptent pour la découverte (doit suivre PUBLIC_FIELDS côté serveur,
// sans lastSeen/isOnline qui changent tout le temps et sont lus en direct).
const SYNC_FIELDS: (keyof UserProfile)[] = [
  'name', 'age', 'bio', 'location', 'images', 'interests', 'gender', 'lookingFor', 'lang',
  'country', 'locationVerified', 'identityVerified', 'lat', 'lng', 'prompts', 'boostedUntil',
  'details', 'photoURL', 'hidden',
];
const SYNC_MAX_AGE = 24 * 60 * 60 * 1000;

// Envoie ma fiche à la liste résumée seulement si elle a changé (ou une fois par jour,
// pour que "actif récemment" reste à jour dans la Sélection du jour).
export const syncMyDiscoveryProfile = async (me: UserProfile) => {
  const key = `urukundo_discovery_sync_${me.id}`;
  const fingerprint = JSON.stringify(SYNC_FIELDS.map(f => me[f] ?? null));
  try {
    const prev = JSON.parse(localStorage.getItem(key) || 'null');
    if (prev && prev.f === fingerprint && Date.now() - prev.t < SYNC_MAX_AGE) return;
  } catch {}
  try {
    const res = await fetch('/api/discovery', { method: 'POST', headers: await authHeader() });
    if (!res.ok) return;
    try { localStorage.setItem(key, JSON.stringify({ f: fingerprint, t: Date.now() })); } catch {}
  } catch {}
};

// Personnes que j'ai déjà likées : gardées sur le téléphone pour ne pas relire
// tous mes likes à chaque ouverture. Relues depuis Firestore seulement la
// première fois sur un appareil.
const likedKey = (uid: string) => `urukundo_liked_${uid}`;

export const loadLikedIds = async (uid: string): Promise<Set<string>> => {
  try {
    const cached = localStorage.getItem(likedKey(uid));
    if (cached) return new Set(JSON.parse(cached));
  } catch {}
  try {
    const snap = await getDocs(query(collection(db, 'likes'), where('fromUserId', '==', uid)));
    const ids = snap.docs.map(d => d.data().toUserId as string);
    try { localStorage.setItem(likedKey(uid), JSON.stringify(ids)); } catch {}
    return new Set(ids);
  } catch { return new Set(); }
};

export const saveLikedIds = (uid: string, ids: Set<string>) => {
  try { localStorage.setItem(likedKey(uid), JSON.stringify([...ids])); } catch {}
};
