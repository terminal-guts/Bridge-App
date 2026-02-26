-- ============================================
-- BRIDGE TEST DATA SEED
-- Run in Supabase SQL Editor
-- ============================================

-- Fix trigger to handle re-runs gracefully
CREATE OR REPLACE FUNCTION handle_new_user_friend_code()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO friend_codes (user_id, code)
    VALUES (NEW.id, generate_friend_code())
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up previous test data
DELETE FROM deep_question_answers WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%.test@bridge-app.dev');
DELETE FROM user_preferences WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%.test@bridge-app.dev');
DELETE FROM daily_pairings WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%.test@bridge-app.dev');
DELETE FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%.test@bridge-app.dev');
DELETE FROM friend_codes WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%.test@bridge-app.dev');
DELETE FROM auth.users WHERE email LIKE '%.test@bridge-app.dev';

-- Create fresh auth users (trigger will create friend_codes automatically)
DO $$
DECLARE
  alex_id UUID;
  maya_id UUID;
  jordan_id UUID;
  sofia_id UUID;
  ethan_id UUID;
  priya_id UUID;
  marcus_id UUID;
  emma_id UUID;
  daniel_id UUID;
  olivia_id UUID;
  ryan_id UUID;
  aisha_id UUID;
  pw_hash TEXT;
BEGIN

  pw_hash := crypt('TestPassword123!', gen_salt('bf'));

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alex.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO alex_id FROM auth.users WHERE email = 'alex.test@bridge-app.dev';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maya.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO maya_id FROM auth.users WHERE email = 'maya.test@bridge-app.dev';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jordan.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO jordan_id FROM auth.users WHERE email = 'jordan.test@bridge-app.dev';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sofia.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO sofia_id FROM auth.users WHERE email = 'sofia.test@bridge-app.dev';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ethan.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO ethan_id FROM auth.users WHERE email = 'ethan.test@bridge-app.dev';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO priya_id FROM auth.users WHERE email = 'priya.test@bridge-app.dev';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marcus.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO marcus_id FROM auth.users WHERE email = 'marcus.test@bridge-app.dev';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emma.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO emma_id FROM auth.users WHERE email = 'emma.test@bridge-app.dev';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'daniel.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO daniel_id FROM auth.users WHERE email = 'daniel.test@bridge-app.dev';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'olivia.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO olivia_id FROM auth.users WHERE email = 'olivia.test@bridge-app.dev';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ryan.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO ryan_id FROM auth.users WHERE email = 'ryan.test@bridge-app.dev';

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aisha.test@bridge-app.dev', pw_hash, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}');
  SELECT id INTO aisha_id FROM auth.users WHERE email = 'aisha.test@bridge-app.dev';

  INSERT INTO profiles (id, first_name, last_name, age, gender, interested_in_genders, location, latitude, longitude, hometown, current_job, education_level, school, height_inches, ethnicity, religion, political_leaning, has_children, family_plans, drinking_frequency, cannabis_frequency, tobacco_frequency, other_drugs_frequency, interests, "values", bio, is_paused)
  VALUES
    (alex_id,   'Alex',   'Chen',      21, ARRAY['male'],   ARRAY['female'], 'Houston, TX', 29.7174, -95.4018, 'Austin, TX',      'Software Engineering Intern', 'bachelors', 'Rice University', 71, 'Asian',       'agnostic',  'liberal',      'no', 'want_someday', 'sometimes', 'never',     'never', 'never', ARRAY['coding','hiking','photography','cooking','basketball'],        ARRAY['honesty','ambition','curiosity','kindness'],              'CS major who loves building things. Weekend hiker and amateur chef.', false),
    (maya_id,   'Maya',   'Patel',     20, ARRAY['female'], ARRAY['male'],   'Houston, TX', 29.7152, -95.3987, 'Dallas, TX',      'Research Assistant',          'bachelors', 'Rice University', 64, 'South Asian', 'hindu',     'liberal',      'no', 'want_someday', 'sometimes', 'never',     'never', 'never', ARRAY['reading','yoga','painting','travel','cooking'],               ARRAY['family','kindness','growth','honesty'],                   'Biochem major with a love for art.', false),
    (jordan_id, 'Jordan', 'Williams',  22, ARRAY['male'],   ARRAY['female'], 'Houston, TX', 29.7210, -95.3963, 'Chicago, IL',     'Teaching Assistant',          'bachelors', 'Rice University', 74, 'Black',       'christian', 'moderate',     'no', 'want_someday', 'sometimes', 'sometimes', 'never', 'never', ARRAY['music','basketball','writing','volunteering','movies'],       ARRAY['faith','loyalty','humor','community'],                    'English major, aspiring writer. Piano and basketball.', false),
    (sofia_id,  'Sofia',  'Rodriguez', 21, ARRAY['female'], ARRAY['male'],   'Houston, TX', 29.7135, -95.4050, 'San Antonio, TX', 'Marketing Intern',            'bachelors', 'Rice University', 66, 'Hispanic',    'catholic',  'moderate',     'no', 'want_someday', 'sometimes', 'never',     'never', 'never', ARRAY['dancing','travel','food','photography','running'],             ARRAY['family','adventure','honesty','faith'],                   'Business major. Salsa dancer. Always planning the next trip.', false),
    (ethan_id,  'Ethan',  'Kim',       20, ARRAY['male'],   ARRAY['female'], 'Houston, TX', 29.7190, -95.4000, 'Houston, TX',     'Data Science Intern',         'bachelors', 'Rice University', 69, 'Asian',       'spiritual', 'liberal',      'no', 'open',         'sometimes', 'sometimes', 'never', 'never', ARRAY['gaming','anime','cooking','hiking','music'],                  ARRAY['authenticity','curiosity','humor','growth'],              'Stats major. Playlists for every mood and ramen from scratch.', false),
    (priya_id,  'Priya',  'Sharma',    21, ARRAY['female'], ARRAY['male'],   'Houston, TX', 29.7160, -95.4030, 'New York, NY',    'Product Management Intern',   'bachelors', 'Rice University', 63, 'South Asian', 'spiritual', 'liberal',      'no', 'want_someday', 'sometimes', 'never',     'never', 'never', ARRAY['startups','reading','yoga','travel','podcasts'],               ARRAY['ambition','empathy','growth','honesty'],                  'Econ + CS double major. Building a startup on the side.', false),
    (marcus_id, 'Marcus', 'Thompson',  23, ARRAY['male'],   ARRAY['female'], 'Houston, TX', 29.7200, -95.3950, 'Atlanta, GA',     'Graduate Research Assistant',  'masters',   'Rice University', 72, 'Black',       'christian', 'moderate',     'no', 'want_someday', 'sometimes', 'never',     'never', 'never', ARRAY['fitness','cooking','jazz','reading','mentoring'],              ARRAY['faith','discipline','kindness','integrity'],              'Mechanical engineering grad student. Gym and jazz.', false),
    (emma_id,   'Emma',   'Davis',     20, ARRAY['female'], ARRAY['male'],   'Houston, TX', 29.7145, -95.4065, 'Portland, OR',    'UX Design Intern',            'bachelors', 'Rice University', 67, 'White',       'agnostic',  'very_liberal', 'no', 'open',         'sometimes', 'sometimes', 'never', 'never', ARRAY['art','sustainability','hiking','music','thrifting'],           ARRAY['creativity','authenticity','compassion','adventure'],     'Architecture major with a design obsession.', false),
    (daniel_id, 'Daniel', 'Nguyen',    21, ARRAY['male'],   ARRAY['female'], 'Houston, TX', 29.7180, -95.3975, 'San Jose, CA',    'Software Engineering Intern',  'bachelors', 'Rice University', 68, 'Asian',       'buddhist',  'liberal',      'no', 'not_sure',     'sometimes', 'never',     'never', 'never', ARRAY['coding','guitar','coffee','board games','running'],            ARRAY['kindness','patience','humor','growth'],                   'CS major, coffee addict, mediocre guitarist.', false),
    (olivia_id, 'Olivia', 'Martinez',  22, ARRAY['female'], ARRAY['male'],   'Houston, TX', 29.7125, -95.4040, 'Miami, FL',       'Pre-Med Research',            'bachelors', 'Rice University', 65, 'Hispanic',    'catholic',  'moderate',     'no', 'want_someday', 'sometimes', 'never',     'never', 'never', ARRAY['science','dancing','cooking','volunteering','travel'],         ARRAY['family','compassion','dedication','faith'],               'Pre-med senior. Hospital volunteer. Bachata dancer.', false),
    (ryan_id,   'Ryan',   'OBrien',    22, ARRAY['male'],   ARRAY['female'], 'Houston, TX', 29.7165, -95.3990, 'Boston, MA',      'Finance Intern',              'bachelors', 'Rice University', 73, 'White',       'catholic',  'conservative', 'no', 'want_someday', 'regularly', 'never',     'never', 'never', ARRAY['golf','finance','football','cooking','travel'],                ARRAY['loyalty','ambition','family','humor'],                    'Econ major headed to investment banking. Italian food and golf.', false),
    (aisha_id,  'Aisha',  'Rahman',    20, ARRAY['female'], ARRAY['male'],   'Houston, TX', 29.7155, -95.4010, 'Houston, TX',     'Student',                     'bachelors', 'Rice University', 62, 'South Asian', 'muslim',    'liberal',      'no', 'want_someday', 'never',     'never',     'never', 'never', ARRAY['writing','poetry','photography','hiking','coffee'],            ARRAY['faith','honesty','compassion','curiosity'],               'English major and aspiring poet. Coffee is non-negotiable.', false);

  INSERT INTO user_preferences (user_id, preferred_gender, age_min, age_max, looking_for, max_distance)
  VALUES
    (alex_id,   'female', 19, 24, 'relationship', 50),
    (maya_id,   'male',   20, 25, 'relationship', 50),
    (jordan_id, 'female', 19, 24, 'relationship', 50),
    (sofia_id,  'male',   20, 25, 'relationship', 50),
    (ethan_id,  'female', 18, 23, 'relationship', 50),
    (priya_id,  'male',   20, 25, 'relationship', 50),
    (marcus_id, 'female', 20, 25, 'relationship', 50),
    (emma_id,   'male',   19, 24, 'relationship', 50),
    (daniel_id, 'female', 19, 24, 'relationship', 50),
    (olivia_id, 'male',   20, 25, 'relationship', 50),
    (ryan_id,   'female', 19, 24, 'relationship', 50),
    (aisha_id,  'male',   19, 24, 'relationship', 50);

  INSERT INTO deep_question_answers (user_id, answers, displayed_question_ids)
  VALUES
    (alex_id,   '{"1": "Morning hike, afternoon coding on a side project, evening cooking dinner with someone.", "5": "Building software that actually helps people. Working on an app for local food banks."}', ARRAY[1,5]),
    (maya_id,   '{"1": "Farmers market in the morning, painting in the afternoon, cooking a big meal for friends.", "5": "My research on protein folding. Understanding how molecules work is genuinely beautiful.", "10": "I used to think success meant prestige. Now I think it means doing work that matters."}', ARRAY[1,5,10]),
    (jordan_id, '{"1": "Church in the morning, pickup basketball, then writing at a coffee shop.", "7": "Everything. I mentor high school students and my church community keeps me grounded."}', ARRAY[1,7]),
    (sofia_id,  '{"1": "Exploring a new neighborhood, trying a restaurant I have never been to, dancing with friends.", "5": "Planning a trip to South America. I want to reconnect with my familys roots in Colombia."}', ARRAY[1,5]),
    (ethan_id,  '{"5": "Using data to understand human behavior. Also perfecting my tonkotsu ramen recipe."}', ARRAY[5]),
    (priya_id,  '{"1": "Working on my startup idea in the morning, long run, then dinner with friends.", "5": "Building a platform that connects first-gen college students with mentors.", "10": "That you have to choose between ambition and relationships. The right person makes you more ambitious."}', ARRAY[1,5,10]),
    (marcus_id, '{"7": "I grew up in a tight-knit neighborhood. Community is why I mentor and why I want to teach.", "10": "That vulnerability is weakness. Opening up to people has made every relationship better."}', ARRAY[7,10]),
    (emma_id,   '{"1": "Thrift store run, hike at a state park, then sketching at a coffee shop.", "5": "Sustainable design. How do we build spaces that are beautiful and dont destroy the planet?"}', ARRAY[1,5]),
    (daniel_id, '{"1": "Long morning run, brunch, board game afternoon with friends, guitar practice.", "5": "Open source software. Contributing to projects millions use for free feels meaningful."}', ARRAY[1,5]),
    (olivia_id, '{"7": "I volunteer at Texas Childrens Hospital. Seeing those kids fight puts everything in perspective.", "10": "That medicine is just science. Its really about connection."}', ARRAY[7,10]),
    (ryan_id,   '{"1": "Golf in the morning, watching football with friends, then cooking a big Italian dinner."}', ARRAY[1]),
    (aisha_id,  '{"1": "Writing at my favorite coffee shop, long walk with a podcast, quiet night reading.", "5": "My poetry chapbook about growing up between two cultures.", "10": "That being introverted means being lonely. Solitude is different from loneliness."}', ARRAY[1,5,10]);

  RAISE NOTICE 'Seeded 12 test users successfully';
END $$;

SELECT u.email, p.first_name, p.age, p.gender[1] as gender, array_length(p.interests, 1) as num_interests
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email LIKE '%.test@bridge-app.dev'
ORDER BY p.first_name;
