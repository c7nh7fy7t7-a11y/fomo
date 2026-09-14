export type Privacy = 'Public' | 'Request' | 'Private';
export type ReactionKind = 'heart' | 'fire' | 'laugh' | 'wow' | 'clap';
export type FeedMediaType = 'image' | 'video';
export type VerificationType = 'founder' | 'organizer' | 'official';
export type InterestKey = 'parties' | 'sports' | 'clubs' | 'study' | 'campus' | 'music' | 'social' | 'gaming';
export type RecurrenceVerificationStatus = 'verified' | 'community_confirmed' | 'seasonal' | 'unverified' | 'inactive';

export type EventRecurrence = {
  seriesId: string;
  type: 'weekly';
  dayOfWeek: number;
  startTime: string;
  endTime?: string;
  startDate: string;
  endDate?: string;
  timezone: string;
  active: boolean;
  curated: boolean;
  weeklyStaple: boolean;
  sortPriority: number;
  verificationStatus: RecurrenceVerificationStatus;
  verifiedAt?: string;
  occurrenceStartsAt: string;
  occurrenceEndsAt?: string;
};

export type NotificationPreferences = { messages:boolean; social:boolean; events:boolean; reminders:boolean };
export type OrganizerProfile = {
  profileId:string; displayName:string; handle:string; bio?:string; avatar?:string; websiteUrl?:string; verificationType?:VerificationType;
};

export type Person = {
  id: string;
  name: string;
  username: string;
  year: string;
  program: string;
  avatar?: string;
  bio?: string;
  verificationType?: VerificationType;
  initials: string;
};

export type FomoEvent = {
  id: string;
  title: string;
  category: string;
  day: string;
  eventDate: string;
  dateLabel: string;
  time: string;
  location: string;
  exactLocation?: string;
  description: string;
  privacy: Privacy;
  cover?: string;
  hostId: string;
  cohostIds?: string[];
  attendeeIds: string[];
  latitude: number;
  longitude: number;
  exactLatitude?: number;
  exactLongitude?: number;
  photos: string[];
  trending?: boolean;
  recurrence?: EventRecurrence;
};

export type FeedComment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type FeedReaction = {
  postId: string;
  userId: string;
  reaction: ReactionKind;
};

export type FeedPost = {
  id: string;
  authorId: string;
  eventId?: string;
  caption: string;
  mediaUrl?: string;
  mediaPath?: string;
  mediaType?: FeedMediaType;
  mediaWidth?: number;
  mediaHeight?: number;
  mediaDurationMs?: number;
  taggedUserIds: string[];
  reactions: FeedReaction[];
  comments: FeedComment[];
  viewCount: number;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  peerId: string;
  lastMessage?: string;
  lastMessageAt?: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sharedEventId?: string;
};

export type NotificationType = 'follow' | 'friend' | 'reaction' | 'comment' | 'tag' | 'event_approved' | 'event_invite' | 'message';

export type SocialNotification = {
  id: string;
  userId: string;
  actorId?: string;
  type: NotificationType;
  postId?: string;
  eventId?: string;
  messageId?: string;
  createdAt: string;
  readAt?: string;
};

export const people: Person[] = [
  { id: 'me', name: 'Ethan', username: 'ethanc', year: '2028', program: 'Computer Science', initials: 'EC' },
  { id: 'fox', name: 'Fox', username: 'foxm', year: '2028', program: 'Business', initials: 'FM', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80' },
  { id: 'eric', name: 'Eric', username: 'ericc', year: '2029', program: 'Business', initials: 'EC', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80' },
  { id: 'maya', name: 'Maya Chen', username: 'mayac', year: '2027', program: 'Engineering', initials: 'MC', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80' },
  { id: 'ava', name: 'Ava Singh', username: 'avasingh', year: '2028', program: 'Nursing', initials: 'AS', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' },
];

export const seedEvents: FomoEvent[] = [
  {
    id: 'cq-kickback', title: 'College Quarter Kickback', category: 'Social', day: 'Friday', eventDate: '2026-08-21', dateLabel: 'FRI · AUG 21',
    time: '9:30 PM', location: 'College Quarter',
    description: 'Back-to-campus kickback. Music, cards, and a packed living room. Request access for the exact unit.',
    privacy: 'Request', cover: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&auto=format&fit=crop&q=85',
    hostId: 'fox', attendeeIds: ['fox','maya','eric'], latitude: 52.129, longitude: -106.634,
    photos: [], trending: true,
  },
  {
    id: 'cmpt-study', title: 'CMPT 145 Study Sprint', category: 'Study', day: 'Sunday', eventDate: '2026-08-23', dateLabel: 'SUN · AUG 23',
    time: '6:30 PM', location: 'Murray Library', exactLocation: 'Murray Library · Ground floor tables',
    description: 'Two focused hours for review, practice questions, and comparing notes before the week starts.',
    privacy: 'Public', hostId: 'maya', attendeeIds: ['maya','me'], latitude: 52.1284, longitude: -106.6331,
    exactLatitude: 52.1284, exactLongitude: -106.6331, photos: [],
  },
  {
    id: 'river-chill', title: 'Drop-in Volleyball + River Chill', category: 'Sports & Rec', day: 'Sunday', eventDate: '2026-08-23', dateLabel: 'SUN · AUG 23',
    time: '3:00 PM', location: 'Meewasin Trail', exactLocation: 'Meewasin Trail by the volleyball courts',
    description: 'Low-key afternoon by the river. Bring a blanket, snacks, or a volleyball.',
    privacy: 'Public', cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop&q=85',
    hostId: 'ava', attendeeIds: ['ava','fox'], latitude: 52.1328, longitude: -106.6474,
    exactLatitude: 52.1328, exactLongitude: -106.6474, photos: [],
  },
];

export const seedPosts: FeedPost[] = [
  {
    id: 'post-1', authorId: 'fox', eventId: 'cq-kickback', caption: 'this one got out of hand fast',
    mediaUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=85', mediaType:'image',
    taggedUserIds: ['me','eric'], reactions: [{ postId:'post-1', userId:'maya', reaction:'fire' }],
    comments: [{ id:'c1', postId:'post-1', authorId:'maya', body:'round two friday', createdAt:new Date(Date.now()-1000*60*18).toISOString() }],
    viewCount: 84, createdAt: new Date(Date.now()-1000*60*32).toISOString(),
  },
  {
    id: 'post-2', authorId: 'maya', eventId: 'cmpt-study', caption: 'locked in',
    mediaUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=85', mediaType:'image',
    taggedUserIds: ['me'], reactions: [{ postId:'post-2', userId:'fox', reaction:'heart' }],
    comments: [], viewCount: 31, createdAt: new Date(Date.now()-1000*60*75).toISOString(),
  },
];

export const seedConversations: ConversationSummary[] = [
  { id: 'demo-chat-fox', peerId: 'fox', lastMessage: 'you coming friday?', lastMessageAt: new Date(Date.now()-1000*60*5).toISOString() },
];

export const seedMessages: ChatMessage[] = [
  { id:'m1', conversationId:'demo-chat-fox', senderId:'fox', body:'you coming friday?', createdAt:new Date(Date.now()-1000*60*5).toISOString() },
];
