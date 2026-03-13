/**
 * Seed Demo Data for App Store Reviewer
 *
 * This script creates a set of demo users in the live Supabase database
 * so the App Store reviewer has a rich experience.
 *
 * Run with: npx tsx scripts/seed-demo-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DEMO_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    first_name: 'Alex',
    last_name: 'Developer',
    age: 27,
    gender: ['male'],
    location: 'New York, NY',
    bio: 'Bridge developer. Passionate about community-driven matching.',
    interests: ['Coffee', 'Hiking', 'Coding'],
    values: ['Authenticity', 'Growth'],
    profile_completed: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    first_name: 'Sarah',
    last_name: 'Designer',
    age: 26,
    gender: ['female'],
    location: 'Brooklyn, NY',
    bio: 'UX designer who loves finding beauty in the details.',
    interests: ['Art', 'Yoga', 'Travel'],
    values: ['Creativity', 'Kindness'],
    profile_completed: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    first_name: 'Jordan',
    last_name: 'Product',
    age: 29,
    gender: ['non-binary'],
    location: 'Manhattan, NY',
    bio: 'Building products that bring people together.',
    interests: ['Music', 'Cooking', 'Board Games'],
    values: ['Community', 'Honesty'],
    profile_completed: true,
  }
];

async function seed() {
  console.log('🌱 Seeding demo users...');

  for (const user of DEMO_USERS) {
    console.log(`Creating profile for ${user.first_name}...`);

    const { error } = await supabase
      .from('user_profiles')
      .upsert(user, { onConflict: 'id' });

    if (error) {
      console.error(`Error creating ${user.first_name}:`, error.message);
    } else {
      // Also create preferences
      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        age_min: 22,
        age_max: 35,
        looking_for: 'relationship'
      });

      console.log(`✅ ${user.first_name} created successfully`);
    }
  }

  console.log('✨ Seeding complete!');
}

seed().catch(console.error);
