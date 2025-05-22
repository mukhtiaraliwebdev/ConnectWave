
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import type { User as AppUser } from '@/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  initialLoading: boolean;
  refreshAppUser: () => Promise<void>; // Added for manual refresh
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  appUser: null,
  loading: true,
  initialLoading: true,
  refreshAppUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchAppUserData = useCallback(async (user: FirebaseUser | null) => {
    if (user) {
      setLoading(true);
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setAppUser({ id: userDocSnap.id, ...userDocSnap.data() } as AppUser);
        } else {
          console.warn("User document not found in Firestore for UID:", user.uid);
          setAppUser(null); 
        }
      } catch (error) {
        console.error("Error fetching app user data:", error);
        setAppUser(null);
      } finally {
        setLoading(false);
        // Only set initialLoading to false once, after the very first load attempt
        if (initialLoading) setInitialLoading(false);
      }
    } else {
      setAppUser(null);
      setLoading(false);
      if (initialLoading) setInitialLoading(false);
    }
  }, [initialLoading]); // Include initialLoading in dependencies for correct first-load handling

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      fetchAppUserData(user);
    });
    return () => unsubscribe();
  }, [fetchAppUserData]);

  const refreshAppUser = useCallback(async () => {
    if (currentUser) {
      await fetchAppUserData(currentUser);
    }
  }, [currentUser, fetchAppUserData]);

  const value = {
    currentUser,
    appUser,
    loading,
    initialLoading,
    refreshAppUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
