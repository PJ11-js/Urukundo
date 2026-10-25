export interface UserProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  location: string;
  images: string[];
  interests: string[];
  distance?: number;
  email?: string;
  photoURL?: string;
  gender?: 'homme' | 'femme';
  lookingFor?: 'homme' | 'femme' | 'tous';
  lang?: 'fr' | 'en';
  isOnline?: boolean;
  lastSeen?: number;
  country?: string;
  locationVerified?: boolean;
  identityVerified?: boolean;
  lat?: number;
  lng?: number;
  isPremium?: boolean;
  theme?: 'light' | 'dark' | 'soft';
  hidden?: boolean;
  settings?: { ageMin: number; ageMax: number; distance: number; gender: 'hommes' | 'femmes' | 'tous' };
  prompts?: { question: string; answer: string }[];
  lastSuperLikeAt?: number;
  lastBoostAt?: number;
  boostedUntil?: number;
  fcmTokens?: string[];
  aiConsent?: boolean;
  details?: ProfileDetails;
}

// Infos "Essentiels / Mode de vie / Je cherche" façon Tinder, toutes optionnelles.
export interface ProfileDetails {
  relationshipGoal?: string;
  height?: number;
  job?: string;
  education?: string;
  religion?: string;
  languages?: string[];
  smoking?: string;
  drinking?: string;
  children?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  deletedFor?: string[];
  deletedForEveryone?: boolean;
  reactions?: Record<string, string>;
}

export interface ChatSession {
  id: string;
  partner: UserProfile;
  messages: Message[];
}

export enum AppScreen {
  LOGIN = 'LOGIN',
  SETUP = 'SETUP',
  DISCOVERY = 'DISCOVERY',
  LIKES = 'LIKES',
  MESSAGES = 'MESSAGES',
  PROFILE = 'PROFILE',
  CHAT = 'CHAT',
}
