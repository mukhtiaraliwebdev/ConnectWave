'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { ConversationList } from '@/components/messages/conversation-list';
import { ChatView } from '@/components/messages/chat-view';
import type { Conversation, Message } from '@/types';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, MessageSquareDiff } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  increment,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function MessagesPageContent() {
  const { currentUser, appUser, initialLoading: authInitialLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!authInitialLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authInitialLoading, router]);

  useEffect(() => {
    if (!currentUser) return;

    setLoadingConversations(true);
    const convQuery = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(convQuery, (snapshot) => {
      const fetchedConversations: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const conv = {
          id: docSnap.id,
          ...data,
          updatedAt: (data.updatedAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
          lastMessage: data.lastMessage ? {
            ...data.lastMessage,
            timestamp: (data.lastMessage.timestamp as Timestamp)?.toDate()?.toISOString() || new Date().toISOString()
          } : null,
        } as Conversation;

        if (!conv.deletedBy || !conv.deletedBy[currentUser.uid]) {
          fetchedConversations.push(conv);
        }
      });
      setConversations(fetchedConversations);
      setLoadingConversations(false);

      const queryConvId = searchParams.get('conversationId');
      if (queryConvId && fetchedConversations.find(c => c.id === queryConvId)) {
        if (!selectedConversationId) {
          handleSelectConversation(queryConvId);
        }
      }
    }, (error) => {
      console.error("Error fetching conversations:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load conversations." });
      setLoadingConversations(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast, searchParams, selectedConversationId]);

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    const conv = conversations.find(c => c.id === conversationId) || null;
    setSelectedConversation(conv);

    if (conv && currentUser && conv.unreadCount && conv.unreadCount[currentUser.uid] > 0) {
      const convRef = doc(db, "conversations", conversationId);
      try {
        await updateDoc(convRef, {
          [`unreadCount.${currentUser.uid}`]: 0
        });
      } catch (error) {
        console.error("Error marking conversation as read:", error);
      }
    }
  }, [conversations, currentUser]);

  useEffect(() => {
    if (!selectedConversationId || !currentUser) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const messagesQuery = query(
      collection(db, "conversations", selectedConversationId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedMessages.push({
          id: docSnap.id,
          ...data,
          timestamp: (data.timestamp as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
        } as Message);
      });
      setMessages(fetchedMessages);
      setLoadingMessages(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load messages." });
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [selectedConversationId, currentUser, toast]);

  const handleSendMessage = async (text: string, conversationId: string) => {
    if (!currentUser || !appUser || !text.trim()) return;

    const currentConversation = conversations.find(c => c.id === conversationId);
    if (!currentConversation) return;

    const newMessageData: Omit<Message, 'id' | 'timestamp'> & { timestamp: any } = {
      senderId: currentUser.uid,
      senderName: appUser.name,
      senderAvatarUrl: appUser.avatarUrl,
      text: text.trim(),
      conversationId: conversationId,
      timestamp: serverTimestamp(),
    };

    const batch = writeBatch(db);
    const messageRef = doc(collection(db, "conversations", conversationId, "messages"));
    batch.set(messageRef, newMessageData);

    const conversationRef = doc(db, "conversations", conversationId);
    const lastMessageForConvUpdate = {
      text: newMessageData.text,
      senderId: newMessageData.senderId,
      timestamp: serverTimestamp()
    };

    const unreadUpdates: { [key: string]: any } = {};
    currentConversation.participantIds.forEach(pid => {
      unreadUpdates[`unreadCount.${pid}`] = pid !== currentUser.uid ? increment(1) : 0;
    });

    batch.update(conversationRef, {
      lastMessage: lastMessageForConvUpdate,
      updatedAt: serverTimestamp(),
      ...unreadUpdates,
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not send message." });
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!currentUser) return;
    try {
      const convRef = doc(db, "conversations", conversationId);
      await updateDoc(convRef, {
        [`deletedBy.${currentUser.uid}`]: serverTimestamp()
      });
      toast({ title: "Conversation Hidden", description: "The conversation has been hidden from your list." });
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error hiding conversation:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not hide conversation." });
    }
  };

  if (authInitialLoading || (!currentUser && authInitialLoading)) {
    return (
      <div className="flex h-[calc(100vh-15rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto py-4 text-center">
        <p>Please log in to view your messages.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto h-[calc(100vh-10rem)] py-4">
      <Card className="h-full overflow-hidden rounded-lg shadow-xl">
        <div className="grid h-full grid-cols-[minmax(250px,_1fr)_3fr] md:grid-cols-[minmax(300px,_1fr)_3fr]">
          <div className="h-full border-r bg-muted/20">
            <header className="border-b p-4">
              <h1 className="text-xl font-bold text-foreground">Messages</h1>
            </header>
            {loadingConversations ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
                <MessageSquareDiff className="mb-4 h-12 w-12" />
                <p className="text-sm">No conversations yet.</p>
                <p className="text-xs">Start a new chat from a user's profile or the explore page.</p>
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                onSelectConversation={handleSelectConversation}
                currentUserId={currentUser.uid}
              />
            )}
          </div>
          <div className="h-full">
            <ChatView
              conversation={selectedConversation}
              messages={messages}
              onSendMessage={handleSendMessage}
              currentUserId={currentUser.uid}
              isLoadingMessages={loadingMessages}
              onDeleteConversation={handleDeleteConversation}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
