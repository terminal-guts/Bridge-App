import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  interests?: string[];
  profileImage?: string;
  verifiedId?: boolean;
  onboardingComplete?: boolean;
}

interface MockDataContextType {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  matches: any[];
  addMatch: (match: any) => void;
  conversations: any[];
  addConversation: (conversation: any) => void;
  messages: { [conversationId: string]: any[] };
  addMessage: (conversationId: string, message: any) => void;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

export const MockDataProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<{ [conversationId: string]: any[] }>({});

  const addMatch = (match: any) => {
    setMatches(prev => [...prev, match]);
  };

  const addConversation = (conversation: any) => {
    setConversations(prev => [...prev, conversation]);
  };

  const addMessage = (conversationId: string, message: any) => {
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), message]
    }));
  };

  return (
    <MockDataContext.Provider value={{
      currentUser,
      setCurrentUser,
      matches,
      addMatch,
      conversations,
      addConversation,
      messages,
      addMessage
    }}>
      {children}
    </MockDataContext.Provider>
  );
};

export const useMockData = () => {
  const context = useContext(MockDataContext);
  if (context === undefined) {
    throw new Error('useMockData must be used within a MockDataProvider');
  }
  return context;
};
