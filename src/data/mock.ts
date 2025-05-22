import type { User, Post, Message, Conversation } from '@/types';

export const mockUsers: User[] = [
  {
    id: 'user1',
    name: 'Alice Wonderland',
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Exploring new ideas and connecting with creative minds. Lover of coffee and code.',
    interests: ['technology', 'art', 'travel'],
  },
  {
    id: 'user2',
    name: 'Bob The Builder',
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Building innovative solutions and sharing knowledge. Always learning something new.',
    interests: ['software development', 'AI', 'hiking'],
  },
  {
    id: 'user3',
    name: 'Charlie Brown',
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Passionate about design and user experience. Enjoys photography and nature.',
    interests: ['design', 'photography', 'nature'],
  },
  {
    id: 'user4',
    name: 'Diana Prince',
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Advocate for open source and community building. Loves reading and gaming.',
    interests: ['open source', 'community', 'gaming', 'fantasy novels'],
  }
];

export const mockPosts: Post[] = [
  {
    id: 'post1',
    author: mockUsers[0],
    content: 'Just launched a new project! Check out this amazing landscape I captured during my morning hike. #nature #photography',
    imageUrl: 'https://placehold.co/600x400.png',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    likes: 152,
    comments: 12,
  },
  {
    id: 'post2',
    author: mockUsers[1],
    content: 'Deep dive into serverless architectures. Fascinating stuff! What are your favorite cloud providers for serverless?',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    likes: 230,
    comments: 45,
  },
  {
    id: 'post3',
    author: mockUsers[2],
    content: 'My latest UI design concept for a music streaming app. Feedback welcome! What do you think of the color palette?',
    imageUrl: 'https://placehold.co/600x400.png',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    likes: 98,
    comments: 22,
  },
  {
    id: 'post4',
    author: mockUsers[3],
    content: 'Excited to share my thoughts on the future of AI in gaming. The possibilities are endless! Check out my latest blog post.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    likes: 175,
    comments: 30,
  }
];

export const mockMessages: { [conversationId: string]: Message[] } = {
  'conv1': [
    { id: 'msg1', sender: mockUsers[0], text: 'Hey Bob, how are you?', timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString() },
    { id: 'msg2', sender: mockUsers[1], text: 'Hi Alice! Doing great, working on a new feature. You?', timestamp: new Date(Date.now() - 1000 * 60 * 48).toISOString() },
    { id: 'msg3', sender: mockUsers[0], text: 'Awesome! Just chilling today.', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  ],
  'conv2': [
    { id: 'msg4', sender: mockUsers[2], text: 'Hey Diana, saw your post on AI in gaming, great insights!', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: 'msg5', sender: mockUsers[3], text: 'Thanks Charlie! Appreciate it. What are your thoughts?', timestamp: new Date(Date.now() - 1000 * 60 * 28).toISOString() },
  ],
};

export const mockConversations: Conversation[] = [
  {
    id: 'conv1',
    participants: [mockUsers[0], mockUsers[1]],
    lastMessage: mockMessages['conv1'][mockMessages['conv1'].length - 1],
    unreadCount: 1,
  },
  {
    id: 'conv2',
    participants: [mockUsers[2], mockUsers[3]],
    lastMessage: mockMessages['conv2'][mockMessages['conv2'].length - 1],
  },
  {
    id: 'conv3',
    participants: [mockUsers[0], mockUsers[2]],
    lastMessage: { id: 'msg6', sender: mockUsers[0], text: 'Want to collaborate on a design project?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  }
];
