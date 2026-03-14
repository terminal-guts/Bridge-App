export interface DBUserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  gender: string[];
  interested_in_genders: string[];
  height_inches: number | null;
  ethnicity: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  hometown: string | null;
  current_job: string | null;
  company_position: string | null;
  education_level: string | null;
  school: string | null;
  religion: string | null;
  political_leaning: string | null;
  has_children: string | null;
  family_plans: string | null;
  drinking_frequency: string | null;
  cannabis_frequency: string | null;
  tobacco_frequency: string | null;
  other_drugs_frequency: string | null;
  interests: string[];
  values: string[];
  bio: string | null;
  photos: any[];
  non_negotiables: any[]; // SCRAPPED — always empty, kept for DB schema compat
  is_paused: boolean;
}

export interface DBUserPreferences {
  id: string;
  user_id: string;
  preferred_gender: string | null;
  age_min: number | null;
  age_max: number | null;
  looking_for: string | null;
  preferred_height_min_inches: number | null;
  preferred_height_max_inches: number | null;
  max_distance: number | null;
  preferred_ethnicities: string[];
  preferred_religions: string[];
  preferred_politics: string[];
  partner_drinking: string[];
  partner_cannabis: string[];
  partner_tobacco: string[];
  partner_other_drugs: string[];
}

export interface DBProposal {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: string;
  compatibility_score: number | null;
  category_scores: Record<string, number>;
  pool_yes_votes: number;
  pool_no_votes: number;
  friend_yes_votes: number;
  friend_no_votes: number;
  pool_eligible: boolean;
  user_a_decision: string;
  user_b_decision: string;
  user_a_decided_at: string | null;
  user_b_decided_at: string | null;
  voting_started_at: string | null;
  voting_expires_at: string | null;
  community_decided_at: string | null;
  passed_to_users_at: string | null;
  decision_deadline_at: string | null;
  confirmed_at: string | null;
  rejected_at: string | null;
  declined_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBProposalVote {
  id: string;
  proposal_id: string;
  voter_user_id: string;
  vote_type: 'YES' | 'NO' | 'UNSURE' | 'RECOMMEND';
  is_friend_vote: boolean;
  friend_of: string | null;
  recommend_to_id: string | null;
  created_at: string;
}

export interface DBDailyPairing {
  id: string;
  pairing_date: string;
  user_id: string;
  partner_id: string;
  compatibility_score: number;
  category_scores: Record<string, number>;
  weighted_scores: Record<string, number>;
  seen: boolean;
  proposal_created: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface CompatibilityResult {
  total_score: number;
  category_scores: Record<string, number>;
  weighted_scores: Record<string, number>;
  raw_scores: Record<string, number>;
}
