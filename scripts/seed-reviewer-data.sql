-- ============================================================================
-- seed-reviewer-data.sql — Create the Demo Bubble for App Store Review
-- ============================================================================
-- Run ONCE in the Supabase SQL Editor (or via supabase-exec.sh).
-- Creates 6 demo users + friendships + karma.  Idempotent (ON CONFLICT).
--
-- ISOLATION RULES — READ BEFORE MODIFYING:
--   1. ALL demo users have profile_completed = false  (keeps them out of matchmaking)
--   2. ALL demo emails use @demo.bridgedate.app  (domain NOT in allowed_email_domains)
--   3. Demo users ONLY interact with other demo users and the reviewer
--   4. See docs/DEMO_ACCOUNTS.md for full bubble rules
--
-- After running this, run reset-reviewer-demo.sql to create match + proposals.
-- ============================================================================

DO $$
DECLARE
  reviewer_id UUID := '8b63fbb9-9b91-46eb-9d45-7ad0942affc6';

  -- Fixed UUIDs for demo users (pattern: d0000001-de10-4000-a000-*)
  emma_id    UUID := 'd0000001-de10-4000-a000-000000000001';
  jordan_id  UUID := 'd0000002-de10-4000-a000-000000000002';
  sophie_id  UUID := 'd0000003-de10-4000-a000-000000000003';
  marcus_id  UUID := 'd0000004-de10-4000-a000-000000000004';
  lily_id    UUID := 'd0000005-de10-4000-a000-000000000005';
  alex_id    UUID := 'd0000006-de10-4000-a000-000000000006';

BEGIN

  -- ========================================================================
  -- 0. TEMPORARILY ALLOW demo.bridgedate.app emails
  --    The validate_email_domain trigger on auth.users rejects non-Rice emails.
  --    We add the domain, create users, then remove it at the end.
  -- ========================================================================
  INSERT INTO public.allowed_email_domains (domain, is_active)
  VALUES ('demo.bridgedate.app', true)
  ON CONFLICT DO NOTHING;

  -- ========================================================================
  -- 1. FIX REVIEWER PROFILE (religion + pronouns + bio)
  --    This brings profile strength from 97% to 100%, unlocking the Match tab.
  -- ========================================================================
  UPDATE user_profiles SET
    religion = 'Agnostic',
    pronouns = 'She/Her',
    bio = 'Just here to explore and connect!'
  WHERE user_id = reviewer_id;

  RAISE NOTICE 'Reviewer profile fixed (religion, pronouns, bio).';

  -- ========================================================================
  -- 2. CREATE 6 DEMO AUTH USERS
  --    ON CONFLICT DO NOTHING so this is safe to re-run.
  -- ========================================================================
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data)
  VALUES
    (emma_id,   '00000000-0000-0000-0000-000000000000', 'emma@demo.bridgedate.app',   crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}'),
    (jordan_id, '00000000-0000-0000-0000-000000000000', 'jordan@demo.bridgedate.app', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}'),
    (sophie_id, '00000000-0000-0000-0000-000000000000', 'sophie@demo.bridgedate.app', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}'),
    (marcus_id, '00000000-0000-0000-0000-000000000000', 'marcus@demo.bridgedate.app', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}'),
    (lily_id,   '00000000-0000-0000-0000-000000000000', 'lily@demo.bridgedate.app',   crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}'),
    (alex_id,   '00000000-0000-0000-0000-000000000000', 'alex@demo.bridgedate.app',   crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Demo auth users created (or already exist).';

  -- ========================================================================
  -- 3. CREATE AUTH IDENTITIES (required for Supabase auth)
  -- ========================================================================
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES
    (emma_id,   emma_id,   'emma@demo.bridgedate.app',   'email', jsonb_build_object('sub', emma_id::text,   'email', 'emma@demo.bridgedate.app'),   now(), now(), now()),
    (jordan_id, jordan_id, 'jordan@demo.bridgedate.app', 'email', jsonb_build_object('sub', jordan_id::text, 'email', 'jordan@demo.bridgedate.app'), now(), now(), now()),
    (sophie_id, sophie_id, 'sophie@demo.bridgedate.app', 'email', jsonb_build_object('sub', sophie_id::text, 'email', 'sophie@demo.bridgedate.app'), now(), now(), now()),
    (marcus_id, marcus_id, 'marcus@demo.bridgedate.app', 'email', jsonb_build_object('sub', marcus_id::text, 'email', 'marcus@demo.bridgedate.app'), now(), now(), now()),
    (lily_id,   lily_id,   'lily@demo.bridgedate.app',   'email', jsonb_build_object('sub', lily_id::text,   'email', 'lily@demo.bridgedate.app'),   now(), now(), now()),
    (alex_id,   alex_id,   'alex@demo.bridgedate.app',   'email', jsonb_build_object('sub', alex_id::text,   'email', 'alex@demo.bridgedate.app'),   now(), now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ========================================================================
  -- 4. CREATE DEMO USER PROFILES
  --    CRITICAL: profile_completed = false on ALL demo users.
  --    This keeps them out of the matchmaking pool.
  -- ========================================================================

  -- Emma W. — Reviewer's match partner + friend
  INSERT INTO user_profiles (
    user_id, first_name, last_name, age, gender, pronouns, pronouns_list,
    interested_in_genders, height_inches, ethnicity, religion, political_leaning,
    has_children, family_plans, drinking_frequency, cannabis_frequency,
    tobacco_frequency, other_drugs_frequency, school, location,
    interests, values, bio, current_job, is_verified, profile_completed, role
  ) VALUES (
    emma_id, 'Emma', 'W.', 21, ARRAY['Woman'], 'She/Her', ARRAY['She','Her','Hers'],
    ARRAY['Man'], 65, 'White/Caucasian', 'Agnostic', 'liberal',
    'no', 'want_children', 'socially', 'never',
    'never', 'never', 'Rice University', 'Houston, TX',
    ARRAY['Photography','Yoga','Cooking','Travel','Coffee'], ARRAY['Honesty','Growth','Kindness'],
    'Coffee enthusiast and sunset chaser. Love exploring new restaurants and hiking trails.',
    'Student', true, false, 'dater'
  ) ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
    age = EXCLUDED.age, gender = EXCLUDED.gender, pronouns = EXCLUDED.pronouns,
    pronouns_list = EXCLUDED.pronouns_list, interested_in_genders = EXCLUDED.interested_in_genders,
    height_inches = EXCLUDED.height_inches, ethnicity = EXCLUDED.ethnicity,
    religion = EXCLUDED.religion, political_leaning = EXCLUDED.political_leaning,
    has_children = EXCLUDED.has_children, family_plans = EXCLUDED.family_plans,
    drinking_frequency = EXCLUDED.drinking_frequency, cannabis_frequency = EXCLUDED.cannabis_frequency,
    tobacco_frequency = EXCLUDED.tobacco_frequency, other_drugs_frequency = EXCLUDED.other_drugs_frequency,
    school = EXCLUDED.school, location = EXCLUDED.location,
    interests = EXCLUDED.interests, values = EXCLUDED.values,
    bio = EXCLUDED.bio, current_job = EXCLUDED.current_job,
    is_verified = EXCLUDED.is_verified, profile_completed = false;

  -- Jordan T. — Reviewer's friend + endorser + proposal subject
  INSERT INTO user_profiles (
    user_id, first_name, last_name, age, gender, pronouns, pronouns_list,
    interested_in_genders, height_inches, ethnicity, religion, political_leaning,
    has_children, family_plans, drinking_frequency, cannabis_frequency,
    tobacco_frequency, other_drugs_frequency, school, location,
    interests, values, bio, current_job, is_verified, profile_completed, role
  ) VALUES (
    jordan_id, 'Jordan', 'T.', 22, ARRAY['Man'], 'He/Him', ARRAY['He','Him','His'],
    ARRAY['Woman'], 72, 'Black', 'Christian', 'moderate',
    'no', 'want_children', 'socially', 'never',
    'never', 'never', 'Rice University', 'Houston, TX',
    ARRAY['Music','Basketball','Reading','Film'], ARRAY['Loyalty','Communication','Growth'],
    'Aspiring filmmaker with a love for indie music. Always down for a pickup game.',
    'Student', true, false, 'dater'
  ) ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
    age = EXCLUDED.age, gender = EXCLUDED.gender, pronouns = EXCLUDED.pronouns,
    pronouns_list = EXCLUDED.pronouns_list, interested_in_genders = EXCLUDED.interested_in_genders,
    height_inches = EXCLUDED.height_inches, ethnicity = EXCLUDED.ethnicity,
    religion = EXCLUDED.religion, political_leaning = EXCLUDED.political_leaning,
    has_children = EXCLUDED.has_children, family_plans = EXCLUDED.family_plans,
    drinking_frequency = EXCLUDED.drinking_frequency, cannabis_frequency = EXCLUDED.cannabis_frequency,
    tobacco_frequency = EXCLUDED.tobacco_frequency, other_drugs_frequency = EXCLUDED.other_drugs_frequency,
    school = EXCLUDED.school, location = EXCLUDED.location,
    interests = EXCLUDED.interests, values = EXCLUDED.values,
    bio = EXCLUDED.bio, current_job = EXCLUDED.current_job,
    is_verified = EXCLUDED.is_verified, profile_completed = false;

  -- Sophie L. — Reviewer's friend + endorser + proposal subject
  INSERT INTO user_profiles (
    user_id, first_name, last_name, age, gender, pronouns, pronouns_list,
    interested_in_genders, height_inches, ethnicity, religion, political_leaning,
    has_children, family_plans, drinking_frequency, cannabis_frequency,
    tobacco_frequency, other_drugs_frequency, school, location,
    interests, values, bio, current_job, is_verified, profile_completed, role
  ) VALUES (
    sophie_id, 'Sophie', 'L.', 20, ARRAY['Woman'], 'She/Her', ARRAY['She','Her','Hers'],
    ARRAY['Man'], 64, 'East Asian', 'Spiritual', 'liberal',
    'no', 'not_sure', 'rarely', 'never',
    'never', 'never', 'Rice University', 'Houston, TX',
    ARRAY['Art','Dance','Science','Hiking'], ARRAY['Curiosity','Kindness','Honesty'],
    'Biochem major who paints on the side. Looking for someone who can keep up on a hike.',
    'Student', true, false, 'dater'
  ) ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
    age = EXCLUDED.age, gender = EXCLUDED.gender, pronouns = EXCLUDED.pronouns,
    pronouns_list = EXCLUDED.pronouns_list, interested_in_genders = EXCLUDED.interested_in_genders,
    height_inches = EXCLUDED.height_inches, ethnicity = EXCLUDED.ethnicity,
    religion = EXCLUDED.religion, political_leaning = EXCLUDED.political_leaning,
    has_children = EXCLUDED.has_children, family_plans = EXCLUDED.family_plans,
    drinking_frequency = EXCLUDED.drinking_frequency, cannabis_frequency = EXCLUDED.cannabis_frequency,
    tobacco_frequency = EXCLUDED.tobacco_frequency, other_drugs_frequency = EXCLUDED.other_drugs_frequency,
    school = EXCLUDED.school, location = EXCLUDED.location,
    interests = EXCLUDED.interests, values = EXCLUDED.values,
    bio = EXCLUDED.bio, current_job = EXCLUDED.current_job,
    is_verified = EXCLUDED.is_verified, profile_completed = false;

  -- Marcus R. — Endorser + proposal subject
  INSERT INTO user_profiles (
    user_id, first_name, last_name, age, gender, pronouns, pronouns_list,
    interested_in_genders, height_inches, ethnicity, religion, political_leaning,
    has_children, family_plans, drinking_frequency, cannabis_frequency,
    tobacco_frequency, other_drugs_frequency, school, location,
    interests, values, bio, current_job, is_verified, profile_completed, role
  ) VALUES (
    marcus_id, 'Marcus', 'R.', 23, ARRAY['Man'], 'He/Him', ARRAY['He','Him','His'],
    ARRAY['Woman'], 70, 'Hispanic', 'Agnostic', 'moderate',
    'no', 'want_children', 'socially', 'never',
    'never', 'never', 'Rice University', 'Houston, TX',
    ARRAY['Running','Cooking','Music','Travel'], ARRAY['Commitment','Growth','Communication'],
    'Marathon runner and amateur chef. My friends say I make the best pasta in Houston.',
    'Student', true, false, 'dater'
  ) ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
    age = EXCLUDED.age, gender = EXCLUDED.gender, pronouns = EXCLUDED.pronouns,
    pronouns_list = EXCLUDED.pronouns_list, interested_in_genders = EXCLUDED.interested_in_genders,
    height_inches = EXCLUDED.height_inches, ethnicity = EXCLUDED.ethnicity,
    religion = EXCLUDED.religion, political_leaning = EXCLUDED.political_leaning,
    has_children = EXCLUDED.has_children, family_plans = EXCLUDED.family_plans,
    drinking_frequency = EXCLUDED.drinking_frequency, cannabis_frequency = EXCLUDED.cannabis_frequency,
    tobacco_frequency = EXCLUDED.tobacco_frequency, other_drugs_frequency = EXCLUDED.other_drugs_frequency,
    school = EXCLUDED.school, location = EXCLUDED.location,
    interests = EXCLUDED.interests, values = EXCLUDED.values,
    bio = EXCLUDED.bio, current_job = EXCLUDED.current_job,
    is_verified = EXCLUDED.is_verified, profile_completed = false;

  -- Lily C. — Proposal subject
  INSERT INTO user_profiles (
    user_id, first_name, last_name, age, gender, pronouns, pronouns_list,
    interested_in_genders, height_inches, ethnicity, religion, political_leaning,
    has_children, family_plans, drinking_frequency, cannabis_frequency,
    tobacco_frequency, other_drugs_frequency, school, location,
    interests, values, bio, current_job, is_verified, profile_completed, role
  ) VALUES (
    lily_id, 'Lily', 'C.', 21, ARRAY['Woman'], 'She/Her', ARRAY['She','Her','Hers'],
    ARRAY['Man'], 66, 'White/Caucasian', 'Christian', 'moderate',
    'no', 'want_children', 'rarely', 'never',
    'never', 'never', 'Rice University', 'Houston, TX',
    ARRAY['Writing','Coffee','Volunteering','Music'], ARRAY['Honesty','Kindness','Loyalty'],
    'Creative writing major. You can find me at any open mic night or coffee shop.',
    'Student', true, false, 'dater'
  ) ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
    age = EXCLUDED.age, gender = EXCLUDED.gender, pronouns = EXCLUDED.pronouns,
    pronouns_list = EXCLUDED.pronouns_list, interested_in_genders = EXCLUDED.interested_in_genders,
    height_inches = EXCLUDED.height_inches, ethnicity = EXCLUDED.ethnicity,
    religion = EXCLUDED.religion, political_leaning = EXCLUDED.political_leaning,
    has_children = EXCLUDED.has_children, family_plans = EXCLUDED.family_plans,
    drinking_frequency = EXCLUDED.drinking_frequency, cannabis_frequency = EXCLUDED.cannabis_frequency,
    tobacco_frequency = EXCLUDED.tobacco_frequency, other_drugs_frequency = EXCLUDED.other_drugs_frequency,
    school = EXCLUDED.school, location = EXCLUDED.location,
    interests = EXCLUDED.interests, values = EXCLUDED.values,
    bio = EXCLUDED.bio, current_job = EXCLUDED.current_job,
    is_verified = EXCLUDED.is_verified, profile_completed = false;

  -- Alex K. — Proposal subject
  INSERT INTO user_profiles (
    user_id, first_name, last_name, age, gender, pronouns, pronouns_list,
    interested_in_genders, height_inches, ethnicity, religion, political_leaning,
    has_children, family_plans, drinking_frequency, cannabis_frequency,
    tobacco_frequency, other_drugs_frequency, school, location,
    interests, values, bio, current_job, is_verified, profile_completed, role
  ) VALUES (
    alex_id, 'Alex', 'K.', 22, ARRAY['Man'], 'He/Him', ARRAY['He','Him','His'],
    ARRAY['Woman'], 71, 'South Asian', 'Hindu', 'moderate',
    'no', 'want_children', 'socially', 'never',
    'never', 'never', 'Rice University', 'Houston, TX',
    ARRAY['Coding','Chess','Hiking','Photography'], ARRAY['Growth','Curiosity','Communication'],
    'CS major who loves trail running and board games. Looking for my adventure partner.',
    'Student', true, false, 'dater'
  ) ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
    age = EXCLUDED.age, gender = EXCLUDED.gender, pronouns = EXCLUDED.pronouns,
    pronouns_list = EXCLUDED.pronouns_list, interested_in_genders = EXCLUDED.interested_in_genders,
    height_inches = EXCLUDED.height_inches, ethnicity = EXCLUDED.ethnicity,
    religion = EXCLUDED.religion, political_leaning = EXCLUDED.political_leaning,
    has_children = EXCLUDED.has_children, family_plans = EXCLUDED.family_plans,
    drinking_frequency = EXCLUDED.drinking_frequency, cannabis_frequency = EXCLUDED.cannabis_frequency,
    tobacco_frequency = EXCLUDED.tobacco_frequency, other_drugs_frequency = EXCLUDED.other_drugs_frequency,
    school = EXCLUDED.school, location = EXCLUDED.location,
    interests = EXCLUDED.interests, values = EXCLUDED.values,
    bio = EXCLUDED.bio, current_job = EXCLUDED.current_job,
    is_verified = EXCLUDED.is_verified, profile_completed = false;

  RAISE NOTICE 'Demo user profiles created (all profile_completed = false).';

  -- ========================================================================
  -- 5. CREATE USER PREFERENCES FOR DEMO USERS
  -- ========================================================================
  INSERT INTO user_preferences (user_id, age_min, age_max, looking_for, preferred_height_min_inches, preferred_height_max_inches, preferred_ethnicities, preferred_religions, preferred_politics, partner_drinking, partner_cannabis, partner_tobacco, partner_other_drugs)
  VALUES
    (emma_id,   19, 25, 'relationship', 66, 78, ARRAY['No Preference'], ARRAY['Agnostic','Christian','Spiritual'], ARRAY['moderate','liberal'], ARRAY['socially','rarely'], ARRAY['never'], ARRAY['never'], ARRAY['never']),
    (jordan_id, 19, 24, 'relationship', 60, 70, ARRAY['No Preference'], ARRAY['Christian','Agnostic'], ARRAY['moderate','liberal'], ARRAY['socially','rarely'], ARRAY['never'], ARRAY['never'], ARRAY['never']),
    (sophie_id, 20, 25, 'relationship', 67, 78, ARRAY['No Preference'], ARRAY['Spiritual','Agnostic'], ARRAY['liberal','moderate'], ARRAY['rarely','never'], ARRAY['never'], ARRAY['never'], ARRAY['never']),
    (marcus_id, 19, 24, 'relationship', 60, 68, ARRAY['No Preference'], ARRAY['Agnostic','Christian'], ARRAY['moderate'], ARRAY['socially','rarely'], ARRAY['never'], ARRAY['never'], ARRAY['never']),
    (lily_id,   20, 26, 'relationship', 67, 78, ARRAY['No Preference'], ARRAY['Christian','Agnostic'], ARRAY['moderate','liberal'], ARRAY['rarely','never'], ARRAY['never'], ARRAY['never'], ARRAY['never']),
    (alex_id,   19, 24, 'relationship', 60, 68, ARRAY['No Preference'], ARRAY['Hindu','Agnostic','Spiritual'], ARRAY['moderate','liberal'], ARRAY['socially','rarely'], ARRAY['never'], ARRAY['never'], ARRAY['never'])
  ON CONFLICT (user_id) DO UPDATE SET
    age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max,
    preferred_height_min_inches = EXCLUDED.preferred_height_min_inches,
    preferred_height_max_inches = EXCLUDED.preferred_height_max_inches,
    preferred_ethnicities = EXCLUDED.preferred_ethnicities,
    preferred_religions = EXCLUDED.preferred_religions,
    preferred_politics = EXCLUDED.preferred_politics,
    partner_drinking = EXCLUDED.partner_drinking,
    partner_cannabis = EXCLUDED.partner_cannabis,
    partner_tobacco = EXCLUDED.partner_tobacco,
    partner_other_drugs = EXCLUDED.partner_other_drugs;

  RAISE NOTICE 'Demo user preferences created.';

  -- ========================================================================
  -- 6. CREATE FRIEND CODES
  -- ========================================================================
  -- Use non-guessable codes (BRIDGE-XXXX-XXXX format) to prevent real users
  -- from accidentally friending a demo user by guessing a simple code.
  INSERT INTO friend_codes (user_id, code) VALUES
    (emma_id,   'BRIDGE-DM01-X9K2'), (jordan_id, 'BRIDGE-DM02-R7F4'),
    (sophie_id, 'BRIDGE-DM03-Q3W8'), (marcus_id, 'BRIDGE-DM04-T6J1'),
    (lily_id,   'BRIDGE-DM05-P2M5'), (alex_id,   'BRIDGE-DM06-V8N3')
  ON CONFLICT (user_id) DO NOTHING;

  -- ========================================================================
  -- 7. CREATE FRIENDSHIPS (reviewer <-> Emma, Jordan, Sophie)
  --    Bidirectional rows with status = 'accepted'.
  -- ========================================================================
  INSERT INTO friends (user_id, friend_id, status, added_at) VALUES
    (reviewer_id, emma_id,   'accepted', now() - interval '14 days'),
    (emma_id,   reviewer_id, 'accepted', now() - interval '14 days'),
    (reviewer_id, jordan_id, 'accepted', now() - interval '10 days'),
    (jordan_id, reviewer_id, 'accepted', now() - interval '10 days'),
    (reviewer_id, sophie_id, 'accepted', now() - interval '7 days'),
    (sophie_id, reviewer_id, 'accepted', now() - interval '7 days')
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  -- Inter-demo friendships for realism
  INSERT INTO friends (user_id, friend_id, status, added_at) VALUES
    (emma_id,   jordan_id, 'accepted', now() - interval '20 days'),
    (jordan_id, emma_id,   'accepted', now() - interval '20 days'),
    (sophie_id, marcus_id, 'accepted', now() - interval '15 days'),
    (marcus_id, sophie_id, 'accepted', now() - interval '15 days'),
    (jordan_id, marcus_id, 'accepted', now() - interval '12 days'),
    (marcus_id, jordan_id, 'accepted', now() - interval '12 days'),
    (lily_id,   alex_id,   'accepted', now() - interval '8 days'),
    (alex_id,   lily_id,   'accepted', now() - interval '8 days')
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  RAISE NOTICE 'Friendships created (reviewer <-> Emma, Jordan, Sophie + inter-demo).';

  -- ========================================================================
  -- 8. CREATE KARMA SCORES
  --    All demo users get 0 karma so they NEVER appear on the leaderboard.
  --    The leaderboard RPC has no profile_completed filter, so zeroing karma
  --    is the safest way to keep demo users invisible in weekly rankings.
  -- ========================================================================
  INSERT INTO karma_scores (user_id, karma_points, total_votes, accurate_votes, badge_tier) VALUES
    (emma_id,   0, 0, 0, 'new'),
    (jordan_id, 0, 0, 0, 'new'),
    (sophie_id, 0, 0, 0, 'new'),
    (marcus_id, 0, 0, 0, 'new'),
    (lily_id,   0, 0, 0, 'new'),
    (alex_id,   0, 0, 0, 'new')
  ON CONFLICT (user_id) DO UPDATE SET
    karma_points = 0,
    total_votes = 0,
    accurate_votes = 0,
    badge_tier = 'new';

  -- Also update reviewer karma to look realistic
  INSERT INTO karma_scores (user_id, karma_points, total_votes, accurate_votes, badge_tier)
  VALUES (reviewer_id, 15, 12, 8, 'solid')
  ON CONFLICT (user_id) DO UPDATE SET
    karma_points = 15, total_votes = 12, accurate_votes = 8, badge_tier = 'solid';

  RAISE NOTICE 'Karma scores seeded.';

  -- ========================================================================
  -- 9. REMOVE demo.bridgedate.app from allowed domains
  --    CRITICAL: Must happen before the script exits so no one can sign up
  --    with a demo email through the app.
  -- ========================================================================
  DELETE FROM public.allowed_email_domains WHERE domain = 'demo.bridgedate.app';
  RAISE NOTICE 'demo.bridgedate.app removed from allowed_email_domains.';

  -- ========================================================================
  -- DONE
  -- ========================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo bubble seed complete!';
  RAISE NOTICE '  Reviewer: %', reviewer_id;
  RAISE NOTICE '  Emma:     %', emma_id;
  RAISE NOTICE '  Jordan:   %', jordan_id;
  RAISE NOTICE '  Sophie:   %', sophie_id;
  RAISE NOTICE '  Marcus:   %', marcus_id;
  RAISE NOTICE '  Lily:     %', lily_id;
  RAISE NOTICE '  Alex:     %', alex_id;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next: run reset-reviewer-demo.sql for match + proposals.';

END $$;
