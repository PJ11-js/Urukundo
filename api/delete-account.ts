import admin from 'firebase-admin';

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!encoded) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_B64');
  const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

// Supprime les photos/vocaux Cloudinary de l'utilisateur (dossiers urukundo/*/{uid}).
// Nécessite la clé API Cloudinary côté serveur : sans elle, on ignore cette étape.
async function deleteCloudinaryMedia(uid: string) {
  const cloud = process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return false;
  const auth = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
  const targets: [string, string][] = [
    ['image', `urukundo/profiles/${uid}`],
    ['image', `urukundo/chat/${uid}`],
    ['video', `urukundo/voice/${uid}`],
  ];
  for (const [type, prefix] of targets) {
    await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/${type}/upload?prefix=${encodeURIComponent(prefix)}`, {
      method: 'DELETE', headers: { Authorization: auth },
    });
  }
  return true;
}

// Suppression complète d'un compte (exigée par Google Play) : profil, likes, matchs,
// conversations, appels, blocages, historique de l'assistant IA, avis, puis le compte
// de connexion. Les signalements faits CONTRE l'utilisateur sont conservés pour la sécurité.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const idToken = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!idToken) return res.status(401).json({ error: 'Missing token' });

  try {
    getAdminApp();
    const { uid } = await admin.auth().verifyIdToken(idToken);
    const db = admin.firestore();

    const deleteWhere = async (col: string, field: string, op: FirebaseFirestore.WhereFilterOp = '==') => {
      const snap = await db.collection(col).where(field, op, uid).get();
      await Promise.all(snap.docs.map(d => db.recursiveDelete(d.ref)));
    };

    const matches = await db.collection('matches').where('users', 'array-contains', uid).get();
    await Promise.all(matches.docs.map(async m => {
      await db.recursiveDelete(db.collection('chats').doc(m.id));
      await m.ref.delete();
    }));

    await Promise.all([
      deleteWhere('likes', 'fromUserId'),
      deleteWhere('likes', 'toUserId'),
      deleteWhere('blocks', 'blockerId'),
      deleteWhere('blocks', 'blockedId'),
      deleteWhere('calls', 'callerId'),
      deleteWhere('calls', 'calleeId'),
      deleteWhere('reports', 'reporterId'),
      deleteWhere('feedback', 'userId'),
      db.recursiveDelete(db.collection('aiAssistant').doc(uid)),
    ]);

    const mediaDeleted = await deleteCloudinaryMedia(uid).catch(err => { console.error('cloudinary delete failed', err); return false; });

    await db.recursiveDelete(db.collection('users').doc(uid));
    await admin.auth().deleteUser(uid);

    res.status(200).json({ deleted: true, mediaDeleted });
  } catch (err: any) {
    console.error('delete-account failed', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
}
