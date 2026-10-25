import { UserProfile, ProfileDetails } from '../types';

// Choix proposés pour les infos de profil façon Tinder ("Je cherche",
// "Essentiels", "Mode de vie"). Les valeurs stockées sont les libellés FR.
export const RELATIONSHIP_GOALS = [
  { value: 'Relation sérieuse', emoji: '💍', en: 'Serious relationship' },
  { value: 'Mariage', emoji: '👰🏾', en: 'Marriage' },
  { value: 'Relation, mais ouvert(e) à tout', emoji: '😍', en: 'Relationship, open to anything' },
  { value: 'Faire connaissance', emoji: '🥂', en: 'Getting to know people' },
  { value: 'Amitié', emoji: '🤝', en: 'Friendship' },
  { value: 'Je ne sais pas encore', emoji: '🤔', en: 'Still figuring it out' },
];

export const RELIGIONS = ['Catholique', 'Protestant(e)', 'Adventiste', 'Musulman(e)', 'Pentecôtiste', 'Autre', 'Sans religion'];
export const LANGUAGES = ['Kirundi', 'Français', 'English', 'Kiswahili', 'Kinyarwanda', 'Nederlands', 'Deutsch', 'Español'];
export const SMOKING = ['Non-fumeur', 'Fumeur occasionnel', 'Fumeur'];
export const DRINKING = ['Jamais', 'Occasionnellement', 'En soirée', 'Souvent'];
export const CHILDREN = ["J'en veux", "Je n'en veux pas", "J'en ai et j'en veux d'autres", "J'en ai, pas d'autres", 'Pas encore sûr(e)'];
export const EDUCATION = ['Secondaire', 'Bachelier / Licence', 'Master', 'Doctorat', 'Formation professionnelle', 'En études'];

// Liste élargie des passions (les 12 de l'inscription + d'autres), modifiable
// depuis le profil comme les "Passions" de Tinder.
export const ALL_INTERESTS = [
  'Musique/Music', 'Danse/Dance', 'Football', 'Voyage/Travel', 'Cuisine/Cooking', 'Art', 'Tech',
  'Lecture/Reading', 'Cinéma/Cinema', 'Nature', 'Sport', 'Mode/Fashion',
  'Église/Church', 'Tambours/Drums', 'Basket', 'Fitness', 'Photo', 'Gaming', 'Entrepreneuriat',
  'Bénévolat', 'Afrobeats', 'Séries', 'Plage', 'Randonnée', 'Café', 'Animaux',
];

export const relationshipGoalLabel = (value: string, lang: 'fr' | 'en' = 'fr') => {
  const g = RELATIONSHIP_GOALS.find(r => r.value === value);
  if (!g) return value;
  return `${g.emoji} ${lang === 'en' ? g.en : g.value}`;
};

// Petites pastilles affichées sur la carte et dans la vue détaillée.
export const detailChips = (d: ProfileDetails | undefined): { icon: string; label: string }[] => {
  if (!d) return [];
  const chips: { icon: string; label: string }[] = [];
  if (d.height) chips.push({ icon: 'fa-ruler-vertical', label: `${d.height} cm` });
  if (d.job) chips.push({ icon: 'fa-briefcase', label: d.job });
  if (d.education) chips.push({ icon: 'fa-graduation-cap', label: d.education });
  if (d.religion) chips.push({ icon: 'fa-hands-praying', label: d.religion });
  if (d.languages?.length) chips.push({ icon: 'fa-language', label: d.languages.join(', ') });
  if (d.children) chips.push({ icon: 'fa-baby', label: d.children });
  if (d.smoking) chips.push({ icon: 'fa-smoking', label: d.smoking });
  if (d.drinking) chips.push({ icon: 'fa-wine-glass', label: d.drinking });
  return chips;
};

const ONLINE_WINDOW = 10 * 60 * 1000;
const RECENT_WINDOW = 24 * 60 * 60 * 1000;

// Vrai statut d'activité (avant, la carte affichait "En ligne" pour tout le monde).
export const activityStatus = (p: Pick<UserProfile, 'isOnline' | 'lastSeen'>, lang: 'fr' | 'en' = 'fr'): { label: string; online: boolean } | null => {
  if (!p.lastSeen) return null;
  const ago = Date.now() - p.lastSeen;
  if (p.isOnline && ago < ONLINE_WINDOW) return { label: lang === 'fr' ? 'En ligne' : 'Online', online: true };
  if (ago < RECENT_WINDOW) return { label: lang === 'fr' ? 'Actif récemment' : 'Recently active', online: false };
  return null;
};
