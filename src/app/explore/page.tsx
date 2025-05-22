
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from "@/components/app-layout";
import { UserCard } from "@/components/users/user-card";
import { UserSearchBar } from "@/components/users/user-search-bar";
import type { User } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, startAt } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function ExplorePage() {
  const { currentUser, appUser, initialLoading: authInitialLoading, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!authInitialLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authInitialLoading, router]);

  const fetchUsers = useCallback(async (searchTerm: string = '') => {
    if (!currentUser) return;
    setIsLoadingUsers(true);
    try {
      const usersRef = collection(db, "users");
      let q;

      if (searchTerm) {
        const nameQuery = query(usersRef, 
                               orderBy("name"), 
                               where("name", ">=", searchTerm), 
                               where("name", "<=", searchTerm + '\uf8ff'),
                               limit(20));
        const usernameQuery = query(usersRef, 
                                  orderBy("username"), 
                                  where("username", ">=", searchTerm), 
                                  where("username", "<=", searchTerm + '\uf8ff'),
                                  limit(20));
        
        const [nameSnapshot, usernameSnapshot] = await Promise.all([
          getDocs(nameQuery),
          getDocs(usernameQuery)
        ]);

        const fetchedUsersMap = new Map<string, User>();
        nameSnapshot.forEach((doc) => {
          if (doc.id !== currentUser.uid) { 
            fetchedUsersMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
          }
        });
        usernameSnapshot.forEach((doc) => {
          if (doc.id !== currentUser.uid) { 
             fetchedUsersMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
          }
        });
        const combinedUsers = Array.from(fetchedUsersMap.values());
        setUsers(combinedUsers);
        setFilteredUsers(combinedUsers);

      } else {
        q = query(usersRef, orderBy("name"), limit(20));
        const querySnapshot = await getDocs(q);
        const fetchedUsers: User[] = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== currentUser.uid) { 
            fetchedUsers.push({ id: doc.id, ...doc.data() } as User);
          }
        });
        setUsers(fetchedUsers);
        setFilteredUsers(fetchedUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load users." });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    // Fetch users only if currentUser is available (implies auth is resolved)
    // and appUser is also loaded (authLoading is false)
    if (currentUser && appUser && !authLoading) {
        fetchUsers(); 
    }
  }, [fetchUsers, currentUser, appUser, authLoading]);
  
  const handleSearch = (queryText: string) => {
    setSearchQuery(queryText.toLowerCase());
    if (queryText.trim() === "") {
        fetchUsers(); 
    } else {
        fetchUsers(queryText);
    }
  };
  
  // Combined loading state check
  if (authInitialLoading || authLoading) {
    return (
      <AppLayout>
        <div className="flex h-[calc(100vh-15rem)] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // After initial loading, if no currentUser, redirect or show login message
  if (!currentUser) {
      return (
          <AppLayout>
              <div className="container mx-auto py-4 text-center">
                  <p>Please log in to explore users.</p>
                  {/* Optionally, add a button to redirect to login if router.push in useEffect doesn't trigger immediately */}
              </div>
          </AppLayout>
      );
  }
  
  // If currentUser exists but appUser (Firestore profile) is somehow still missing
  // This case should ideally be caught by authLoading, but as a safeguard:
  if (!appUser) {
     return (
      <AppLayout>
        <div className="flex h-[calc(100vh-15rem)] items-center justify-center">
          <p className="text-muted-foreground">User profile data is not available. Please try refreshing.</p>
        </div>
      </AppLayout>
    );
  }


  return (
    <AppLayout>
      <div className="container mx-auto py-4">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Discover People</h1>
          <p className="text-muted-foreground">Find and connect with like-minded individuals.</p>
        </header>
        
        <div className="flex justify-center">
          <UserSearchBar onSearch={handleSearch} />
        </div>

        {isLoadingUsers ? (
           <div className="flex justify-center py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredUsers.map(user => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-center text-muted-foreground">
            {searchQuery ? "No users found matching your search." : "No users found. Try searching or check back later!"}
          </p>
        )}
      </div>
    </AppLayout>
  );
}
