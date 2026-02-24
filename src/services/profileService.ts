import { Profile } from '../types/profile';

// Mock data for demonstration
const MOCK_PROFILES: Record<string, Profile> = {
    'elsa': {
        id: 'elsa',
        name: 'Elsa',
        age: 29,
        // In a real app, this would be the URL provided by your backend/database
        // Replace this with your actual image URL
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=375&h=451',
        isVerified: true,
        karmaPoints: 80,
        matchPercentage: 75,
        matchedBy: [
            'https://i.pravatar.cc/32?u=1',
            'https://i.pravatar.cc/32?u=2',
            'https://i.pravatar.cc/32?u=3'
        ],
        values: [
            { emoji: '💗', text: 'Kindness' },
            { emoji: '🤝', text: 'Honesty' },
            { emoji: '🌱', text: 'Growth' },
            { emoji: '👨‍👩‍👧‍👦', text: 'Family' },
            { emoji: '🎯', text: 'Ambition' },
            { emoji: '😂', text: 'Humor' },
            { emoji: '🤗', text: 'Empathy' },
            { emoji: '🔍', text: 'Curiosity' },
        ],
        interests: [
            { emoji: '✈️', text: 'Travel' },
            { emoji: '🎵', text: 'Live music' },
            { emoji: '☕', text: 'Coffee chats' },
            { emoji: '🥾', text: 'Hiking' },
            { emoji: '📚', text: 'Book clubs' },
            { emoji: '🍜', text: 'Food walks' },
            { emoji: '✨', text: 'Weekend getaways' },
            { emoji: '🎨', text: 'Art galleries' },
        ],
        questions: [
            {
                q: "What's your idea of a perfect weekend?",
                a: "Exploring new places, slow mornings, and meaningful conversations with people I care about.",
            },
            {
                q: "What are you most passionate about?",
                a: "Finding ways to grow, create, and support the people around me.",
            },
            {
                q: "What's a life lesson that took you a while to learn?",
                a: "It's okay to change your mind and rewrite your plans when you learn more about yourself.",
            },
        ],
    }
};

export const getProfileById = async (id: string): Promise<Profile | null> => {
    // This is where you would call your backend API
    // Example: const response = await fetch(`https://your-api.com/profiles/${id}`);
    // return await response.json();

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_PROFILES[id] || MOCK_PROFILES['elsa'];
};
