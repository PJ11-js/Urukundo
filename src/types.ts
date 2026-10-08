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
  isDemo?: boolean;
  lang?: 'fr' | 'en';
  isOnline?: boolean;
  lastSeen?: number;
  country?: string;
  locationVerified?: boolean;
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
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
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
