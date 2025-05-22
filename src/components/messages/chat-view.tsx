
"use client";

import { useEffect, useRef, useState } from 'react';
import type { Message, Conversation, ParticipantInfo } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageInput } from './message-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Loader2, MessageCircleIcon as DefaultMessageCircleIcon, MoreVertical, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context'; // Added import for useAuth

interface ChatViewProps {
  conversation: Conversation | null;
  messages: Message[];
  onSendMessage: (text: string, conversationId: string) => void;
  currentUserId: string;
  isLoadingMessages: boolean;
  onDeleteConversation: (conversationId: string) => void;
}

export function ChatView({ 
  conversation, 
  messages: propMessages, 
  onSendMessage, 
  currentUserId, 
  isLoadingMessages,
  onDeleteConversation 
}: ChatViewProps) {
  const { appUser } = useAuth(); // Get appUser using the hook
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [propMessages, conversation]); // Rerun when messages or conversation changes


  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <DefaultMessageCircleIcon className="mb-4 h-16 w-16" />
        <p className="text-lg">Select a conversation to start chatting</p>
        <p className="text-sm">Or find someone new on the Explore page!</p>
      </div>
    );
  }

  const otherParticipant = conversation.participants.find(p => p.id !== currentUserId) || conversation.participants[0] || 
                           { id:'unknown', name: 'Unknown User', username:'unknown', avatarUrl:'' } as ParticipantInfo;

  const handleSendMessage = (text: string) => {
    onSendMessage(text, conversation.id);
  };

  const handleDelete = async () => {
    if (!conversation) return;
    setIsDeleting(true);
    try {
        await onDeleteConversation(conversation.id);
        // UI will update via parent state change
    } catch (error) {
        // Parent should show toast
    } finally {
        setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-card shadow-inner">
      <header className="flex items-center justify-between gap-3 border-b p-4">
        <div className="flex items-center gap-3">
            <Avatar>
            <AvatarImage src={otherParticipant?.avatarUrl} alt={otherParticipant?.name} data-ai-hint="profile avatar" />
            <AvatarFallback>{otherParticipant?.name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
            <h2 className="font-semibold text-card-foreground">{otherParticipant?.name}</h2>
            {/* <p className="text-xs text-muted-foreground">Online</p>  Mock status, can be dynamic later */}
            </div>
        </div>
        <AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Conversation options</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hide Conversation
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Hide Conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will hide the conversation from your list. It will not be deleted for the other participant. Are you sure?
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Hide
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </header>
      
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4" ref={viewportRef}>
          {isLoadingMessages && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!isLoadingMessages && propMessages.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
                No messages yet. Start the conversation!
            </div>
          )}
          {!isLoadingMessages && propMessages.map((msg) => {
            const isCurrentUserSender = msg.senderId === currentUserId;
            const senderName = isCurrentUserSender ? "You" : msg.senderName; 
            const senderAvatarUrl = msg.senderAvatarUrl;
            let messageTimestamp = "Sending...";
             if (msg.timestamp) {
                try {
                    const date = typeof msg.timestamp === 'string' ? parseISO(msg.timestamp) : new Date(msg.timestamp.seconds * 1000);
                    messageTimestamp = format(date, "p");
                } catch (e) {
                     console.warn("Could not parse message timestamp", msg.timestamp);
                     messageTimestamp = "Just now";
                }
            }


            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-end gap-2",
                  isCurrentUserSender ? "justify-end" : "justify-start"
                )}
              >
                {!isCurrentUserSender && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={senderAvatarUrl} alt={senderName} data-ai-hint="profile avatar small" />
                    <AvatarFallback>{senderName?.substring(0,1)?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[70%] rounded-xl px-3 py-2 shadow-sm", // Adjusted padding
                    isCurrentUserSender
                      ? "rounded-br-none bg-primary text-primary-foreground"
                      : "rounded-bl-none bg-muted text-card-foreground" // Use card-foreground for better contrast on muted
                  )}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className={cn("mt-1 text-xs opacity-70", isCurrentUserSender ? "text-primary-foreground/80" : "text-muted-foreground/80" )}>
                    {messageTimestamp}
                  </p>
                </div>
                {isCurrentUserSender && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={senderAvatarUrl} alt={senderName} data-ai-hint="profile avatar small self" />
                    <AvatarFallback>{appUser?.name?.substring(0,1)?.toUpperCase() || 'Y'}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}

// Renamed to avoid conflict if lucide-react is updated
function MessageCircleIcon(props: { className?: string }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
    </svg>
  );
}
