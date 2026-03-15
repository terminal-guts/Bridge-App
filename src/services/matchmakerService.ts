import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { createLogger } from '../utils/secureLogger';
import { getAuthenticatedUserId } from '../utils/auth';

const logger = createLogger('MatchmakerService');

/**
 * Minimal snake_case → UserProfile mapper for matchmaker browse results.
 * The full mapper lives in profileService.ts but importing it creates a circular dep.
 */
function mapRawToUserProfile(raw: Record<string, any>): UserProfile {
  return {
    id: raw.id,
    userId: raw.user_id || raw.id,
    firstName: raw.first_name || 'User',
    lastName: raw.last_name || '',
    age: raw.age,
    gender: raw.gender || [],
    pronouns: raw.pronouns || '',
    pronounsList: raw.pronouns_list || [],
    interestedInGenders: raw.interested_in_genders || [],
    height: raw.height_inches ? `${Math.floor(raw.height_inches / 12)}'${raw.height_inches % 12}"` : '',
    ethnicity: raw.ethnicity || '',
    religion: raw.religion || '',
    politicalLeaning: raw.political_leaning || '',
    school: raw.school,
    currentJob: raw.current_job,
    bio: raw.bio || '',
    photos: ((raw.photos as Array<Record<string, unknown>>) || []).map((p) => ({
      id: (p.id || p.url) as string,
      url: p.url as string,
      isMain: (p.is_main || false) as boolean,
      order: (p.display_order || 0) as number,
    })),
    interests: raw.interests || [],
    values: raw.values || [],
    lifestyle: raw.lifestyle || {},
    preferences: {
      ageMin: raw.preferences?.age_min ?? 22,
      ageMax: raw.preferences?.age_max ?? 30,
      gender: 'both',
      lookingFor: raw.preferences?.looking_for ?? 'relationship',
    },
    nonNegotiables: [],
    createdAt: raw.created_at || new Date().toISOString(),
    updatedAt: raw.updated_at || new Date().toISOString(),
    role: raw.role || 'dater',
  } as UserProfile;
}

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
    
    // Map nested user data from snake_case to UserProfile
    const mapped = (data || []).map(entry => ({
      ...entry,
      user: entry.user ? mapRawToUserProfile(entry.user) : undefined,
    }));

    return { ok: true, data: mapped as RosterEntry[] };
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
    const filteredProfiles = (data || [])
      .filter(p => !rosterIds.has(p.user_id))
      .map(mapRawToUserProfile);

    return { ok: true, data: filteredProfiles };
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

    // Map nested user data from snake_case to UserProfile
    const mapped = (data || []).map(intro => ({
      ...intro,
      person_a: intro.person_a ? mapRawToUserProfile(intro.person_a) : undefined,
      person_b: intro.person_b ? mapRawToUserProfile(intro.person_b) : undefined,
    }));

    return { ok: true, data: mapped as Introduction[] };
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

/**
 * Remove someone from the matchmaker's roster (soft delete)
 */
export async function removeFromRoster(
  rosterId: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('roster')
      .update({ status: 'removed' })
      .eq('id', rosterId)
      .eq('matchmaker_id', userId); // Ensure ownership

    if (error) throw error;
    return { ok: true };
  } catch (error) {
    logger.error('Error removing from roster:', error);
    return { ok: false, error };
  }
}

/**
 * Respond to an introduction (called by a dater, not matchmaker).
 * Automatically resolves the top-level status when both parties have responded.
 */
export async function respondToIntroduction(
  introId: string,
  response: 'accepted' | 'declined'
): Promise<{ ok: boolean; error?: any }> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error('Not authenticated');

    // Determine which person the current user is
    const { data: intro, error: fetchError } = await supabase
      .from('introductions')
      .select('person_a_id, person_b_id, person_a_response, person_b_response')
      .eq('id', introId)
      .single();

    if (fetchError || !intro) throw fetchError || new Error('Introduction not found');

    const isPersonA = intro.person_a_id === userId;
    const isPersonB = intro.person_b_id === userId;
    if (!isPersonA && !isPersonB) throw new Error('You are not part of this introduction');

    const updateCol = isPersonA ? 'person_a_response' : 'person_b_response';
    const otherResponse = isPersonA ? intro.person_b_response : intro.person_a_response;

    // Determine new top-level status
    let newStatus: string = 'suggested';
    if (response === 'declined') {
      newStatus = 'declined';
    } else if (otherResponse === 'accepted') {
      newStatus = 'mutual_accept';
    } else {
      newStatus = isPersonA ? 'a_accepted' : 'b_accepted';
    }

    const update: Record<string, any> = {
      [updateCol]: response,
      status: newStatus,
    };
    if (newStatus === 'mutual_accept' || newStatus === 'declined') {
      update.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('introductions')
      .update(update)
      .eq('id', introId);

    if (error) throw error;
    return { ok: true };
  } catch (error) {
    logger.error('Error responding to introduction:', error);
    return { ok: false, error };
  }
}
