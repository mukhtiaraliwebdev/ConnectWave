
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/logo';
import { NavMenu } from '@/components/nav-menu';
import Link from 'next/link';
import { Settings, Bell, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore'; // Removed getCountFromServer
import { Badge } from '@/components/ui/badge';
import type { Conversation, Notification as GeneralNotificationType } from '@/types'; // Added GeneralNotificationType

const protectedRoutes = ['/', '/feed', '/explore', '/recommendations', '/messages', '/profile', '/notifications'];

export function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, appUser, loading, initialLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadGeneralNotificationCount, setUnreadGeneralNotificationCount] = useState(0);

  useEffect(() => {
    if (!initialLoading && !currentUser && protectedRoutes.includes(pathname)) {
      router.push('/login');
    }
  }, [currentUser, initialLoading, router, pathname]);

  // Listener for friend requests
  useEffect(() => {
    if (currentUser) {
      const requestsRef = collection(db, "friendRequests");
      const q = query(requestsRef, 
                      where("receiverId", "==", currentUser.uid), 
                      where("status", "==", "pending"));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setFriendRequestCount(snapshot.size);
      }, (error) => {
        console.error("Error fetching friend request count:", error);
        setFriendRequestCount(0);
      });
      return () => unsubscribe();
    } else {
      setFriendRequestCount(0);
    }
  }, [currentUser]);

  // Listener for unread messages
  useEffect(() => {
    if (currentUser) {
      const convQuery = query(
        collection(db, "conversations"),
        where("participantIds", "array-contains", currentUser.uid)
      );
      const unsubscribe = onSnapshot(convQuery, (snapshot) => {
        let totalUnread = 0;
        snapshot.forEach((docSnap) => {
          const conv = docSnap.data() as Conversation;
          if (!conv.deletedBy || !conv.deletedBy[currentUser.uid]) {
            totalUnread += conv.unreadCount?.[currentUser.uid] || 0;
          }
        });
        setUnreadMessageCount(totalUnread);
      }, (error) => {
        console.error("Error fetching unread message count:", error);
        setUnreadMessageCount(0);
      });
      return () => unsubscribe();
    } else {
      setUnreadMessageCount(0);
    }
  }, [currentUser]);

  // Listener for unread general notifications (likes, comments)
  useEffect(() => {
    if (currentUser) {
      const notificationsRef = collection(db, "notifications");
      const q = query(notificationsRef,
                      where("recipientId", "==", currentUser.uid),
                      where("read", "==", false));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadGeneralNotificationCount(snapshot.size);
      }, (error) => {
        console.error("Error fetching unread general notification count:", error);
        setUnreadGeneralNotificationCount(0);
      });
      return () => unsubscribe();
    } else {
      setUnreadGeneralNotificationCount(0);
    }
  }, [currentUser]);
  
  const totalBellNotificationCount = friendRequestCount + unreadGeneralNotificationCount;

  if (initialLoading && protectedRoutes.includes(pathname)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser && protectedRoutes.includes(pathname)) {
     return ( 
      <div className="flex h-screen items-center justify-center bg-background">
        <p>Redirecting to login...</p>
        <Loader2 className="ml-2 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userDisplayName = appUser?.name || currentUser?.displayName || "User";
  const userUsername = appUser?.username || "username";
  const userAvatarFallback = (appUser?.name || currentUser?.displayName || "U")
    .substring(0, 2)
    .toUpperCase();
  const userAvatarUrl = appUser?.avatarUrl || currentUser?.photoURL || "https://placehold.co/40x40.png";


  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="sidebar" className="border-r">
        <SidebarHeader className="p-4">
          <Logo />
        </SidebarHeader>
        <SidebarContent className="p-2 pt-0">
          <NavMenu 
            friendRequestCount={friendRequestCount} 
            unreadGeneralNotificationCount={unreadGeneralNotificationCount}
            unreadMessageCount={unreadMessageCount} 
          />
        </SidebarContent>
        {currentUser && appUser && (
          <SidebarFooter className="p-2">
            <Link href="/profile" passHref legacyBehavior>
              <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userAvatarUrl} alt={userDisplayName} data-ai-hint="profile avatar" />
                  <AvatarFallback>{userAvatarFallback}</AvatarFallback>
                </Avatar>
                <div className="group-data-[collapsible=icon]:hidden flex flex-col items-start">
                  <span className="truncate max-w-[100px] font-semibold">{userDisplayName}</span>
                  <span className="truncate max-w-[100px] text-xs text-muted-foreground">@{userUsername}</span>
                </div>
              </Button>
            </Link>
          </SidebarFooter>
        )}
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <span className="text-lg font-semibold">ConnectWave</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            {currentUser && (
              <>
                <Link href="/notifications" passHref legacyBehavior>
                  <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                    <Bell className="h-5 w-5" />
                    {totalBellNotificationCount > 0 && (
                      <Badge variant="destructive" className="absolute -right-1 -top-1 h-4 w-4 justify-center rounded-full p-0 text-xs">
                        {totalBellNotificationCount > 9 ? '9+' : totalBellNotificationCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link href="/profile" passHref legacyBehavior>
                  <Button variant="ghost" size="icon" aria-label="Settings">
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={userAvatarUrl} alt={userDisplayName} data-ai-hint="profile avatar"/>
                  <AvatarFallback>{userAvatarFallback.charAt(0)}</AvatarFallback>
                </Avatar>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ConnectWave. All rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
