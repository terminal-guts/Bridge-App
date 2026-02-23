import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ComparisonItem {
    label: string;
    userValue: string | string[];
    partnerValue: string | string[];
    status: 'match' | 'mismatch' | 'warning' | 'none';
}

export interface CompatibilitySection {
    title: string;
    matchScore?: string;
    items: ComparisonItem[];
}

export interface ValuesInterests {
    you: string[];
    them: string[];
}

export interface CompatibilityData {
    user1: {
        name: string;
        age: number;
        role: string;
        image: string;
    };
    user2: {
        name: string;
        age: number;
        role: string;
        image: string;
    };
    matchPercent: number;
    sections: CompatibilitySection[];
    values: ValuesInterests;
    interests: ValuesInterests;
}

const DUMMY_DATA: CompatibilityData = {
    user1: {
        name: "Jack",
        age: 29,
        role: "Architect",
        image: "https://files.catbox.moe/exhcm0.png",
    },
    user2: {
        name: "Leslie",
        age: 27,
        role: "Designer",
        image: "https://files.catbox.moe/zdig5k.png",
    },
    matchPercent: 82,
    sections: [
        {
            title: "Basic",
            matchScore: "2/2 Match",
            items: [
                { label: "Height", userValue: "6'11\"", partnerValue: "5'6\"", status: "match" },
                { label: "Distance apart", userValue: "12 miles", partnerValue: "10 miles", status: "match" },
            ],
        },
        {
            title: "Ethnicity",
            matchScore: "Match",
            items: [
                { label: "Ethnicity", userValue: ["Latina", "Asian"], partnerValue: ["White", "Asian"], status: "match" },
            ],
        },
        {
            title: "Beliefs",
            matchScore: "0/2 Match",
            items: [
                { label: "Politics", userValue: "Moderate", partnerValue: "Apolitical", status: "mismatch" },
                { label: "Religion", userValue: "Jewish", partnerValue: "Christian", status: "mismatch" },
            ],
        },
        {
            title: "Lifestyle",
            matchScore: "1/4 Match",
            items: [
                { label: "Drink", userValue: "Yes", partnerValue: "sometimes", status: "match" },
                { label: "Weed", userValue: "No", partnerValue: "No", status: "mismatch" },
                { label: "Tobacco", userValue: "Yes", partnerValue: "No", status: "mismatch" },
                { label: "Other substances", userValue: "No", partnerValue: "Don't care", status: "warning" },
            ],
        },
    ],
    values: {
        you: ["Kindness", "Honesty", "Growth Mindset", "Family", "Ambition", "Humor", "Empathy", "Curiosity"],
        them: ["Kindness", "Honesty", "Growth Mindset", "Family", "Ambition", "Humor", "Empathy", "Curiosity"],
    },
    interests: {
        you: ["Travel", "Live music", "Coffee chats", "Book clubs", "Food walks", "Hiking"],
        them: ["Travel", "Live music", "Coffee chats", "Book clubs", "Food walks", "Hiking"],
    },
};

interface CompatibilityContextType {
    data: CompatibilityData;
}

const CompatibilityContext = createContext<CompatibilityContextType | undefined>(undefined);

export const CompatibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data] = useState<CompatibilityData>(DUMMY_DATA);

    return (
        <CompatibilityContext.Provider value={{ data }}>
            {children}
        </CompatibilityContext.Provider>
    );
};

export const useCompatibility = () => {
    const context = useContext(CompatibilityContext);
    if (context === undefined) {
        throw new Error('useCompatibility must be used within a CompatibilityProvider');
    }
    return context;
};
