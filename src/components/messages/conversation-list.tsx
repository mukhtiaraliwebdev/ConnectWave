
"use client";

import type { Conversation, ParticipantInfo } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  currentUserId: string;
}

export function ConversationList({ conversations, selectedConversationId, onSelectConversation, currentUserId }: ConversationListProps) {
  return (
    <ScrollArea className="h-[calc(100%-4rem)]"> {/* Adjust height based on header */}
      <div className="flex flex-col gap-px">
        {conversations.map(conv => {
          const otherParticipant = conv.participants.find(p => p.id !== currentUserId) || conv.participants[0] || 
                                   { id: 'unknown', name: 'Unknown User', username: 'unknown', avatarUrl: '' } as ParticipantInfo;
          const isActive = conv.id === selectedConversationId;
          const unreadCount = conv.unreadCount?.[currentUserId] || 0;

          let lastMessageTimestamp = "Recently";
          if (conv.lastMessage?.timestamp) {
            try {
              const date = typeof conv.lastMessage.timestamp === 'string' ? parseISO(conv.lastMessage.timestamp) : new Date(conv.lastMessage.timestamp.seconds * 1000);
              lastMessageTimestamp = formatDistanceToNowStrict(date, { addSuffix: true });
            } catch (e) {
              console.warn("Could not parse last message timestamp", conv.lastMessage.timestamp);
            }
          }


          return (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={cn(
                "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/80",
                isActive ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.name} data-ai-hint="profile avatar" />
                <AvatarFallback>{otherParticipant.name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="truncate text-sm font-semibold text-foreground">{otherParticipant.name}</h3>
                  {conv.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {lastMessageTimestamp}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs text-muted-foreground">
                    {conv.lastMessage?.senderId === currentUserId ? "You: " : ""}
                    {conv.lastMessage?.text || "No messages yet"}
                  </p>
                  {unreadCount > 0 && (
                    <Badge variant="default" className="h-5 shrink-0 px-1.5 text-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
