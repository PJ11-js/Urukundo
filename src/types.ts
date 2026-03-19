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
