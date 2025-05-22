
"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus, MessageCircle, CheckCircle, XCircle, Loader2, Hourglass } from "lucide-react";
import type { User, FriendRequest, ParticipantInfo } from '@/types'; 
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  doc, 
  deleteDoc, 
  getDoc,
  setDoc 
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

interface UserCardProps {
  user: User;
}

export function UserCard({ user }: UserCardProps) {
  const { toast } = useToast();
  const { currentUser, appUser } = useAuth();
  const router = useRouter();
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending' | 'friends' | 'loading'>('loading');
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false); 

  const checkFriendshipAndRequests = useCallback(async () => {
    if (!currentUser || !appUser || currentUser.uid === user.id) {
      setRequestStatus('idle');
      return;
    }
    setRequestStatus('loading');
    
    if (appUser.friends?.includes(user.id)) {
      setRequestStatus('friends');
      setIsInteracting(false); // Ensure interacting state is reset
      return;
    }

    const requestsRef = collection(db, "friendRequests");
    const qSent = query(requestsRef,
      where("senderId", "==", currentUser.uid),
      where("receiverId", "==", user.id),
      where("status", "==", "pending")
    );
    const qReceived = query(requestsRef,
      where("senderId", "==", user.id),
      where("receiverId", "==", currentUser.uid),
      where("status", "==", "pending")
    );

    try {
      const [sentSnapshot, receivedSnapshot] = await Promise.all([getDocs(qSent), getDocs(qReceived)]);
      
      if (!sentSnapshot.empty) {
        setRequestStatus('pending');
        setFriendRequestId(sentSnapshot.docs[0].id);
      } else if (!receivedSnapshot.empty) {
        setRequestStatus('pending'); 
        setFriendRequestId(receivedSnapshot.docs[0].id);
      } else {
        setRequestStatus('idle');
      }
    } catch (error) {
      console.error("Error checking friendship/requests:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not check friend status." });
      setRequestStatus('idle');
    } finally {
      // No need to setIsInteracting(false) here as this is an initial load status
    }
  }, [currentUser, appUser, user.id, toast]); // Removed user.name as it's not directly used in logic here.

  useEffect(() => {
    checkFriendshipAndRequests();
  }, [checkFriendshipAndRequests]);


  const handleSendFriendRequest = async () => {
    if (!currentUser || !appUser || requestStatus !== 'idle') return;
    
    setIsInteracting(true);
    try {
      const newRequestRef = await addDoc(collection(db, "friendRequests"), {
        senderId: currentUser.uid,
        senderName: appUser.name,
        senderUsername: appUser.username,
        senderAvatarUrl: appUser.avatarUrl || '',
        receiverId: user.id,
        status: "pending",
        createdAt: serverTimestamp(),
      } as Omit<FriendRequest, 'id'>);
      setFriendRequestId(newRequestRef.id);
      setRequestStatus('pending');
      toast({ title: "Friend Request Sent", description: `Friend request sent to ${user.name}.` });
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not send friend request." });
      setRequestStatus('idle');
    } finally {
      setIsInteracting(false);
    }
  };
  
  const handleCancelFriendRequest = async () => {
    if (!currentUser || !friendRequestId || requestStatus !== 'pending') return;
    // To be more robust, fetch the request and check if currentUser.uid is indeed the sender.
    // For now, we assume if friendRequestId is set and status is 'pending', it's cancellable by this user (if they were the sender).
    
    setIsInteracting(true);
    try {
      await deleteDoc(doc(db, "friendRequests", friendRequestId));
      setRequestStatus('idle');
      setFriendRequestId(null);
      toast({ title: "Request Cancelled", description: `Friend request to ${user.name} cancelled.` });
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not cancel friend request." });
    } finally {
      setIsInteracting(false);
    }
  };

  const handleStartOrNavigateToChat = async () => {
    setIsInteracting(true); // Set loading state for the message button
    if (!currentUser) {
      toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to send messages." });
      setIsInteracting(false);
      return;
    }
     if (!appUser) {
      toast({ variant: "destructive", title: "Profile Error", description: "Your user profile is not fully loaded. Please wait or refresh." });
      setIsInteracting(false);
      return;
    }
    if (currentUser.uid === user.id) {
        setIsInteracting(false);
        return;
    }

    const conversationId = [currentUser.uid, user.id].sort().join('_');
    const conversationRef = doc(db, "conversations", conversationId);

    try {
      const docSnap = await getDoc(conversationRef);
      if (!docSnap.exists()) {
        const currentUserInfo: ParticipantInfo = {
          id: currentUser.uid,
          name: appUser.name,
          avatarUrl: appUser.avatarUrl,
          username: appUser.username,
        };
        const targetUserInfo: ParticipantInfo = {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          username: user.username,
        };

        await setDoc(conversationRef, {
          participantIds: [currentUser.uid, user.id],
          participants: [currentUserInfo, targetUserInfo],
          lastMessage: null,
          updatedAt: serverTimestamp(),
          unreadCount: { [currentUser.uid]: 0, [user.id]: 0 },
          deletedBy: {},
        });
        toast({ title: "Conversation Created", description: `Chat with ${user.name} started.` });
      }
      router.push(`/messages?conversationId=${conversationId}`);
    } catch (error) {
      console.error("Error starting or navigating to chat:", error);
      toast({ variant: "destructive", title: "Chat Error", description: "Could not start or find chat." });
    } finally {
      setIsInteracting(false);
    }
  };
  
  const renderFriendButton = () => {
    if (!currentUser || currentUser.uid === user.id) return null; 

    if (requestStatus === 'loading' || (isInteracting && (requestStatus === 'idle' || requestStatus === 'pending')) ) {
        return <Button variant="outline" size="sm" className="w-full" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading</Button>;
    }

    switch (requestStatus) {
      case 'pending':
        // Basic "Request Sent" for now. More complex logic could check if current user is sender or receiver.
        return <Button variant="outline" size="sm" onClick={handleCancelFriendRequest} className="w-full"><Hourglass className="mr-2 h-4 w-4" /> Request Sent</Button>;
      case 'friends':
        return <Button variant="outline" size="sm" disabled className="w-full border-green-500 text-green-500"><CheckCircle className="mr-2 h-4 w-4" /> Friends</Button>;
      case 'idle':
      default:
        return <Button variant="outline" size="sm" onClick={handleSendFriendRequest} className="w-full"><UserPlus className="mr-2 h-4 w-4" /> Add Friend</Button>;
    }
  };

  return (
    <Card className="overflow-hidden rounded-lg shadow-lg transition-shadow hover:shadow-xl">
      <CardHeader className="items-center bg-muted/30 p-4 text-center">
        <Avatar className="mb-3 h-20 w-20 border-2 border-primary">
          <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile avatar" />
          <AvatarFallback className="text-2xl">{(user.username || user.name).substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-lg font-semibold">{user.name}</CardTitle>
        <p className="text-sm text-primary">@{user.username}</p>
      </CardHeader>
      <CardContent className="p-4 text-center min-h-[80px]">
        <p className="mb-3 text-sm text-muted-foreground">{user.bio || "No bio available."}</p>
        {user.interests && user.interests.length > 0 && (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {user.interests.slice(0, 3).map(interest => (
              <Badge key={interest} variant="secondary" className="capitalize">{interest}</Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-2 border-t p-2">
        {renderFriendButton()}
        <Button 
            variant="default" 
            size="sm" 
            onClick={handleStartOrNavigateToChat} 
            className="w-full" 
            disabled={!currentUser || currentUser.uid === user.id || (isInteracting && requestStatus !== 'loading')} // Disable if current interaction is not for messaging
        >
          {isInteracting && requestStatus !== 'loading' && !renderFriendButton()?.props.disabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" /> }
          Message
        </Button>
      </CardFooter>
    </Card>
  );
}
