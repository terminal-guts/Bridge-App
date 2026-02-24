export interface TagItem {
    emoji: string;
    text: string;
}

export interface QuestionItem {
    q: string;
    a: string;
}

export interface Profile {
    id: string;
    name: string;
    age: number;
    image: any; // Can be a string (URI) or require() result
    isVerified: boolean;
    karmaPoints: number;
    matchPercentage: number;
    matchedBy: string[]; // Array of URIs
    values: TagItem[];
    interests: TagItem[];
    questions: QuestionItem[];
}
