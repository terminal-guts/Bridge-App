import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { createLogger } from '../utils/secureLogger';
import { getAuthenticatedUserId } from '../utils/auth';

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
  // Joined info for UI
  person_a?: UserProfile;
  person_b?: UserProfile;
}

/**
 * Get the matchmaker's roster
 */
export async function getRoster(): Promise<{ ok: boolean; data?: RosterEntry[]; error?: any }> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('roster')
      .select('*, user:user_id(*), ghost_profile:ghost_profile_id(*)')
      .eq('matchmaker_id', userId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Map to UserProfile types if needed (photo handling etc.)
    return { ok: true, data: data as RosterEntry[] };
  } catch (error) {
    logger.error('Error fetching roster:', error);
    return { ok: false, error };
  }
}

/**
 * Browse candidates filtered by active roster preferences
 */
export async function browseCandidates(): Promise<{ ok: boolean; data?: UserProfile[]; error?: any }> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error('Not authenticated');

    // In a real app, this would be a complex RPC or filtered query
    // For now, we fetch all daters who aren't the current user and aren't matchmakers
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .neq('user_id', userId)
      .eq('role', 'dater') // Essential: Matchmakers never show up in browse
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Filter out users already in roster (frontend filtering for now, should be server-side)
    const { data: rosterData } = await supabase
      .from('roster')
      .select('user_id')
      .eq('matchmaker_id', userId);
    
    const rosterIds = new Set((rosterData || []).map(r => r.user_id).filter(Boolean));
    const filteredProfiles = (data || []).filter(p => !rosterIds.has(p.user_id));

    return { ok: true, data: filteredProfiles as UserProfile[] };
  } catch (error) {
    logger.error('Error browsing candidates:', error);
    return { ok: false, error };
  }
}

/**
 * Get all introductions made by this matchmaker
 */
export async function getIntroductions(): Promise<{ ok: boolean; data?: Introduction[]; error?: any }> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('introductions')
      .select('*, person_a:person_a_id(*), person_b:person_b_id(*)')
      .eq('matchmaker_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { ok: true, data: data as Introduction[] };
  } catch (error) {
    logger.error('Error fetching introductions:', error);
    return { ok: false, error };
  }
}

/**
 * Suggest an introduction between two people
 */
export async function suggestIntroduction(
  personAId: string, 
  personBId: string, 
  note?: string
): Promise<{ ok: boolean; data?: Introduction; error?: any }> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('introductions')
      .insert({
        matchmaker_id: userId,
        person_a_id: personAId,
        person_b_id: personBId,
        note,
        status: 'suggested',
        person_a_response: 'pending',
        person_b_response: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return { ok: true, data: data as Introduction };
  } catch (error) {
    logger.error('Error suggesting introduction:', error);
    return { ok: false, error };
  }
}

/**
 * Create a ghost profile and add it to the roster
 */
export async function createGhostProfile(
  ghostData: Partial<GhostProfile>
): Promise<{ ok: boolean; data?: GhostProfile; error?: any }> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error('Not authenticated');

    const token = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data: ghost, error: ghostError } = await supabase
      .from('ghost_profiles')
      .insert({
        created_by: userId,
        name: ghostData.name,
        age: ghostData.age,
        photos: ghostData.photos || [],
        bio: ghostData.bio,
        preferences: ghostData.preferences || {},
        invite_token: token
      })
      .select()
      .single();

    if (ghostError) throw ghostError;

    // Add to roster immediately
    const { error: rosterError } = await supabase
      .from('roster')
      .insert({
        matchmaker_id: userId,
        ghost_profile_id: ghost.id,
        status: 'pending_invite'
      });

    if (rosterError) throw rosterError;

    return { ok: true, data: ghost as GhostProfile };
  } catch (error) {
    logger.error('Error creating ghost profile:', error);
    return { ok: false, error };
  }
}
