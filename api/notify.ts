import admin from 'firebase-admin';

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!encoded) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_B64');
  const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { toUserId, title, body } = req.body || {};
  if (!toUserId || !title || !body) return res.status(400).json({ error: 'Missing fields' });

  try {
    getAdminApp();
    const firestore = admin.firestore();
    const userSnap = await firestore.collection('users').doc(toUserId).get();
    const tokens: string[] = userSnap.data()?.fcmTokens || [];
    if (tokens.length === 0) return res.status(200).json({ sent: 0 });

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: { fcmOptions: { link: '/' } },
    });

    // Retire les tokens expirés/invalides renvoyés par FCM.
    const invalidTokens = response.responses
      .map((r, i) => (!r.success ? tokens[i] : null))
      .filter((tok): tok is string => !!tok);
    if (invalidTokens.length > 0) {
      await firestore.collection('users').doc(toUserId).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
      });
    }

    res.status(200).json({ sent: response.successCount });
  } catch (err: any) {
    console.error('notify failed', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
}
