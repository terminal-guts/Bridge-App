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
    image: number | { uri: string }; // Can be a require() result (number) or URI object
    isVerified: boolean;
    karmaPoints: number;
    matchPercentage: number;
    matchedBy: string[]; // Array of URIs
    values: TagItem[];
    interests: TagItem[];
    questions: QuestionItem[];
}
