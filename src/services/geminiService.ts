import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string || '';

export const generateBio = async (interests: string[], name: string): Promise<string> => {
  try {
    if (!apiKey) return "Looking for a meaningful connection. Amahoro! 🇧🇮";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(
      `Create a charming, authentic Burundian dating bio for someone named ${name} who likes ${interests.join(', ')}. Keep it warm, use a bit of Kirundi if appropriate (like 'Amahoro'), and make it engaging. Max 2 sentences.`
    );
    return result.response.text() || "I'm looking for someone special to share life's adventures with.";
  } catch (error) {
    console.error('Error generating bio:', error);
    return 'Looking for a meaningful connection in Burundi. Amahoro! 🇧🇮';
  }
};

export const getConversationStarter = async (
  partnerName: string,
  partnerInterests: string[]
): Promise<string> => {
  try {
    if (!apiKey) return `Hello ${partnerName}! How is your day going?`;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(
      `Generate a creative and respectful first message for a dating app. The person's name is ${partnerName} and they like ${partnerInterests.join(', ')}. The context is Burundi (Bujumbura/Gitega). Keep it short and friendly.`
    );
    return result.response.text() || 'Hello! I saw your profile and thought we might have some things in common.';
  } catch (error) {
    console.error('Error generating starter:', error);
    return `Hi ${partnerName}! How is your day going?`;
  }
};
