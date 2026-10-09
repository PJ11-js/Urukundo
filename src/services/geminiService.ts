import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string || '';

// Gemini renvoie parfois une 503 "high demand" transitoire (observé en test) —
// on retente une ou deux fois avant d'abandonner, plutôt que de faire échouer
// la conversation sur un simple pic de charge côté Google.
const withRetry = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const status = error?.status || error?.httpStatus;
      const isTransient = status === 503 || status === 429 || /overloaded|high demand/i.test(error?.message || '');
      if (!isTransient || attempt >= retries) throw error;
      await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
    }
  }
};

export const generateBio = async (interests: string[], name: string): Promise<string> => {
  try {
    if (!apiKey) return "Looking for a meaningful connection. Amahoro! 🇧🇮";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(
      `Create a charming, authentic Burundian dating bio for someone named ${name} who likes ${interests.join(', ')}. Keep it warm, use a bit of Kirundi if appropriate (like 'Amahoro'), and make it engaging. Max 2 sentences.`
    );
    return result.response.text() || "I'm looking for someone special to share life's adventures with.";
  } catch (error) {
    console.error('Error generating bio:', error);
    return 'Looking for a meaningful connection in Burundi. Amahoro! 🇧🇮';
  }
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const moderateImage = async (file: File): Promise<boolean> => {
  try {
    if (!apiKey) return true;
    const base64 = await fileToBase64(file);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } },
      { text: 'You are a content moderator for a dating app. You will be shown an image a user wants to use as their profile photo. Reply UNSAFE only if the image clearly contains one of: nudity or sexual content, graphic violence or gore, firearms/weapons as the main subject, or hate symbols. For everything else — including normal photos of people, pets, landscapes, screenshots, memes, or any other everyday image — reply SAFE. Reply with exactly one word: SAFE or UNSAFE, nothing else.' },
    ]);
    const text = (result.response.text() || '').trim().toUpperCase();
    return !text.includes('UNSAFE');
  } catch (error) {
    console.error('Error moderating image:', error);
    return true; // ne bloque pas l'upload si la modération est indisponible
  }
};

const urlToBase64 = async (url: string): Promise<{ data: string; mimeType: string }> => {
  const res = await fetch(url);
  const blob = await res.blob();
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return { data, mimeType: blob.type || 'image/jpeg' };
};

// Vérification d'identité : compare un selfie pris en direct à la photo de
// profil existante. Sans clé API on ne peut pas vérifier honnêtement, donc
// on refuse le badge plutôt que de l'accorder par défaut (contraire à
// moderateImage, qui fail-open par prudence sur un blocage non voulu).
export const verifyIdentitySelfie = async (selfieFile: File, profilePhotoUrl: string): Promise<boolean> => {
  try {
    if (!apiKey) return false;
    const [selfieBase64, profile] = await Promise.all([
      fileToBase64(selfieFile),
      urlToBase64(profilePhotoUrl),
    ]);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await withRetry(() => model.generateContent([
      { inlineData: { data: profile.data, mimeType: profile.mimeType } },
      { inlineData: { data: selfieBase64, mimeType: selfieFile.type || 'image/jpeg' } },
      { text: 'The first image is a dating app profile photo. The second image is a live selfie just taken by the account holder to verify their identity. Reply MATCH if the two images plausibly show the same person (allow for different lighting, angle, expression, or photo quality/filters). Reply NO_MATCH if they clearly show different people, or if the second image does not clearly show a single human face. Reply with exactly one word: MATCH or NO_MATCH.' },
    ]));
    const text = (result.response.text() || '').trim().toUpperCase();
    return text.includes('MATCH') && !text.includes('NO_MATCH');
  } catch (error) {
    console.error('Error verifying identity:', error);
    return false;
  }
};

interface ChatMessage {
  senderId: string;
  text: string;
}

export const getConversationStarter = async (
  partnerName: string,
  partnerInterests: string[],
  currentUserId: string,
  messages: ChatMessage[] = [],
  lang: 'fr' | 'en' = 'fr'
): Promise<string> => {
  const langInstruction = lang === 'fr' ? 'Réponds en français.' : 'Reply in English.';
  const fallback = lang === 'fr' ? `Salut ${partnerName} ! Comment se passe ta journée ?` : `Hi ${partnerName}! How is your day going?`;
  try {
    if (!apiKey) return fallback;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const recentHistory = messages.slice(-6)
      .map(m => `${m.senderId === currentUserId ? 'Moi' : partnerName}: ${m.text}`)
      .join('\n');
    const lastFromPartner = [...messages].reverse().find(m => m.senderId !== currentUserId);

    const prompt = lastFromPartner
      ? `Tu es un assistant qui aide quelqu'un à répondre sur une app de rencontre burundaise. Voici les derniers messages de la conversation avec ${partnerName} :\n${recentHistory}\n\nPropose une réponse courte, naturelle et bienveillante au dernier message de ${partnerName} ("${lastFromPartner.text}"). ${langInstruction} Ne mets pas de guillemets, donne juste le message à envoyer.`
      : `Génère un message d'ouverture créatif et respectueux pour une app de rencontre. La personne s'appelle ${partnerName} et aime ${partnerInterests.join(', ') || 'rencontrer de nouvelles personnes'}. Le contexte est le Burundi (Bujumbura/Gitega). ${langInstruction} Reste court et chaleureux. Ne mets pas de guillemets, donne juste le message à envoyer.`;

    const result = await withRetry(() => model.generateContent(prompt));
    return result.response.text()?.trim() || fallback;
  } catch (error) {
    console.error('Error generating starter:', error);
    return fallback;
  }
};

export interface AssistantMessage {
  role: 'user' | 'model';
  text: string;
}

export const chatWithAssistant = async (
  history: AssistantMessage[],
  userMessage: string,
  matchesContext: string | null,
  lang: 'fr' | 'en' = 'fr'
): Promise<string> => {
  const langInstruction = lang === 'fr' ? 'Réponds toujours en français.' : 'Always reply in English.';
  const fallback = lang === 'fr'
    ? "Désolé, je n'arrive pas à répondre pour le moment. Réessaie plus tard."
    : "Sorry, I can't respond right now. Try again later.";
  try {
    if (!apiKey) return fallback;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const systemContext = `Tu es l'assistant personnel de l'app de rencontre Urukundo (diaspora burundaise). Tu donnes des conseils de drague, tu aides à formuler des messages, et des conseils de sécurité en rencontre. Sois chaleureux, bienveillant et concis. ${langInstruction}` +
      (matchesContext
        ? `\n\nL'utilisateur a autorisé l'accès à ses conversations de matchs pour que tu puisses l'aider plus précisément. Voici un résumé de ses matchs actuels et leur dernier message :\n${matchesContext}`
        : "\n\nL'utilisateur n'a PAS autorisé l'accès à ses conversations de matchs : donne uniquement des conseils généraux, et si on te demande d'analyser une conversation précise, explique poliment que tu n'y as pas accès tant que ce n'est pas activé dans les réglages.");

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: lang === 'fr' ? 'Compris, je suis prêt à aider ! 🇧🇮' : 'Got it, ready to help! 🇧🇮' }] },
        ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      ],
    });
    const result = await withRetry(() => chat.sendMessage(userMessage));
    return result.response.text()?.trim() || fallback;
  } catch (error) {
    console.error('Error in assistant chat:', error);
    return fallback;
  }
};
