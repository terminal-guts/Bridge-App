-- ============================================
-- Seed Demo Data for App Store Reviewer
-- ============================================
-- Run this in the Supabase SQL Editor.
-- Creates demo users, friendships, proposals, a match, and messages
-- so the reviewer sees a fully functional app.

-- Temporarily allow non-rice.edu emails for demo users
INSERT INTO public.allowed_email_domains (domain, is_active)
VALUES ('demo.bridgedate.app', true)
ON CONFLICT DO NOTHING;

-- Get the reviewer's user ID
DO $$
DECLARE
  reviewer_id UUID;
  demo1_id UUID;
  demo2_id UUID;
  demo3_id UUID;
  demo4_id UUID;
  demo5_id UUID;
  proposal1_id UUID;
  proposal2_id UUID;
  proposal3_id UUID;
  reviewer_proposal_id UUID;
  match_id UUID;
BEGIN
  -- Look up reviewer
  SELECT id INTO reviewer_id FROM auth.users WHERE email = 'reviewer@bridgedate.app';
  IF reviewer_id IS NULL THEN
    RAISE EXCEPTION 'Reviewer account not found. Create it first.';
  END IF;

  -- ========================================
  -- 1. Create 5 demo auth users
  -- ========================================
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data)
  VALUES
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'emma@demo.bridgedate.app', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'jordan@demo.bridgedate.app', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'sophie@demo.bridgedate.app', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'marcus@demo.bridgedate.app', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'lily@demo.bridgedate.app', crypt('DemoPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}');

  -- Get their IDs
  SELECT id INTO demo1_id FROM auth.users WHERE email = 'emma@demo.bridgedate.app';
  SELECT id INTO demo2_id FROM auth.users WHERE email = 'jordan@demo.bridgedate.app';
  SELECT id INTO demo3_id FROM auth.users WHERE email = 'sophie@demo.bridgedate.app';
  SELECT id INTO demo4_id FROM auth.users WHERE email = 'marcus@demo.bridgedate.app';
  SELECT id INTO demo5_id FROM auth.users WHERE email = 'lily@demo.bridgedate.app';

  -- ========================================
  -- 2. Create identities (required for auth)
  -- ========================================
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES
    (demo1_id, demo1_id, 'emma@demo.bridgedate.app', 'email', jsonb_build_object('sub', demo1_id::text, 'email', 'emma@demo.bridgedate.app'), now(), now(), now()),
    (demo2_id, demo2_id, 'jordan@demo.bridgedate.app', 'email', jsonb_build_object('sub', demo2_id::text, 'email', 'jordan@demo.bridgedate.app'), now(), now(), now()),
    (demo3_id, demo3_id, 'sophie@demo.bridgedate.app', 'email', jsonb_build_object('sub', demo3_id::text, 'email', 'sophie@demo.bridgedate.app'), now(), now(), now()),
    (demo4_id, demo4_id, 'marcus@demo.bridgedate.app', 'email', jsonb_build_object('sub', demo4_id::text, 'email', 'marcus@demo.bridgedate.app'), now(), now(), now()),
    (demo5_id, demo5_id, 'lily@demo.bridgedate.app', 'email', jsonb_build_object('sub', demo5_id::text, 'email', 'lily@demo.bridgedate.app'), now(), now(), now());

  -- ========================================
  -- 3. Create friend codes (trigger may have done this, ON CONFLICT skip)
  -- ========================================
  INSERT INTO friend_codes (user_id, code) VALUES
    (demo1_id, 'DEMO01'), (demo2_id, 'DEMO02'), (demo3_id, 'DEMO03'),
    (demo4_id, 'DEMO04'), (demo5_id, 'DEMO05')
  ON CONFLICT (user_id) DO NOTHING;

  -- ========================================
  -- 4. Create profiles for demo users
  -- ========================================
  INSERT INTO user_profiles (user_id, first_name, last_name, age, gender, pronouns, interested_in_genders, height_inches, school, location, interests, bio, is_verified)
  VALUES
    (demo1_id, 'Emma', 'W.', 21, ARRAY['Woman'], 'She/Her', ARRAY['Man'], 65, 'Rice University', 'Houston, TX',
     ARRAY['Photography', 'Yoga', 'Cooking', 'Travel'], 'Coffee enthusiast and sunset chaser. Love exploring new restaurants and hiking trails.', true),
    (demo2_id, 'Jordan', 'T.', 22, ARRAY['Man'], 'He/Him', ARRAY['Woman'], 72, 'Rice University', 'Houston, TX',
     ARRAY['Music', 'Basketball', 'Reading', 'Film'], 'Aspiring filmmaker with a love for indie music. Always down for a pickup game.', true),
    (demo3_id, 'Sophie', 'L.', 20, ARRAY['Woman'], 'She/Her', ARRAY['Man'], 64, 'Rice University', 'Houston, TX',
     ARRAY['Art', 'Dance', 'Science', 'Hiking'], 'Biochem major who paints on the side. Looking for someone who can keep up on a hike.', true),
    (demo4_id, 'Marcus', 'R.', 23, ARRAY['Man'], 'He/Him', ARRAY['Woman'], 70, 'Rice University', 'Houston, TX',
     ARRAY['Running', 'Cooking', 'Music', 'Travel'], 'Marathon runner and amateur chef. My friends say I make the best pasta in Houston.', true),
    (demo5_id, 'Lily', 'C.', 21, ARRAY['Woman'], 'She/Her', ARRAY['Man'], 66, 'Rice University', 'Houston, TX',
     ARRAY['Writing', 'Coffee', 'Volunteering', 'Music'], 'Creative writing major. You can find me at any open mic night or coffee shop.', true);

  -- ========================================
  -- 5. Create friendships (reviewer <-> demo1, demo2, demo3)
  -- ========================================
  INSERT INTO friends (user_id, friend_id) VALUES
    (reviewer_id, demo1_id), (demo1_id, reviewer_id),
    (reviewer_id, demo2_id), (demo2_id, reviewer_id),
    (reviewer_id, demo3_id), (demo3_id, reviewer_id);

  -- Also some inter-demo friendships for realism
  INSERT INTO friends (user_id, friend_id) VALUES
    (demo1_id, demo4_id), (demo4_id, demo1_id),
    (demo2_id, demo5_id), (demo5_id, demo2_id);

  -- ========================================
  -- 6. Create karma scores
  -- ========================================
  INSERT INTO karma_scores (user_id, karma_points, total_votes, accurate_votes, badge_tier) VALUES
    (reviewer_id, 15, 12, 8, 'solid'),
    (demo1_id, 25, 20, 15, 'trusted'),
    (demo2_id, 10, 8, 5, 'solid'),
    (demo3_id, 5, 4, 3, 'new'),
    (demo4_id, 30, 25, 20, 'trusted'),
    (demo5_id, 8, 6, 4, 'new')
  ON CONFLICT (user_id) DO UPDATE SET
    karma_points = EXCLUDED.karma_points,
    total_votes = EXCLUDED.total_votes,
    accurate_votes = EXCLUDED.accurate_votes,
    badge_tier = EXCLUDED.badge_tier;

  -- ========================================
  -- 7. Create proposals for community voting
  --    (between demo users -- reviewer votes on these)
  -- ========================================
  INSERT INTO proposals (id, user_a_id, user_b_id, status, compatibility_score, pool_yes_votes, pool_no_votes, pool_eligible, voting_started_at, voting_expires_at)
  VALUES
    (gen_random_uuid(), demo4_id, demo5_id, 'pending', 82.5, 2, 0, true, now(), now() + interval '5 days'),
    (gen_random_uuid(), demo2_id, demo3_id, 'pending', 78.0, 1, 1, true, now(), now() + interval '5 days');

  SELECT id INTO proposal1_id FROM proposals WHERE user_a_id = demo4_id AND user_b_id = demo5_id AND status = 'pending' LIMIT 1;
  SELECT id INTO proposal2_id FROM proposals WHERE user_a_id = demo2_id AND user_b_id = demo3_id AND status = 'pending' LIMIT 1;

  -- ========================================
  -- 8. Create an active match (reviewer + Emma)
  --    Both accepted, match is active with messages
  -- ========================================
  INSERT INTO matches (id, user_id_1, user_id_2, status, community_score, user_1_decision, user_2_decision, matched_at, expires_at)
  VALUES (gen_random_uuid(), reviewer_id, demo1_id, 'active', 85.0, 'accepted', 'accepted', now() - interval '2 days', now() + interval '12 days');

  SELECT id INTO match_id FROM matches WHERE user_id_1 = reviewer_id AND user_id_2 = demo1_id AND status = 'active' LIMIT 1;

  -- ========================================
  -- 10. Seed some messages in the match
  -- ========================================
  INSERT INTO messages (match_id, sender_id, receiver_id, type, content, sent_at, read_at) VALUES
    (match_id, demo1_id, reviewer_id, 'text', 'Hey! So excited we matched. My friends have been telling me about you!', now() - interval '2 days', now() - interval '2 days'),
    (match_id, reviewer_id, demo1_id, 'text', 'Hi Emma! I know right? I saw we both love cooking and travel. Have you been anywhere fun recently?', now() - interval '2 days' + interval '5 minutes', now() - interval '2 days' + interval '10 minutes'),
    (match_id, demo1_id, reviewer_id, 'text', 'I just got back from Austin actually! The food scene there is amazing. Have you been?', now() - interval '1 day', now() - interval '1 day'),
    (match_id, reviewer_id, demo1_id, 'text', 'Not yet but it is on my list! Any restaurant recommendations?', now() - interval '1 day' + interval '30 minutes', now() - interval '23 hours'),
    (match_id, demo1_id, reviewer_id, 'text', 'Oh definitely! I will send you my whole list. We should check them out together sometime', now() - interval '20 hours', null);

  RAISE NOTICE 'Demo data seeded successfully!';
  RAISE NOTICE 'Reviewer ID: %', reviewer_id;
  RAISE NOTICE 'Demo users: Emma (%), Jordan (%), Sophie (%), Marcus (%), Lily (%)', demo1_id, demo2_id, demo3_id, demo4_id, demo5_id;
END $$;

-- Clean up: remove demo domain
DELETE FROM public.allowed_email_domains WHERE domain = 'demo.bridgedate.app';
