import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string || '';

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

export const getConversationStarter = async (
  partnerName: string,
  partnerInterests: string[]
): Promise<string> => {
  try {
    if (!apiKey) return `Hello ${partnerName}! How is your day going?`;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(
      `Generate a creative and respectful first message for a dating app. The person's name is ${partnerName} and they like ${partnerInterests.join(', ')}. The context is Burundi (Bujumbura/Gitega). Keep it short and friendly.`
    );
    return result.response.text() || 'Hello! I saw your profile and thought we might have some things in common.';
  } catch (error) {
    console.error('Error generating starter:', error);
    return `Hi ${partnerName}! How is your day going?`;
  }
};
