import admin from 'firebase-admin';

// Liste de découverte résumée.
//
// Avant : chaque ouverture de l'appli lisait TOUS les documents `users` (1 lecture
// Firestore par utilisateur). Le quota gratuit (50 000 lectures/jour) aurait sauté
// vers ~100 utilisateurs actifs. Ici, tous les profils publics sont regroupés dans
// quelques documents "chunk" : une ouverture = CHUNKS lectures, peu importe le
// nombre d'inscrits.
//
// GET  -> renvoie tous les profils publics (reconstruit le cache s'il a plus de 24 h)
// POST -> met à jour la fiche de l'appelant dans le cache (après une modif de profil)

const CHUNKS = 4; // ~1 Mo max par doc Firestore -> environ 2 500 profils au total
const REBUILD_AFTER_MS = 24 * 60 * 60 * 1000;
const COL = 'discoveryCache';

// Seulement ce qui est utile à la découverte : pas d'e-mail, de jetons de
// notification, de réglages privés, etc.
const PUBLIC_FIELDS = [
  'id', 'name', 'age', 'bio', 'location', 'images', 'interests', 'gender', 'lookingFor',
  'lang', 'country', 'locationVerified', 'identityVerified', 'lat', 'lng', 'prompts',
  'boostedUntil', 'details', 'lastSeen', 'isOnline', 'photoURL',
] as const;

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!encoded) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_B64');
  const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const chunkOf = (uid: string) => {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return h % CHUNKS;
};

// null = ne doit pas apparaître dans la découverte
function toPublic(id: string, data: any): Record<string, unknown> | null {
  if (!data || !data.name || data.hidden) return null;
  const out: Record<string, unknown> = {};
  for (const f of PUBLIC_FIELDS) if (data[f] !== undefined) out[f] = data[f];
  out.id = id;
  return out;
}

async function rebuild(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection('users').get();
  const chunks: Record<string, unknown>[] = Array.from({ length: CHUNKS }, () => ({}));
  snap.forEach(d => {
    const p = toPublic(d.id, d.data());
    if (p) chunks[chunkOf(d.id)][d.id] = p;
  });
  const builtAt = Date.now();
  const batch = db.batch();
  chunks.forEach((profiles, i) => batch.set(db.collection(COL).doc(`chunk${i}`), { profiles, builtAt }));
  await batch.commit();
  return chunks;
}

export default async function handler(req: any, res: any) {
  const idToken = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!idToken) return res.status(401).json({ error: 'Missing token' });

  try {
    getAdminApp();
    const { uid } = await admin.auth().verifyIdToken(idToken);
    const db = admin.firestore();

    if (req.method === 'POST') {
      const userSnap = await db.collection('users').doc(uid).get();
      const p = toPublic(uid, userSnap.data());
      const ref = db.collection(COL).doc(`chunk${chunkOf(uid)}`);
      const value = p ?? admin.firestore.FieldValue.delete();
      await ref.update({ [`profiles.${uid}`]: value }).catch(async () => {
        // Le chunk n'existe pas encore : le prochain GET reconstruira tout.
        if (p) await ref.set({ profiles: { [uid]: p }, builtAt: 0 }, { merge: true });
      });
      return res.status(200).json({ ok: true });
    }

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const docs = await Promise.all(
      Array.from({ length: CHUNKS }, (_, i) => db.collection(COL).doc(`chunk${i}`).get())
    );
    const stale = docs.some(d => !d.exists || !d.data()?.builtAt || Date.now() - d.data()!.builtAt > REBUILD_AFTER_MS);
    const chunks = stale ? await rebuild(db) : docs.map(d => (d.data()!.profiles || {}) as Record<string, unknown>);
    const profiles = chunks.flatMap(c => Object.values(c));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ profiles });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'error' });
  }
}
