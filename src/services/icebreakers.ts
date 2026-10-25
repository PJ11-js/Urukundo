import { UserProfile } from '../types';

// "Musique/Music" -> "Musique" (fr) ou "Music" (en).
const interestLabel = (interest: string, lang: 'fr' | 'en') => {
  const [fr, en] = interest.split('/');
  return (lang === 'en' ? en || fr : fr).trim();
};

// 3 phrases pour lancer une conversation qui n'a encore aucun message, tirées
// du profil de l'autre personne (passions en commun, objectif, prompts, ville)
// avec des classiques burundais en complément. Tout est calculé localement.
export const getIcebreakers = (partner: UserProfile, me: UserProfile | null, lang: 'fr' | 'en'): string[] => {
  const fr = lang === 'fr';
  const ideas: string[] = [];
  const name = partner.name?.split(' ')[0] || '';

  const shared = (partner.interests || []).filter(i => me?.interests?.includes(i));
  const interest = shared[0] || partner.interests?.[0];
  if (interest) {
    const label = interestLabel(interest, lang);
    ideas.push(shared.length
      ? (fr ? `On a un point commun : ${label} ! C'est quoi ton meilleur souvenir avec ça ?` : `We have something in common: ${label}! What's your best memory with it?`)
      : (fr ? `J'ai vu que tu aimes ${label}, raconte-moi comment tu es tombé(e) dedans 😊` : `I saw you like ${label}, how did you get into it? 😊`));
  }

  const prompt = partner.prompts?.find(p => p.answer?.trim());
  if (prompt) {
    ideas.push(fr ? `Ta réponse à « ${prompt.question} » m'a fait sourire, tu peux m'en dire plus ?` : `Your answer to "${prompt.question}" made me smile, tell me more?`);
  }

  const city = partner.location?.split(',')[0]?.trim();
  if (city) {
    ideas.push(fr ? `Comment c'est la vie à ${city} ? Tu y es depuis longtemps ?` : `How's life in ${city}? Have you been there long?`);
  }

  if (partner.details?.relationshipGoal) {
    ideas.push(fr ? `Qu'est-ce qui compte le plus pour toi dans une relation ?` : `What matters most to you in a relationship?`);
  }

  const classics = fr
    ? [`Amahoro ${name} ! Tu viens de quelle province au Burundi ? 🇧🇮`, `Isombe, mukeke ou brochettes : c'est quoi ton plat burundais préféré ?`, `Si on se voyait ce week-end, tu proposerais quoi ?`, `Quelle chanson burundaise tu écoutes en boucle en ce moment ?`]
    : [`Amahoro ${name}! Which province in Burundi are you from? 🇧🇮`, `Isombe, mukeke or brochettes: what's your favourite Burundian dish?`, `If we met up this weekend, what would you suggest?`, `Which Burundian song are you playing on repeat right now?`];
  for (const c of classics) if (ideas.length < 3) ideas.push(c);

  return ideas.slice(0, 3);
};
