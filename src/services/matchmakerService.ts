import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('MatchmakerService');

// Roster Entry Model
export interface RosterEntry {
  id: string;
  matchmaker_id: string;
  user_id?: string;
  ghost_profile_id?: string;
  status: 'pending_invite' | 'active' | 'removed';
  created_at: string;
  // Joined fields
  user?: UserProfile;
  ghost_profile?: GhostProfile;
}

// Ghost Profile Model
export interface GhostProfile {
  id: string;
  created_by: string;
  name: string;
  age: number;
  photos: string[];
  bio: string;
  preferences: any;
  invite_token: string;
  claimed_by?: string;
  claimed_at?: string;
  created_at: string;
}

// Introduction Model
export interface Introduction {
  id: string;
  matchmaker_id: string;
  person_a_id: string;
  person_b_id: string;
  note?: string;
  status: 'suggested' | 'a_accepted' | 'b_accepted' | 'mutual_accept' | 'declined';
  person_a_response?: 'pending' | 'accepted' | 'declined';
  person_b_response?: 'pending' | 'accepted' | 'declined';
  created_at: string;
  resolved_at?: string;
}

/**
 * MOCK DATA - To build the UI before the backend endpoints are fully deployed
 */
const MOCK_ROSTER: RosterEntry[] = [
  {
    id: 'roster-1',
    matchmaker_id: 'my-id',
    user_id: 'friend-1',
    status: 'active',
    created_at: new Date().toISOString(),
    user: {
      id: 'friend-1',
      userId: 'friend-1',
      firstName: 'Sarah',
      lastName: 'Smith',
      age: 22,
      gender: ['female'],
      pronouns: 'she/her',
      school: 'Rice University',
      height: "5'6\"",
      ethnicity: 'white',
      religion: 'agnostic',
      politicalLeaning: 'liberal',
      photos: [{ id: 'p1', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', isMain: true, order: 0 }],
      interests: ['Coffee', 'Reading'],
      values: ['Honesty'],
      educationLevel: 'bachelors',
      lifestyle: {},
      preferences: {
        ageMin: 21,
        ageMax: 26,
        gender: 'male',
        lookingFor: 'relationship'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nonNegotiables: [],
    }
  },
  {
    id: 'roster-2',
    matchmaker_id: 'my-id',
    ghost_profile_id: 'ghost-1',
    status: 'pending_invite',
    created_at: new Date().toISOString(),
    ghost_profile: {
      id: 'ghost-1',
      created_by: 'my-id',
      name: 'James',
      age: 23,
      photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'],
      bio: "My roommate, great guy, terrible cook.",
      preferences: { ageMin: 20, ageMax: 24, gender: 'female' },
      invite_token: 'INV-123',
      created_at: new Date().toISOString(),
    }
  }
];

const MOCK_BROWSE: UserProfile[] = [
  {
    id: 'candidate-1',
    userId: 'candidate-1',
    firstName: 'Alex',
    lastName: 'Johnson',
    age: 24,
    gender: ['male'],
    pronouns: 'he/him',
    school: 'Rice University',
    educationLevel: 'bachelors',
    height: "6'0\"",
    ethnicity: 'asian',
    religion: 'none',
    politicalLeaning: 'moderate',
    photos: [{ id: 'c1', url: 'https://images.unsplash.com/photo-1488161628813-044715bd8cbd?w=400', isMain: true, order: 0 }],
    interests: ['Hiking', 'Gaming'],
    values: ['Loyalty'],
    lifestyle: {},
    preferences: { ageMin: 20, ageMax: 25, gender: 'female', lookingFor: 'relationship' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nonNegotiables: [],
    bio: "Looking for someone to explore Houston with.",
  },
  {
    id: 'candidate-2',
    userId: 'candidate-2',
    firstName: 'Emma',
    lastName: 'Davis',
    age: 21,
    gender: ['female'],
    pronouns: 'she/her',
    school: 'Rice University',
    educationLevel: 'some_college',
    height: "5'4\"",
    ethnicity: 'white',
    religion: 'christian',
    politicalLeaning: 'moderate',
    photos: [{ id: 'c2', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', isMain: true, order: 0 }],
    interests: ['Art', 'Music'],
    values: ['Creativity'],
    lifestyle: {},
    preferences: { ageMin: 21, ageMax: 26, gender: 'male', lookingFor: 'relationship' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nonNegotiables: [],
    bio: "Art major, coffee addict.",
  }
];

const MOCK_INTRODUCTIONS: Introduction[] = [
  {
    id: 'intro-1',
    matchmaker_id: 'my-id',
    person_a_id: 'friend-1',
    person_b_id: 'candidate-1',
    note: "You both love coffee!",
    status: 'suggested',
    person_a_response: 'pending',
    person_b_response: 'pending',
    created_at: new Date().toISOString(),
  }
];

/**
 * Get the matchmaker's roster
 */
export async function getRoster(): Promise<{ ok: boolean; data?: RosterEntry[]; error?: any }> {
  // Return mock data for now
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ ok: true, data: MOCK_ROSTER });
    }, 500);
  });
}

/**
 * Browse candidates filtered by active roster preferences
 */
export async function browseCandidates(): Promise<{ ok: boolean; data?: UserProfile[]; error?: any }> {
  // Return mock data for now
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ ok: true, data: MOCK_BROWSE });
    }, 500);
  });
}

/**
 * Get all introductions made by this matchmaker
 */
export async function getIntroductions(): Promise<{ ok: boolean; data?: Introduction[]; error?: any }> {
  // Return mock data for now
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ ok: true, data: MOCK_INTRODUCTIONS });
    }, 500);
  });
}

/**
 * Suggest an introduction between two people
 */
export async function suggestIntroduction(
  personAId: string, 
  personBId: string, 
  note?: string
): Promise<{ ok: boolean; data?: Introduction; error?: any }> {
  // Mock adding an intro
  const newIntro: Introduction = {
    id: `intro-${Date.now()}`,
    matchmaker_id: 'my-id',
    person_a_id: personAId,
    person_b_id: personBId,
    note,
    status: 'suggested',
    person_a_response: 'pending',
    person_b_response: 'pending',
    created_at: new Date().toISOString(),
  };
  
  MOCK_INTRODUCTIONS.unshift(newIntro);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ ok: true, data: newIntro });
    }, 500);
  });
}
