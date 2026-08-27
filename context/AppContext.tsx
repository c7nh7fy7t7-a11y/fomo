import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatMessage, ConversationSummary, FeedMediaType, FeedPost, FomoEvent, InterestKey, NotificationPreferences, OrganizerProfile, people as seedPeople, Person, Privacy,
  ReactionKind, seedConversations, seedEvents, seedMessages, seedPosts, SocialNotification,
} from '@/data/seed';
import { backendConfigured, supabase } from '@/lib/supabase';
import { createBackendEvent, loadBackendState, uploadPrivateEventPhoto, uploadPublicImage } from '@/services/backend';
import { clearUserCache, hasOnboardedCache, markOnboarded, readSessionCache, writeSessionCache } from '@/services/cache';
import { cancelEventReminder, registerPushToken, scheduleEventReminder, sendPushForNotification, unregisterPushTokens } from '@/services/push';
import { blockPerson, invitePeopleToEvent, reportTarget, ReportReason, ReportTarget, saveNotificationPreferences, saveUserInterests, unblockPerson } from '@/services/v62';
import {
  addFeedComment, createFeedPost, deleteFeedComment, deleteFeedPost, getMyProfileViewCount,
  getOrCreateDirectConversation, loadConversations, loadFeed, loadMessages, loadNotifications,
  getProfileSocialStats as getProfileSocialStatsBackend, loadProfileFollowLists as loadProfileFollowListsBackend,
  markAllNotificationsRead as markAllNotificationsReadBackend, markNotificationRead as markNotificationReadBackend,
  recordFeedView, recordProfileView, removeSelfFromTag, sendEventShare, sendMessage, setPostReaction,
} from '@/services/social';

export type NewEventInput = {
  title: string; category: string; eventDate: string; time: string; location: string; exactLocation?: string;
  description: string; privacy: Privacy; cover?: string; latitude: number; longitude: number;
};
export type NewPostInput = {
  uri: string; caption: string; eventId?: string; taggedUserIds: string[]; mediaType?: FeedMediaType;
  mediaWidth?: number; mediaHeight?: number; mediaDurationMs?: number; mimeType?: string; fileName?: string;
};
type SignupInput = { email: string; password: string };
type AuthResult = { needsEmailConfirmation?: boolean; needsOnboarding?: boolean };
type OnboardingInput = { name: string; username: string; program: string; year: string; avatar?: string };

type AppContextValue = {
  currentUser: Person; people: Person[]; events: FomoEvent[]; posts: FeedPost[]; conversations: ConversationSummary[]; organizers: OrganizerProfile[];
  followingIds: string[]; followerIds: string[]; friendIds: string[]; savedEventIds: string[]; notifications: SocialNotification[]; interests: InterestKey[]; blockedIds:string[]; notificationPreferences:NotificationPreferences;
  unreadNotificationCount: number; requestedEventIds: string[]; eventRequestIdsByEvent: Record<string, string[]>; profileViewCount: number;
  backendConfigured: boolean; demoMode: boolean; isAuthenticated: boolean; authLoading: boolean; needsOnboarding: boolean | null; syncing: boolean; syncError?: string;
  enterDemoMode: () => void; signUp: (input: SignupInput) => Promise<AuthResult>; signIn: (email: string, password: string) => Promise<AuthResult>;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  signOut: () => Promise<void>; refreshAll: () => Promise<void>; refreshFeed: () => Promise<void>; loadMoreFeed: () => Promise<void>; hasMoreFeed:boolean; refreshConversations: () => Promise<void>; refreshNotifications: () => Promise<void>;
  toggleGoing: (eventId: string) => Promise<void>; toggleEventRequest: (eventId: string) => Promise<void>;
  approveEventRequest: (eventId: string, personId: string) => Promise<void>; declineEventRequest: (eventId: string, personId: string) => Promise<void>;
  removeEventAttendee: (eventId: string, personId: string) => Promise<void>; cancelEvent: (eventId: string) => Promise<void>;
  toggleFollow: (personId: string) => Promise<void>;
  updateAvatar: (uri?: string) => Promise<void>; updateProfile: (updates: Partial<Pick<Person, 'name' | 'username' | 'program' | 'year' | 'avatar' | 'bio'>>) => Promise<void>;
  addEvent: (input: NewEventInput) => Promise<FomoEvent>; addEventPhoto: (eventId: string, uri: string) => Promise<void>;
  toggleSavedEvent: (eventId: string) => Promise<void>; addCohost: (eventId: string, personId: string) => Promise<void>; removeCohost: (eventId: string, personId: string) => Promise<void>;
  createPost: (input: NewPostInput) => Promise<void>; reactToPost: (postId: string, reaction?: ReactionKind) => Promise<void>;
  addComment: (postId: string, body: string) => Promise<void>; removeComment: (commentId: string) => Promise<void>;
  markPostViewed: (postId: string) => Promise<void>; removeMyTag: (postId: string) => Promise<void>; removePost: (postId: string) => Promise<void>;
  openChatWith: (peerId: string) => Promise<string>; getChatMessages: (conversationId: string) => Promise<ChatMessage[]>;
  sendChat: (conversationId: string, body: string) => Promise<void>; shareEventWithPerson: (eventId: string, personId: string) => Promise<string>;
  recordPersonView: (profileId: string) => Promise<void>; markNotificationRead: (notificationId: string) => Promise<void>; markAllNotificationsRead: () => Promise<void>;
  getProfileSocialStats: (profileId: string) => Promise<{followers:number;following:number;friends:number;mutualFriends:number}>;
  loadProfileFollowLists: (profileId: string) => Promise<{followers:string[];following:string[];friends:string[]}>;
  saveInterests:(items:InterestKey[])=>Promise<void>; updateNotificationPreferences:(prefs:NotificationPreferences)=>Promise<void>; enablePushNotifications:()=>Promise<{enabled:boolean;reason?:string}>;
  invitePeople:(eventId:string,recipientIds:string[])=>Promise<void>; blockUser:(personId:string)=>Promise<void>; unblockUser:(personId:string)=>Promise<void>; report:(target:ReportTarget,reason:ReportReason,details?:string)=>Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);
const demoFallbackUser = seedPeople.find((person) => person.id === 'me') ?? seedPeople[0];
const liveFallbackUser: Person = { id:'loading-user', name:'Student', username:'student', year:'—', program:'', initials:'?' };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [people, setPeople] = useState<Person[]>(seedPeople);
  const [events, setEvents] = useState<FomoEvent[]>(seedEvents);
  const [posts, setPosts] = useState<FeedPost[]>(seedPosts);
  const [conversations, setConversations] = useState<ConversationSummary[]>(seedConversations);
  const [organizers,setOrganizers]=useState<OrganizerProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>(['fox','maya']);
  const [followerIds, setFollowerIds] = useState<string[]>(['fox','ava']);
  const [friendIds, setFriendIds] = useState<string[]>(['fox']);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [interests,setInterests]=useState<InterestKey[]>([]);
  const [blockedIds,setBlockedIds]=useState<string[]>([]);
  const [notificationPreferences,setNotificationPreferences]=useState<NotificationPreferences>({messages:true,social:true,events:true,reminders:true});
  const [requestedEventIds, setRequestedEventIds] = useState<string[]>([]);
  const [eventRequestIdsByEvent, setEventRequestIdsByEvent] = useState<Record<string, string[]>>({});
  const [profileViewCount, setProfileViewCount] = useState(0);
  const [feedLimit,setFeedLimit]=useState(30);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(!backendConfigured);
  const [authLoading, setAuthLoading] = useState(backendConfigured);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(backendConfigured ? null : false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | undefined>();
  const refreshingRef = useRef(false);
  const feedRefreshingRef = useRef(false);
  const convoRefreshingRef = useRef(false);
  const notificationRefreshingRef = useRef(false);
  const sessionLoadRef = useRef<string | null>(null);
  const showSyncFailure=(error:unknown)=>{console.warn('[FOMO:sync]',error);setSyncError('Couldn’t refresh right now. Showing your latest saved activity.');};

  const currentUser = sessionUserId
    ? people.find((person) => person.id === sessionUserId) ?? liveFallbackUser
    : people.find((person) => person.id === 'me') ?? demoFallbackUser;
  const useBackend = backendConfigured && !demoMode && Boolean(sessionUserId) && needsOnboarding === false;
  const unreadNotificationCount = notifications.filter((item) => !item.readAt).length;

  const applyBackendState = useCallback((state: Awaited<ReturnType<typeof loadBackendState>>) => {
    setPeople(state.people); setEvents(state.events); setFollowingIds(state.followingIds); setFollowerIds(state.followerIds);
    setFriendIds(state.friendIds); setSavedEventIds(state.savedEventIds); setRequestedEventIds(state.requestedEventIds);
    setEventRequestIdsByEvent(state.eventRequestIdsByEvent); setOrganizers(state.organizers); setInterests(state.interests); setBlockedIds(state.blockedIds); setNotificationPreferences(state.notificationPreferences);
  }, []);

  const refreshCampus = useCallback(async () => {
    if (!backendConfigured || demoMode || !sessionUserId) return;
    try { applyBackendState(await loadBackendState(sessionUserId)); } catch(error:any){ showSyncFailure(error); }
  }, [applyBackendState,demoMode,sessionUserId]);

  const refreshFeed = useCallback(async () => {
    if (!backendConfigured || demoMode || !sessionUserId || feedRefreshingRef.current) return;
    feedRefreshingRef.current = true;
    try { setPosts(await loadFeed(feedLimit)); } finally { feedRefreshingRef.current = false; }
  }, [demoMode, sessionUserId, feedLimit]);

  const loadMoreFeed=useCallback(async()=>{if(!backendConfigured||demoMode||!sessionUserId||feedRefreshingRef.current)return;const next=Math.min(feedLimit+30,120);if(next===feedLimit)return;feedRefreshingRef.current=true;try{const nextPosts=await loadFeed(next);setFeedLimit(next);setPosts(nextPosts);}finally{feedRefreshingRef.current=false;}},[demoMode,sessionUserId,feedLimit]);
  const hasMoreFeed=useBackend&&posts.length>=feedLimit&&feedLimit<120;

  const refreshConversations = useCallback(async () => {
    if (!backendConfigured || demoMode || !sessionUserId || convoRefreshingRef.current) return;
    convoRefreshingRef.current = true;
    try { setConversations(await loadConversations(sessionUserId)); } finally { convoRefreshingRef.current = false; }
  }, [demoMode, sessionUserId]);

  const refreshNotifications = useCallback(async () => {
    if (!backendConfigured || demoMode || !sessionUserId || notificationRefreshingRef.current) return;
    notificationRefreshingRef.current = true;
    try { setNotifications(await loadNotifications(80)); } finally { notificationRefreshingRef.current = false; }
  }, [demoMode, sessionUserId]);

  const refreshAll = useCallback(async () => {
    if (!backendConfigured || demoMode || !sessionUserId || refreshingRef.current) return;
    refreshingRef.current = true; setSyncing(true);
    try {
      const [state, feed, chats, views, notices] = await Promise.all([
        loadBackendState(sessionUserId), loadFeed(feedLimit), loadConversations(sessionUserId), getMyProfileViewCount(), loadNotifications(80),
      ]);
      applyBackendState(state); setPosts(feed); setConversations(chats); setProfileViewCount(views); setNotifications(notices); setSyncError(undefined);
      writeSessionCache(sessionUserId,{savedAt:Date.now(),state,posts:feed,conversations:chats,notifications:notices,profileViewCount:views});
    } catch (error: any) {
      showSyncFailure(error);
    } finally { refreshingRef.current = false; setSyncing(false); }
  }, [applyBackendState, demoMode, sessionUserId, feedLimit]);

  const checkOnboarding = useCallback(async (id: string) => {
    if (!supabase) return false;
    const { data, error } = await supabase.from('profiles').select('onboarding_completed').eq('id', id).single();
    if (error) throw error;
    const needs = !Boolean(data?.onboarding_completed);
    setNeedsOnboarding(needs);
    return needs;
  }, []);

  const loadSessionState = useCallback(async (id: string) => {
    if (!supabase || sessionLoadRef.current === id) return;
    sessionLoadRef.current = id;
    const cached=readSessionCache(id);
    if(cached){
      applyBackendState(cached.state); setPosts(cached.posts); setConversations(cached.conversations); setNotifications(cached.notifications); setProfileViewCount(cached.profileViewCount);
    }
    try {
      const [state, feed, chats, views, notices] = await Promise.all([
        loadBackendState(id), loadFeed(feedLimit), loadConversations(id), getMyProfileViewCount(), loadNotifications(80),
      ]);
      applyBackendState(state); setPosts(feed); setConversations(chats); setProfileViewCount(views); setNotifications(notices); setSyncError(undefined);
      writeSessionCache(id,{savedAt:Date.now(),state,posts:feed,conversations:chats,notifications:notices,profileViewCount:views});
    } finally {
      if (sessionLoadRef.current === id) sessionLoadRef.current = null;
    }
  }, [applyBackendState,feedLimit]);

  const hydrateAuthenticatedSession = useCallback(async (id: string) => {
    if(hasOnboardedCache(id)){
      setNeedsOnboarding(false);
      setSyncing(true); loadSessionState(id).finally(()=>setSyncing(false));
      checkOnboarding(id).catch(()=>{});
      return;
    }
    const needs = await checkOnboarding(id);
    if (needs) return;
    markOnboarded(id);
    setSyncing(true);
    try { await loadSessionState(id); }
    finally { setSyncing(false); }
  }, [checkOnboarding, loadSessionState]);

  useEffect(() => {
    if (!backendConfigured || !supabase) { setAuthLoading(false); setNeedsOnboarding(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const id = data.session?.user.id ?? null;
      setSessionUserId(id);
      setAuthLoading(false);
      if (!id) { setNeedsOnboarding(null); return; }
      setDemoMode(false);
      setNeedsOnboarding(null);
      hydrateAuthenticatedSession(id).catch((error: any) => mounted && showSyncFailure(error));
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      setSessionUserId(id);
      if (!id) { setNeedsOnboarding(null); return; }
      setDemoMode(false);
      setNeedsOnboarding(null);
      setTimeout(() => hydrateAuthenticatedSession(id).catch((error: any) => showSyncFailure(error)), 0);
    });
    return () => { mounted = false; authListener.subscription.unsubscribe(); };
  }, [hydrateAuthenticatedSession]);

  useEffect(() => {
    if (!useBackend || !supabase || !sessionUserId) return;
    const channel = supabase
      .channel(`fomo-v62-core-${sessionUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => refreshCampus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendees', filter:`user_id=eq.${sessionUserId}` }, () => refreshCampus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_cohosts', filter:`user_id=eq.${sessionUserId}` }, () => refreshCampus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter:`follower_id=eq.${sessionUserId}` }, () => refreshCampus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter:`following_id=eq.${sessionUserId}` }, () => refreshCampus())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, () => refreshFeed())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'feed_posts' }, () => refreshFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter:`user_id=eq.${sessionUserId}` }, () => refreshNotifications())
      .subscribe();
    registerPushToken(sessionUserId,false).catch(()=>{});
    return () => { supabase!.removeChannel(channel); };
  }, [refreshCampus, refreshFeed, refreshNotifications, sessionUserId, useBackend]);


  const enterDemoMode = () => {
    setDemoMode(true); setSessionUserId(null); setNeedsOnboarding(false); setPeople(seedPeople); setEvents(seedEvents); setPosts(seedPosts); setConversations(seedConversations);
    setFollowingIds(['fox','maya']); setFollowerIds(['fox','ava']); setFriendIds(['fox']); setSavedEventIds([]); setNotifications([]);
    setRequestedEventIds([]); setEventRequestIdsByEvent({}); setProfileViewCount(17); setFeedLimit(30); setOrganizers([]); setInterests([]); setBlockedIds([]); setNotificationPreferences({messages:true,social:true,events:true,reminders:true}); setSyncError(undefined);
  };

  const signUp = async (input: SignupInput): Promise<AuthResult> => {
    if (!backendConfigured || !supabase) throw new Error('Supabase is not connected yet.');
    const normalizedEmail = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Enter a valid email address.');
    if (input.password.length < 8) throw new Error('Use a password with at least 8 characters.');
    setDemoMode(false);
    const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password: input.password });
    if (error) throw error;
    if (!data.session?.user.id) return { needsEmailConfirmation: true };
    const userId = data.session.user.id;
    setSessionUserId(userId);
    const needs = await checkOnboarding(userId);
    return { needsOnboarding: needs };
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!backendConfigured || !supabase) throw new Error('Supabase is not connected yet.');
    setDemoMode(false);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
    const id = data.user.id;
    setSessionUserId(id);
    if(hasOnboardedCache(id)){
      setNeedsOnboarding(false);
      setSyncing(true); loadSessionState(id).catch((loadError:any)=>showSyncFailure(loadError)).finally(()=>setSyncing(false));
      checkOnboarding(id).catch(()=>{});
      return {needsOnboarding:false};
    }
    const needs = await checkOnboarding(id);
    if (!needs) {
      markOnboarded(id); setSyncing(true);
      loadSessionState(id).catch((loadError: any) => showSyncFailure(loadError)).finally(() => setSyncing(false));
    }
    return { needsOnboarding: needs };
  };

  const completeOnboarding = async (input: OnboardingInput) => {
    if (!backendConfigured || !supabase || !sessionUserId) throw new Error('Sign in again to finish your profile.');
    const name = input.name.trim();
    const username = input.username.replace('@','').trim().toLowerCase();
    const program = input.program.trim();
    const year = input.year.trim();
    if (name.length < 2) throw new Error('Enter your name.');
    if (!/^[a-z0-9_]{3,24}$/.test(username)) throw new Error('Username must be 3–24 characters using letters, numbers, or underscores.');
    if (!/^20\d{2}$/.test(year)) throw new Error('Enter a four-digit graduation year.');

    let avatarUrl: string | undefined;
    if (input.avatar) avatarUrl = await uploadPublicImage('avatars', input.avatar, sessionUserId);

    const payload: Record<string, string | boolean | null> = {
      full_name: name,
      username,
      program: program || null,
      graduation_year: year,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };
    if (avatarUrl) payload.avatar_url = avatarUrl;
    const { error } = await supabase.from('profiles').update(payload).eq('id', sessionUserId);
    if (error) throw error;

    markOnboarded(sessionUserId);
    setNeedsOnboarding(false);
    setPeople((current) => {
      const next: Person = { id:sessionUserId, name, username, program:program || 'Undeclared', year, avatar:avatarUrl, initials:name.split(/\s+/).filter(Boolean).map((part)=>part[0]).join('').slice(0,2).toUpperCase() || '?' };
      return current.some((person) => person.id === sessionUserId)
        ? current.map((person) => person.id === sessionUserId ? { ...person, ...next } : person)
        : [next, ...current];
    });
    setSyncing(true);
    loadSessionState(sessionUserId).catch((loadError: any) => showSyncFailure(loadError)).finally(() => setSyncing(false));
  };

  const signOut = async () => {
    const oldId=sessionUserId;
    if (backendConfigured && supabase && !demoMode) { if(oldId) await unregisterPushTokens(oldId).catch(()=>{}); await supabase.auth.signOut(); }
    if(oldId)clearUserCache(oldId);
    setSessionUserId(null); setNeedsOnboarding(null); setFeedLimit(30); setDemoMode(!backendConfigured); setPeople(seedPeople); setEvents(seedEvents); setPosts(seedPosts); setConversations(seedConversations); setNotifications([]); setOrganizers([]); setInterests([]); setBlockedIds([]);
  };

  const toggleGoing = async (eventId: string) => {
    if (useBackend && supabase && sessionUserId) {
      const event = events.find((item) => item.id === eventId); if (!event) return;
      const going = event.attendeeIds.includes(sessionUserId);
      const result = going
        ? await supabase.from('event_attendees').delete().eq('event_id', eventId).eq('user_id', sessionUserId)
        : await supabase.from('event_attendees').upsert({ event_id: eventId, user_id: sessionUserId, status: 'going' }, { onConflict: 'event_id,user_id' });
      if (result.error) throw result.error;
      if(going)cancelEventReminder(eventId).catch(()=>{}); else if(notificationPreferences.reminders)scheduleEventReminder({eventId:event.id,title:event.title,eventDate:event.eventDate,time:event.time,location:event.location}).catch(()=>{});
      await refreshCampus(); return;
    }
    setEvents((current) => current.map((event) => event.id === eventId ? { ...event, attendeeIds: event.attendeeIds.includes('me') ? event.attendeeIds.filter((id) => id !== 'me') : [...event.attendeeIds, 'me'] } : event));
  };

  const toggleEventRequest = async (eventId: string) => {
    if (useBackend && supabase && sessionUserId) {
      const requested = requestedEventIds.includes(eventId);
      const result = requested
        ? await supabase.from('event_attendees').delete().eq('event_id', eventId).eq('user_id', sessionUserId).eq('status','requested')
        : await supabase.from('event_attendees').upsert({ event_id: eventId, user_id: sessionUserId, status:'requested' }, { onConflict:'event_id,user_id' });
      if (result.error) throw result.error; await refreshAll(); return;
    }
    setRequestedEventIds((current) => current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId]);
  };

  const approveEventRequest = async (eventId: string, personId: string) => {
    if (useBackend && supabase) {
      const result = await supabase.from('event_attendees').update({ status:'going', updated_at:new Date().toISOString() }).eq('event_id',eventId).eq('user_id',personId).eq('status','requested');
      if (result.error) throw result.error; if(sessionUserId)sendPushForNotification({recipientId:personId,type:'event_approved',eventId}).catch(()=>{}); await refreshCampus(); return;
    }
    setEventRequestIdsByEvent((cur) => ({...cur,[eventId]:(cur[eventId]??[]).filter((id)=>id!==personId)}));
    setEvents((cur)=>cur.map((e)=>e.id===eventId&&!e.attendeeIds.includes(personId)?{...e,attendeeIds:[...e.attendeeIds,personId]}:e));
  };

  const declineEventRequest = async (eventId: string, personId: string) => {
    if (useBackend && supabase) {
      const result = await supabase.from('event_attendees').delete().eq('event_id',eventId).eq('user_id',personId).eq('status','requested');
      if (result.error) throw result.error; await refreshAll(); return;
    }
    setEventRequestIdsByEvent((cur)=>({...cur,[eventId]:(cur[eventId]??[]).filter((id)=>id!==personId)}));
  };

  const removeEventAttendee = async (eventId: string, personId: string) => {
    if (useBackend && supabase) {
      const result = await supabase.from('event_attendees').delete().eq('event_id',eventId).eq('user_id',personId); if (result.error) throw result.error; await refreshAll(); return;
    }
    setEvents((cur)=>cur.map((e)=>e.id===eventId?{...e,attendeeIds:e.attendeeIds.filter((id)=>id!==personId)}:e));
  };

  const cancelEvent = async (eventId: string) => {
    if (useBackend && supabase) {
      const result = await supabase.from('events').update({ status:'cancelled', updated_at:new Date().toISOString() }).eq('id',eventId);
      if (result.error) throw result.error; await refreshAll(); return;
    }
    setEvents((cur)=>cur.filter((e)=>e.id!==eventId));
  };

  const toggleFollow = async (personId: string) => {
    if (personId === (sessionUserId ?? 'me')) return;
    const already=followingIds.includes(personId); const reciprocal=followerIds.includes(personId);
    const optimistic=already?followingIds.filter(id=>id!==personId):[...followingIds,personId];
    setFollowingIds(optimistic); setFriendIds(optimistic.filter(id=>followerIds.includes(id)));
    if (useBackend && supabase && sessionUserId) {
      const result = already
        ? await supabase.from('follows').delete().eq('follower_id',sessionUserId).eq('following_id',personId)
        : await supabase.from('follows').insert({ follower_id:sessionUserId, following_id:personId });
      if (result.error) { await refreshCampus(); throw result.error; }
      if(!already)sendPushForNotification({recipientId:personId,type:reciprocal?'friend':'follow'}).catch(()=>{});
      refreshCampus(); return;
    }
  };

  const updateAvatar = async (uri?: string) => {
    if (useBackend && supabase && sessionUserId) {
      const avatarUrl = uri ? await uploadPublicImage('avatars',uri,sessionUserId) : null;
      const result = await supabase.from('profiles').update({ avatar_url:avatarUrl,updated_at:new Date().toISOString() }).eq('id',sessionUserId);
      if (result.error) throw result.error; await refreshAll(); return;
    }
    setPeople((cur)=>cur.map((person)=>person.id==='me'?{...person,avatar:uri}:person));
  };

  const updateProfile = async (updates: Partial<Pick<Person,'name'|'username'|'program'|'year'|'avatar'|'bio'>>) => {
    if (useBackend && supabase && sessionUserId) {
      const payload: Record<string,string|null> = { updated_at:new Date().toISOString() };
      if (updates.name!==undefined) payload.full_name=updates.name;
      if (updates.username!==undefined) payload.username=updates.username.replace('@','').toLowerCase();
      if (updates.program!==undefined) payload.program=updates.program;
      if (updates.year!==undefined) payload.graduation_year=updates.year;
      if (updates.bio!==undefined) payload.bio=updates.bio?.trim() || null;
      const result = await supabase.from('profiles').update(payload).eq('id',sessionUserId); if (result.error) throw result.error;
      if (updates.avatar) await updateAvatar(updates.avatar); else await refreshAll(); return;
    }
    setPeople((cur)=>cur.map((person)=>person.id==='me'?{...person,...updates}:person));
  };

  const addEvent = async (input: NewEventInput) => {
    if (useBackend && sessionUserId) {
      const eventId = await createBackendEvent(sessionUserId,input);
      const state = await loadBackendState(sessionUserId); applyBackendState(state);
      const created = state.events.find((event)=>event.id===eventId); if (!created) throw new Error('Event posted, but it did not reload.');
      return created;
    }
    const parsed=new Date(`${input.eventDate}T12:00:00`);
    const day=parsed.toLocaleDateString('en-CA',{weekday:'long'});
    const dateLabel=parsed.toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric'}).replace(',', ' ·').toUpperCase();
    const created: FomoEvent = {
      id:`event-${Date.now()}`, title:input.title||'Untitled Event', category:input.category, day, eventDate:input.eventDate,
      dateLabel, time:input.time||'9:00 PM', location:input.location||'USask Campus',
      exactLocation:input.exactLocation, description:input.description||'No description yet.', privacy:input.privacy, cover:input.cover,
      hostId:'me', cohostIds:[], attendeeIds:['me'], latitude:input.privacy==='Public'?input.latitude:Number(input.latitude.toFixed(3)),
      longitude:input.privacy==='Public'?input.longitude:Number(input.longitude.toFixed(3)), exactLatitude:input.latitude, exactLongitude:input.longitude, photos:[],
    };
    setEvents((cur)=>[created,...cur]); return created;
  };

  const addEventPhoto = async (eventId: string, uri: string) => {
    if (useBackend && supabase && sessionUserId) {
      const path = await uploadPrivateEventPhoto(eventId,uri,sessionUserId);
      const result = await supabase.from('event_photos').insert({event_id:eventId,uploader_id:sessionUserId,storage_path:path});
      if (result.error) throw result.error; await refreshAll(); return;
    }
    setEvents((cur)=>cur.map((e)=>e.id===eventId?{...e,photos:[uri,...e.photos]}:e));
  };

  const toggleSavedEvent = async (eventId: string) => {
    const saved=savedEventIds.includes(eventId); setSavedEventIds(cur=>saved?cur.filter(id=>id!==eventId):[...cur,eventId]);
    if (useBackend && supabase && sessionUserId) {
      const result = saved
        ? await supabase.from('saved_events').delete().eq('user_id',sessionUserId).eq('event_id',eventId)
        : await supabase.from('saved_events').insert({user_id:sessionUserId,event_id:eventId});
      if (result.error) { await refreshCampus(); throw result.error; } return;
    }
  };

  const addCohost = async (eventId: string, personId: string) => {
    if (useBackend && supabase && sessionUserId) {
      const result = await supabase.from('event_cohosts').insert({event_id:eventId,user_id:personId,added_by:sessionUserId});
      if (result.error) throw result.error; await refreshAll(); return;
    }
    setEvents((cur)=>cur.map((event)=>event.id===eventId?{...event,cohostIds:[...(event.cohostIds??[]).filter((id)=>id!==personId),personId]}:event));
  };

  const removeCohost = async (eventId: string, personId: string) => {
    if (useBackend && supabase) {
      const result = await supabase.from('event_cohosts').delete().eq('event_id',eventId).eq('user_id',personId);
      if (result.error) throw result.error; await refreshAll(); return;
    }
    setEvents((cur)=>cur.map((event)=>event.id===eventId?{...event,cohostIds:(event.cohostIds??[]).filter((id)=>id!==personId)}:event));
  };

  const createPost = async (input: NewPostInput) => {
    if (useBackend && sessionUserId) { const postId=await createFeedPost(sessionUserId,input); input.taggedUserIds.filter(id=>id!==sessionUserId).forEach(id=>sendPushForNotification({recipientId:id,type:'tag',postId}).catch(()=>{})); await refreshFeed(); return; }
    const post: FeedPost = { id:`post-${Date.now()}`,authorId:'me',eventId:input.eventId,caption:input.caption,mediaUrl:input.uri,mediaType:input.mediaType??'image',mediaWidth:input.mediaWidth,mediaHeight:input.mediaHeight,mediaDurationMs:input.mediaDurationMs,taggedUserIds:input.taggedUserIds,reactions:[],comments:[],viewCount:1,createdAt:new Date().toISOString() };
    setPosts((cur)=>[post,...cur]);
  };

  const reactToPost = async (postId: string, reaction?: ReactionKind) => {
    const userId = sessionUserId ?? 'me';
    setPosts((cur)=>cur.map((post)=>post.id===postId?{...post,reactions:[...post.reactions.filter((r)=>r.userId!==userId),...(reaction?[{postId,userId,reaction}]:[])]}:post));
    if (useBackend && sessionUserId) { try { await setPostReaction(postId,sessionUserId,reaction); } catch (e) { await refreshFeed(); throw e; } }
  };

  const addComment = async (postId: string, body: string) => {
    if (!body.trim()) return;
    const authorId=sessionUserId??'me'; const tempId=`optimistic-comment-${Date.now()}`; const text=body.trim(); const createdAt=new Date().toISOString();
    setPosts((cur)=>cur.map((post)=>post.id===postId?{...post,comments:[...post.comments,{id:tempId,postId,authorId,body:text,createdAt}]}:post));
    if (useBackend && sessionUserId) {
      try{const saved=await addFeedComment(postId,sessionUserId,text);setPosts(cur=>cur.map(post=>post.id===postId?{...post,comments:post.comments.map(c=>c.id===tempId?{...c,id:saved.id,createdAt:saved.createdAt}:c)}:post));const postAuthor=posts.find(p=>p.id===postId)?.authorId;if(postAuthor&&postAuthor!==sessionUserId)sendPushForNotification({recipientId:postAuthor,type:'comment',postId}).catch(()=>{});}
      catch(e){setPosts(cur=>cur.map(post=>post.id===postId?{...post,comments:post.comments.filter(c=>c.id!==tempId)}:post));throw e;}
    }
  };

  const removeComment = async (commentId: string) => {
    const userId=sessionUserId??'me';
    if (useBackend && sessionUserId) { await deleteFeedComment(commentId,sessionUserId); await refreshFeed(); return; }
    setPosts((cur)=>cur.map((post)=>({...post,comments:post.comments.filter((comment)=>!(comment.id===commentId&&comment.authorId===userId))})));
  };

  const markPostViewed = async (postId: string) => { if (useBackend) await recordFeedView(postId); else setPosts((cur)=>cur.map((p)=>p.id===postId?{...p,viewCount:p.viewCount+1}:p)); };

  const removeMyTag = async (postId: string) => {
    const userId=sessionUserId??'me';
    if (useBackend && sessionUserId) { await removeSelfFromTag(postId,sessionUserId); await refreshFeed(); return; }
    setPosts((cur)=>cur.map((p)=>p.id===postId?{...p,taggedUserIds:p.taggedUserIds.filter((id)=>id!==userId)}:p));
  };

  const removePost = async (postId: string) => {
    const userId=sessionUserId??'me';
    if (useBackend && sessionUserId) { await deleteFeedPost(postId,sessionUserId); await refreshFeed(); return; }
    setPosts((cur)=>cur.filter((p)=>!(p.id===postId&&p.authorId===userId)));
  };

  const openChatWith = async (peerId: string) => {
    if (useBackend) { const id=await getOrCreateDirectConversation(peerId); await refreshConversations(); return id; }
    const existing=conversations.find((c)=>c.peerId===peerId); if (existing) return existing.id;
    const id=`demo-chat-${peerId}`; setConversations((cur)=>[{id,peerId},...cur]); return id;
  };

  const getChatMessages = async (conversationId: string) => useBackend ? loadMessages(conversationId) : seedMessages.filter((m)=>m.conversationId===conversationId);

  const sendChat = async (conversationId: string, body: string) => {
    if (!body.trim()) return;
    if (useBackend && sessionUserId) { const messageId=await sendMessage(conversationId,sessionUserId,body); const recipient=conversations.find(c=>c.id===conversationId)?.peerId; if(recipient)sendPushForNotification({recipientId:recipient,type:'message',messageId}).catch(()=>{}); await refreshConversations(); return; }
    setConversations((cur)=>cur.map((c)=>c.id===conversationId?{...c,lastMessage:body.trim(),lastMessageAt:new Date().toISOString()}:c));
  };

  const shareEventWithPerson = async (eventId: string, personId: string) => {
    const conversationId = await openChatWith(personId);
    if (useBackend && sessionUserId) { const messageId=await sendEventShare(conversationId,sessionUserId,eventId); sendPushForNotification({recipientId:personId,type:'message',messageId}).catch(()=>{}); await refreshConversations(); }
    return conversationId;
  };

  const recordPersonView = async (profileId: string) => { if (useBackend && profileId !== sessionUserId) await recordProfileView(profileId); };

  const markNotificationRead = async (notificationId: string) => {
    if (useBackend) { await markNotificationReadBackend(notificationId); await refreshNotifications(); return; }
    setNotifications((cur)=>cur.map((item)=>item.id===notificationId?{...item,readAt:new Date().toISOString()}:item));
  };

  const markAllNotificationsRead = async () => {
    if (useBackend) { await markAllNotificationsReadBackend(); await refreshNotifications(); return; }
    setNotifications((cur)=>cur.map((item)=>item.readAt?item:{...item,readAt:new Date().toISOString()}));
  };

  const getProfileSocialStats = async (profileId: string) => {
    if (useBackend) return getProfileSocialStatsBackend(profileId);
    const followers = profileId === 'me' ? followerIds.length : 0;
    const following = profileId === 'me' ? followingIds.length : 0;
    const friends = profileId === 'me' ? friendIds.length : 0;
    return { followers, following, friends, mutualFriends: profileId === 'me' ? friends : friendIds.includes(profileId) ? 1 : 0 };
  };

  const loadProfileFollowLists = async (profileId: string) => {
    if (useBackend) return loadProfileFollowListsBackend(profileId);
    if (profileId === 'me') return { followers:followerIds, following:followingIds, friends:friendIds };
    return { followers:[], following:[], friends:[] };
  };

  const saveInterests=async(items:InterestKey[])=>{const previous=interests;setInterests(items);try{if(useBackend&&sessionUserId)await saveUserInterests(sessionUserId,items);}catch(e){setInterests(previous);throw e;}};
  const updateNotificationPreferences=async(prefs:NotificationPreferences)=>{const previous=notificationPreferences;setNotificationPreferences(prefs);try{if(useBackend&&sessionUserId)await saveNotificationPreferences(sessionUserId,prefs);}catch(e){setNotificationPreferences(previous);throw e;}};
  const enablePushNotifications=async()=> sessionUserId?registerPushToken(sessionUserId,true):{enabled:false,reason:'auth'};
  const invitePeople=async(eventId:string,recipientIds:string[])=>{ if(useBackend&&sessionUserId&&supabase){const event=events.find(e=>e.id===eventId);if(event?.privacy==='Private'){const result=await supabase.rpc('invite_people_to_private_event',{p_event_id:eventId,p_recipient_ids:recipientIds});if(result.error)throw result.error;}else{await invitePeopleToEvent(eventId,sessionUserId,recipientIds);}recipientIds.forEach(id=>sendPushForNotification({recipientId:id,type:'event_invite',eventId}).catch(()=>{}));await refreshCampus();await refreshNotifications();} };
  const blockUser=async(personId:string)=>{if(!sessionUserId)return;const previous=blockedIds;setBlockedIds(cur=>[...new Set([...cur,personId])]);try{if(useBackend){await blockPerson(sessionUserId,personId);await refreshAll();}}catch(e){setBlockedIds(previous);throw e;}};
  const unblockUser=async(personId:string)=>{if(!sessionUserId)return;const previous=blockedIds;setBlockedIds(cur=>cur.filter(id=>id!==personId));try{if(useBackend){await unblockPerson(sessionUserId,personId);await refreshAll();}}catch(e){setBlockedIds(previous);throw e;}};
  const report=async(target:ReportTarget,reason:ReportReason,details?:string)=>{if(useBackend&&sessionUserId)await reportTarget(sessionUserId,target,reason,details);};

  const value = useMemo(() => ({
    currentUser,people,events,posts,conversations,organizers,followingIds,followerIds,friendIds,savedEventIds,notifications,interests,blockedIds,notificationPreferences,unreadNotificationCount,requestedEventIds,eventRequestIdsByEvent,profileViewCount,
    backendConfigured,demoMode,isAuthenticated:Boolean(sessionUserId),authLoading,needsOnboarding,syncing,syncError,enterDemoMode,signUp,signIn,completeOnboarding,signOut,refreshAll,refreshFeed,loadMoreFeed,hasMoreFeed,refreshConversations,refreshNotifications,
    toggleGoing,toggleEventRequest,approveEventRequest,declineEventRequest,removeEventAttendee,cancelEvent,toggleFollow,updateAvatar,updateProfile,
    addEvent,addEventPhoto,toggleSavedEvent,addCohost,removeCohost,createPost,reactToPost,addComment,removeComment,markPostViewed,removeMyTag,removePost,
    openChatWith,getChatMessages,sendChat,shareEventWithPerson,recordPersonView,markNotificationRead,markAllNotificationsRead,getProfileSocialStats,loadProfileFollowLists,saveInterests,updateNotificationPreferences,enablePushNotifications,invitePeople,blockUser,unblockUser,report,
  }), [currentUser,people,events,posts,conversations,organizers,followingIds,followerIds,friendIds,savedEventIds,notifications,interests,blockedIds,notificationPreferences,unreadNotificationCount,requestedEventIds,eventRequestIdsByEvent,profileViewCount,demoMode,sessionUserId,authLoading,needsOnboarding,syncing,syncError,refreshAll,refreshFeed,loadMoreFeed,hasMoreFeed,refreshConversations,refreshNotifications]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context=useContext(AppContext); if (!context) throw new Error('useApp must be used inside AppProvider'); return context;
}
