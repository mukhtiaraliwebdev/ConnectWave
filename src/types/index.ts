
export interface User {
  id: string; // Corresponds to Firebase UID
  name: string;
  username: string; 
  email?: string; // Firebase provides email
  phoneNumber?: string; // Optional phone number
  avatarUrl?: string;
  bio?: string;
  interests?: string[];
  createdAt?: any; // Timestamp of user creation
  updatedAt?: any;
  friends?: string[]; // Array of friend UIDs
}

export interface ParticipantInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  username: string;
}

export interface Comment {
  id: string; // Firestore document ID
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: any; // Firestore Timestamp or ISO string for client
  updatedAt?: any; // Optional: Firestore Timestamp or ISO string for client
  parentId?: string | null; // For comment replies, null if top-level
  replyingToUsername?: string; // Username of the person being replied to
  rootParentId?: string | null; // ID of the original top-level comment
}

export interface Post {
  id: string; // Firestore document ID
  authorId: string; // UID of the author
  authorName: string; // Denormalized author name
  authorUsername?: string; // Denormalized author username
  authorAvatarUrl?: string; // Denormalized author avatar
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: any; // ISO string or Firestore Timestamp
  updatedAt?: any; // Optional: ISO string or Firestore Timestamp for edits
  likes: number;
  likedBy: string[]; // Array of user IDs who liked the post
  comments: number; // This will represent the count of comments
}

export interface Message {
  id:string; // Firestore document ID
  senderId: string; // UID of the sender
  senderName: string; // Denormalized sender name
  senderAvatarUrl?: string; // Denormalized sender avatar
  text: string;
  timestamp: any; // Firestore Timestamp or ISO string for client
  conversationId: string;
}

export interface Conversation {
  id: string; // Firestore document ID (e.g., uid1_uid2)
  participantIds: string[]; // Array of UIDs [uid1, uid2]
  participants: ParticipantInfo[]; // Array of simplified User objects
  lastMessage: Message | null; // Could be null if no messages yet
  updatedAt: any; // Firestore Timestamp for sorting
  unreadCount?: { [userId: string]: number }; // Unread count per user
  deletedBy?: { [userId: string]: any }; // Map of userId to Timestamp indicating when they "deleted" it
}

export interface FriendRequest {
  id: string; // Firestore document ID
  senderId: string;
  receiverId: string;
  senderName: string; // Denormalized
  senderUsername?: string; // Denormalized username
  senderAvatarUrl?: string; // Denormalized
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any; // Firestore Timestamp
}

export interface Notification {
  id: string; // Firestore document ID
  recipientId: string; // UID of the user who should receive this
  senderId: string; // UID of the user who performed the action
  senderName: string;
  senderAvatarUrl?: string;
  type: 'like' | 'comment'; 
  postId?: string; // ID of the post liked or commented on
  postContentPreview?: string; // Snippet of the post content
  commentTextPreview?: string; // Snippet of the comment
  read: boolean; 
  createdAt: any; // Firestore Timestamp
}
