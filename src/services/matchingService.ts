import { UserProfile } from '../types';

export const calculateCompatibility = (user: UserProfile, candidate: UserProfile): number => {
  let score = 0;

  // Intérêts communs (50% du score)
  const commonInterests = user.interests.filter(i => candidate.interests.includes(i));
  score += (commonInterests.length / Math.max(user.interests.length, 1)) * 50;

  // Distance (30% du score) — plus proche = meilleur score
  if (candidate.distance !== undefined) {
    if (candidate.distance < 10) score += 30;
    else if (candidate.distance < 50) score += 20;
    else if (candidate.distance < 200) score += 10;
    else score += 5;
  }

  // Tranche d'âge proche (20% du score)
  const ageDiff = Math.abs(user.age - candidate.age);
  if (ageDiff < 3) score += 20;
  else if (ageDiff < 7) score += 15;
  else if (ageDiff < 10) score += 10;
  else score += 5;

  return Math.round(score);
};

export const isMatch = (compatibility: number): boolean => {
  // Plus la compatibilité est haute, plus la chance de match est grande
  const matchProbability = 0.2 + (compatibility / 100) * 0.6;
  return Math.random() < matchProbability;
};
