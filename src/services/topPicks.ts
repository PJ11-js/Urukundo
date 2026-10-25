import { UserProfile } from '../types';

// Petit hash stable : même jour + même profil = même valeur, pour que la
// sélection ne change pas à chaque ouverture mais se renouvelle chaque jour.
const dailyJitter = (id: string) => {
  const key = `${new Date().toDateString()}_${id}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return (Math.abs(h) % 100) / 100;
};

const DAY = 24 * 60 * 60 * 1000;

// Score de compatibilité façon "Top Picks" de Tinder, calculé localement à
// partir des profils déjà chargés pour la découverte.
export const compatibilityScore = (p: UserProfile, me: UserProfile): number => {
  let score = 0;
  const sharedInterests = (p.interests || []).filter(i => me.interests?.includes(i)).length;
  score += sharedInterests * 2;
  if (p.details?.relationshipGoal && p.details.relationshipGoal === me.details?.relationshipGoal) score += 3;
  if (p.details?.religion && p.details.religion === me.details?.religion) score += 1;
  score += (p.details?.languages || []).filter(l => me.details?.languages?.includes(l)).length;
  if (p.details?.children && p.details.children === me.details?.children) score += 1;
  if ((p.images?.length || 0) >= 2) score += 1;
  if (p.bio?.trim()) score += 1;
  if (p.identityVerified) score += 2;
  if (p.lastSeen && Date.now() - p.lastSeen < 3 * DAY) score += 1;
  if (p.distance !== undefined && p.distance < 50) score += 1;
  return score + dailyJitter(p.id);
};

export const sharedInterests = (p: UserProfile, me: UserProfile) =>
  (p.interests || []).filter(i => me.interests?.includes(i));

export const getTopPicks = (profiles: UserProfile[], me: UserProfile | null, count = 10): UserProfile[] => {
  if (!me) return [];
  return profiles
    .filter(p => p.images?.length)
    .map(p => ({ p, s: compatibilityScore(p, me) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map(x => x.p);
};
