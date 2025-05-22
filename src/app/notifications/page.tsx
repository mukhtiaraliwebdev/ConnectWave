
"use client";

import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from "@/components/app-layout";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus, Check, X, MailWarning, Heart, MessageCircle as MessageIcon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch, 
  arrayUnion, 
  serverTimestamp, 
  Timestamp,
  orderBy // Added orderBy
} from 'firebase/firestore';
import type { FriendRequest, User, Notification } from '@/types'; // Added Notification type
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';

export default function NotificationsPage() {
  const { currentUser, appUser, initialLoading: authInitialLoading, refreshAppUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [generalNotifications, setGeneralNotifications] = useState<Notification[]>([]); // For likes/comments
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      // Fetch Friend Requests
      const requestsRef = collection(db, "friendRequests");
      const frQuery = query(requestsRef, where("receiverId", "==", currentUser.uid), where("status", "==", "pending"), orderBy("createdAt", "desc"));
      const frSnapshot = await getDocs(frQuery);
      const fetchedRequests: FriendRequest[] = [];
      frSnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedRequests.push({ 
            id: doc.id, 
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as FriendRequest);
      });
      setFriendRequests(fetchedRequests);

      // Fetch General Notifications (Likes, Comments)
      const notificationsRef = collection(db, "notifications");
      const genNotifQuery = query(notificationsRef, where("recipientId", "==", currentUser.uid), orderBy("createdAt", "desc"));
      const genNotifSnapshot = await getDocs(genNotifQuery);
      const fetchedGeneralNotifications: Notification[] = [];
      const batch = writeBatch(db); // For marking notifications as read
      let hasUnread = false;

      genNotifSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const notification = {
            id: docSnap.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Notification;
        fetchedGeneralNotifications.push(notification);
        // Mark as read if not already - only on initial load of this page or when explicitly requested
        // For simplicity here, we'll mark all fetched as read if they aren't.
        // A more robust solution might only mark them as read upon interaction or a "mark all read" button.
        if (!notification.read) {
          // batch.update(doc(db, "notifications", notification.id), { read: true }); // See handleMarkAllAsRead
          // hasUnread = true;
        }
      });
      setGeneralNotifications(fetchedGeneralNotifications);
      // if (hasUnread) {
      //   await batch.commit();
      // }

    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load notifications." });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!authInitialLoading && !currentUser) {
      router.push('/login');
    } else if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser, authInitialLoading, router, fetchNotifications]);

  const handleFriendRequestAction = async (request: FriendRequest, action: 'accept' | 'decline') => {
    if (!currentUser || !appUser) return;
    
    const requestId = request.id;
    const senderId = request.senderId;
    
    try {
      const batch = writeBatch(db);
      const requestRef = doc(db, "friendRequests", requestId);

      if (action === 'accept') {
        batch.update(requestRef, { status: "accepted" });
        const currentUserRef = doc(db, "users", currentUser.uid);
        batch.update(currentUserRef, { friends: arrayUnion(senderId), updatedAt: serverTimestamp() });
        const senderUserRef = doc(db, "users", senderId);
        batch.update(senderUserRef, { friends: arrayUnion(currentUser.uid), updatedAt: serverTimestamp() });
        toast({ title: "Friend Request Accepted", description: `You are now friends with ${request.senderName}.` });
      } else { 
        batch.update(requestRef, { status: "declined" });
        toast({ title: "Friend Request Declined" });
      }
      
      await batch.commit();
      setFriendRequests(prev => prev.filter(r => r.id !== requestId)); 
      await refreshAppUser(); 

    } catch (error) {
      console.error(`Error ${action === 'accept' ? 'accepting' : 'declining'} friend request:`, error);
      toast({ variant: "destructive", title: "Error", description: `Could not ${action} friend request. ${(error as Error).message}` });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await updateDoc(doc(db, "notifications", notification.id), { read: true });
        setGeneralNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    // For now, all like/comment notifications link to feed.
    // A more advanced version would link to /posts/{notification.postId}
    if (notification.postId) {
        router.push(`/feed#post-${notification.postId}`); // Or just /feed and let user find it
    } else {
        router.push('/feed');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    const unreadNotifications = generalNotifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) {
      toast({ title: "No unread notifications." });
      return;
    }

    const batch = writeBatch(db);
    unreadNotifications.forEach(n => {
      batch.update(doc(db, "notifications", n.id), { read: true });
    });

    try {
      await batch.commit();
      setGeneralNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast({ title: "All notifications marked as read." });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not mark all as read." });
    }
  };


  if (authInitialLoading || (!currentUser && authInitialLoading)) {
    return (
      <AppLayout>
        <div className="flex h-[calc(100vh-15rem)] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  
  if (!currentUser) {
      return (
          <AppLayout>
              <div className="container mx-auto py-4 text-center">
                  <p>Please log in to view your notifications.</p>
              </div>
          </AppLayout>
      );
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl py-4">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground">Manage your alerts and requests.</p>
          </div>
          {generalNotifications.some(n => !n.read) && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                Mark all as read
            </Button>
          )}
        </header>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Friend Requests</CardTitle>
                <CardDescription>Review users who want to connect with you.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && friendRequests.length === 0 ? (
                     <div className="flex justify-center py-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : friendRequests.length > 0 ? (
                    <ul className="space-y-4">
                        {friendRequests.map(request => (
                            <li key={request.id} className="flex items-center justify-between gap-4 rounded-md border p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={request.senderAvatarUrl} alt={request.senderName} data-ai-hint="profile avatar"/>
                                        <AvatarFallback>{request.senderName.substring(0,1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-foreground">{request.senderName}</p>
                                        <p className="text-sm text-muted-foreground">Wants to connect with you.</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNowStrict(new Date(request.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600" onClick={() => handleFriendRequestAction(request, 'accept')}>
                                        <Check className="mr-1 h-4 w-4" /> Accept
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleFriendRequestAction(request, 'decline')}>
                                        <X className="mr-1 h-4 w-4" /> Decline
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : !isLoading ? (
                    <div className="py-8 text-center">
                        <UserPlus className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">You have no pending friend requests.</p>
                        <Button variant="link" asChild className="mt-2">
                            <Link href="/explore">Explore users</Link>
                        </Button>
                    </div>
                ) : null }
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Activity</CardTitle>
                <CardDescription>Recent likes and comments on your posts.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && generalNotifications.length === 0 ? (
                     <div className="flex justify-center py-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : generalNotifications.length > 0 ? (
                    <ul className="space-y-2">
                        {generalNotifications.map(notif => (
                            <li key={notif.id} 
                                className={`flex items-center gap-3 rounded-md border p-3 shadow-sm transition-colors hover:bg-muted/50 ${!notif.read ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
                                onClick={() => handleNotificationClick(notif)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notif)}
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={notif.senderAvatarUrl} alt={notif.senderName} data-ai-hint="profile avatar small" />
                                    <AvatarFallback>{notif.senderName.substring(0,1).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="text-sm">
                                        <span className="font-semibold text-foreground">{notif.senderName}</span>
                                        {notif.type === 'like' && (
                                            <>
                                                <Heart className="mx-1 inline h-4 w-4 text-red-500 fill-red-500" />
                                                liked your post: <span className="italic text-muted-foreground">"{notif.postContentPreview}"</span>
                                            </>
                                        )}
                                        {notif.type === 'comment' && (
                                            <>
                                                <MessageIcon className="mx-1 inline h-4 w-4 text-primary" />
                                                commented on your post "{notif.postContentPreview}": <span className="italic text-muted-foreground">"{notif.commentTextPreview}"</span>
                                            </>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNowStrict(new Date(notif.createdAt), { addSuffix: true })}
                                        {!notif.read && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary"></span>}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : !isLoading ? (
                    <div className="py-8 text-center">
                        <MailWarning className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">You have no new activity notifications.</p>
                    </div>
                ) : null}
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
