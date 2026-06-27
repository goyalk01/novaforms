'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClerkProvider, useUser, useClerk } from '@clerk/nextjs';

interface AuthUser {
  email: string;
  fullName: string;
  id: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoaded: boolean;
  isClerkEnabled: boolean;
  simulatedUser: string;
  changeSimulatedUser: (email: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      window.fetch = async function (input, init) {
        try {
          return await originalFetch(input, init);
        } catch (error) {
          if (apiBaseUrl && apiBaseUrl !== 'http://localhost:8080') {
            let urlString = '';
            if (typeof input === 'string') {
              urlString = input;
            } else if (input instanceof URL) {
              urlString = input.toString();
            } else if (input && typeof input === 'object' && 'url' in input) {
              urlString = (input as any).url;
            }

            if (urlString && urlString.startsWith(apiBaseUrl)) {
              const fallbackUrl = urlString.replace(apiBaseUrl, 'http://localhost:8080');
              console.warn(`API call to production failed (${apiBaseUrl}). Retrying on localhost fallback...`);
              
              if (typeof input === 'string') {
                return originalFetch(fallbackUrl, init);
              } else if (input instanceof URL) {
                return originalFetch(new URL(fallbackUrl), init);
              } else if (input && typeof input === 'object' && 'url' in input) {
                try {
                  const newRequest = new Request(fallbackUrl, input as Request);
                  return originalFetch(newRequest, init);
                } catch (e) {
                  return originalFetch(fallbackUrl, init);
                }
              }
            }
          }
          throw error;
        }
      };

      return () => {
        window.fetch = originalFetch;
      };
    }
  }, []);

  if (clerkPublishableKey) {
    return (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <ClerkAuthWrapper>{children}</ClerkAuthWrapper>
      </ClerkProvider>
    );
  } else {
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  }
}

function ClerkAuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      setCurrentUser({
        email: user.primaryEmailAddress?.emailAddress ?? '',
        fullName: user.fullName ?? user.username ?? user.primaryEmailAddress?.emailAddress?.split('@')[0] ?? 'User',
        id: user.id
      });
    } else if (isLoaded && !user) {
      setCurrentUser(null);
    }
  }, [isLoaded, user]);

  const value: AuthContextType = {
    user: currentUser,
    isLoaded: isLoaded,
    isClerkEnabled: true,
    simulatedUser: '',
    changeSimulatedUser: () => {},
    signOut: () => signOut()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function LocalAuthProvider({ children }: { children: React.ReactNode }) {
  const [simulatedUser, setSimulatedUser] = useState('owner@novaforms.com');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('novaforms-simulated-user');
    if (saved) {
      setSimulatedUser(saved);
    } else {
      localStorage.setItem('novaforms-simulated-user', 'owner@novaforms.com');
    }
    setIsLoaded(true);

    const handleUserChange = () => {
      const updated = localStorage.getItem('novaforms-simulated-user') ?? 'owner@novaforms.com';
      setSimulatedUser(updated);
    };

    window.addEventListener('novaforms-user-changed', handleUserChange);
    return () => {
      window.removeEventListener('novaforms-user-changed', handleUserChange);
    };
  }, []);

  const changeSimulatedUser = (email: string) => {
    localStorage.setItem('novaforms-simulated-user', email);
    setSimulatedUser(email);
    window.dispatchEvent(new Event('novaforms-user-changed'));
  };

  const user: AuthUser = {
    email: simulatedUser,
    fullName: simulatedUser.split('@')[0],
    id: simulatedUser
  };

  const value: AuthContextType = {
    user,
    isLoaded,
    isClerkEnabled: false,
    simulatedUser,
    changeSimulatedUser,
    signOut: () => {
      changeSimulatedUser('owner@novaforms.com');
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
