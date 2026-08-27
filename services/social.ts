import { ChatMessage, ConversationSummary, FeedComment, FeedMediaType, FeedPost, FeedReaction, ReactionKind, SocialNotification } from '@/data/seed';
import { supabase } from '@/lib/supabase';
import { signedUrlsFor } from '@/services/mediaCache';

async function uploadFeedMedia(userId: string, postId: string, input: {
  uri: string; mediaType: FeedMediaType; mimeType?: string; fileName?: string;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const arrayBuffer = await fetch(input.uri).then((res) => res.arrayBuffer());
  const fromName = input.fileName?.split('.').pop();
  const fromUri = input.uri.split('.').pop()?.split('?')[0];
  const fallback = input.mediaType === 'video' ? 'mp4' : 'jpg';
  const ext = (fromName || fromUri || fallback).toLowerCase();
  const imageMime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'heic' ? 'image/heic' : ext === 'heif' ? 'image/heif' : 'image/jpeg';
  const videoMime = ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : ext === 'm4v' ? 'video/x-m4v' : 'video/mp4';
  const allowedVideoMime = new Set(['video/mp4','video/quicktime','video/webm','video/x-m4v']);
  const allowedImageMime = new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif']);
  const contentType = input.mediaType === 'video'
    ? (input.mimeType && allowedVideoMime.has(input.mimeType.toLowerCase()) ? input.mimeType.toLowerCase() : videoMime)
    : (input.mimeType && allowedImageMime.has(input.mimeType.toLowerCase()) ? input.mimeType.toLowerCase() : imageMime);
  const path = `${userId}/${postId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('feed-media').upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

export async function loadFeed(limit = 40): Promise<FeedPost[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const postsResult = await supabase
    .from('feed_posts')
    .select('id, author_id, event_id, caption, created_at')
    .order('created_at', { ascending: false })
    .range(0, Math.max(0, limit - 1));
  if (postsResult.error) throw postsResult.error;

  const rows = postsResult.data ?? [];
  const ids = rows.map((row) => row.id);
  if (!ids.length) return [];

  const [mediaResult, tagsResult, reactionsResult, commentsResult, viewResult] = await Promise.all([
    supabase.from('feed_post_media').select('post_id, storage_path, media_type, width, height, duration_ms, created_at').in('post_id', ids).order('created_at'),
    supabase.from('feed_post_tags').select('post_id, user_id').in('post_id', ids),
    supabase.from('feed_reactions').select('post_id, user_id, reaction').in('post_id', ids),
    supabase.from('feed_comments').select('id, post_id, author_id, body, created_at').in('post_id', ids).order('created_at', { ascending: true }),
    supabase.rpc('get_feed_post_view_counts', { p_post_ids: ids }),
  ]);
  for (const result of [mediaResult, tagsResult, reactionsResult, commentsResult]) if (result.error) throw result.error;
  if (viewResult.error) throw viewResult.error;

  const paths = (mediaResult.data ?? []).map((row) => row.storage_path).filter(Boolean) as string[];
  const urlByPath = await signedUrlsFor('feed-media', paths);

  const firstMedia = new Map<string, { path: string; url?: string; type: FeedMediaType; width?: number; height?: number; durationMs?: number }>();
  for (const row of mediaResult.data ?? []) {
    if (!firstMedia.has(row.post_id)) firstMedia.set(row.post_id, {
      path: row.storage_path,
      url: urlByPath.get(row.storage_path),
      type: (row.media_type === 'video' ? 'video' : 'image') as FeedMediaType,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      durationMs: row.duration_ms ?? undefined,
    });
  }
  const tags = new Map<string, string[]>();
  for (const row of tagsResult.data ?? []) tags.set(row.post_id, [...(tags.get(row.post_id) ?? []), row.user_id]);
  const reactions = new Map<string, FeedReaction[]>();
  for (const row of reactionsResult.data ?? []) reactions.set(row.post_id, [...(reactions.get(row.post_id) ?? []), { postId: row.post_id, userId: row.user_id, reaction: row.reaction as ReactionKind }]);
  const comments = new Map<string, FeedComment[]>();
  for (const row of commentsResult.data ?? []) comments.set(row.post_id, [...(comments.get(row.post_id) ?? []), { id: row.id, postId: row.post_id, authorId: row.author_id, body: row.body, createdAt: row.created_at }]);
  const views = new Map<string, number>();
  for (const row of (viewResult.data ?? []) as { post_id: string; view_count: number | string }[]) views.set(row.post_id, Number(row.view_count));

  return rows.map((row) => {
    const media = firstMedia.get(row.id);
    return {
      id: row.id,
      authorId: row.author_id,
      eventId: row.event_id || undefined,
      caption: row.caption || '',
      mediaUrl: media?.url,
      mediaPath: media?.path,
      mediaType: media?.type ?? 'image',
      mediaWidth: media?.width,
      mediaHeight: media?.height,
      mediaDurationMs: media?.durationMs,
      taggedUserIds: tags.get(row.id) ?? [],
      reactions: reactions.get(row.id) ?? [],
      comments: comments.get(row.id) ?? [],
      viewCount: views.get(row.id) ?? 0,
      createdAt: row.created_at,
    };
  });
}

export async function createFeedPost(userId: string, input: {
  uri: string; caption: string; eventId?: string; taggedUserIds: string[];
  mediaType?: FeedMediaType; mediaWidth?: number; mediaHeight?: number; mediaDurationMs?: number;
  mimeType?: string; fileName?: string;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const mediaType: FeedMediaType = input.mediaType === 'video' ? 'video' : 'image';
  const insert = await supabase
    .from('feed_posts')
    .insert({ author_id: userId, event_id: input.eventId || null, caption: input.caption.trim() || null })
    .select('id')
    .single();
  if (insert.error) throw insert.error;
  const postId = insert.data.id as string;

  let uploadedPath: string | undefined;
  try {
    uploadedPath = await uploadFeedMedia(userId, postId, { uri: input.uri, mediaType, mimeType: input.mimeType, fileName: input.fileName });
    const mediaInsert = await supabase.from('feed_post_media').insert({
      post_id: postId,
      storage_path: uploadedPath,
      media_type: mediaType,
      width: input.mediaWidth || null,
      height: input.mediaHeight || null,
      duration_ms: input.mediaDurationMs == null ? null : Math.round(input.mediaDurationMs),
    });
    if (mediaInsert.error) throw mediaInsert.error;
    const uniqueTags = [...new Set(input.taggedUserIds.filter((id) => id && id !== userId))];
    if (uniqueTags.length) {
      const tagInsert = await supabase.from('feed_post_tags').insert(uniqueTags.map((id) => ({ post_id: postId, user_id: id, tagged_by: userId })));
      if (tagInsert.error) throw tagInsert.error;
    }
    return postId;
  } catch (error) {
    if (uploadedPath) await supabase.storage.from('feed-media').remove([uploadedPath]);
    await supabase.from('feed_posts').delete().eq('id', postId).eq('author_id', userId);
    throw error;
  }
}

export async function setPostReaction(postId: string, userId: string, reaction?: ReactionKind) {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!reaction) {
    const result = await supabase.from('feed_reactions').delete().eq('post_id', postId).eq('user_id', userId);
    if (result.error) throw result.error;
    return;
  }
  const result = await supabase.from('feed_reactions').upsert(
    { post_id: postId, user_id: userId, reaction, updated_at: new Date().toISOString() },
    { onConflict: 'post_id,user_id' },
  );
  if (result.error) throw result.error;
}

export async function addFeedComment(postId: string, userId: string, body: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const result = await supabase.from('feed_comments').insert({ post_id: postId, author_id: userId, body: body.trim() }).select('id, created_at').single();
  if (result.error) throw result.error;
  return { id: result.data.id as string, createdAt: result.data.created_at as string };
}

export async function deleteFeedComment(commentId: string, userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const result = await supabase.from('feed_comments').delete().eq('id', commentId).eq('author_id', userId);
  if (result.error) throw result.error;
}

export async function recordFeedView(postId: string) {
  if (!supabase) return;
  const result = await supabase.rpc('record_feed_post_view', { p_post_id: postId });
  if (result.error) console.warn('[FOMO:view]', result.error.message);
}

export async function removeSelfFromTag(postId: string, userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const result = await supabase.from('feed_post_tags').delete().eq('post_id', postId).eq('user_id', userId);
  if (result.error) throw result.error;
}

export async function deleteFeedPost(postId: string, userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const media = await supabase.from('feed_post_media').select('storage_path').eq('post_id', postId);
  if (media.error) throw media.error;
  const paths = (media.data ?? []).map((row) => row.storage_path).filter(Boolean);
  const result = await supabase.from('feed_posts').delete().eq('id', postId).eq('author_id', userId);
  if (result.error) throw result.error;
  if (paths.length) {
    const removed = await supabase.storage.from('feed-media').remove(paths);
    if (removed.error) console.warn('[FOMO:feed-media-cleanup]', removed.error.message);
  }
}

export async function getOrCreateDirectConversation(peerId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const result = await supabase.rpc('get_or_create_direct_conversation', { p_peer: peerId });
  if (result.error) throw result.error;
  return result.data as string;
}

export async function loadConversations(userId: string): Promise<ConversationSummary[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const mine = await supabase.from('conversation_members').select('conversation_id').eq('user_id', userId);
  if (mine.error) throw mine.error;
  const ids = (mine.data ?? []).map((row) => row.conversation_id);
  if (!ids.length) return [];

  const [members, messages] = await Promise.all([
    supabase.from('conversation_members').select('conversation_id, user_id').in('conversation_id', ids),
    supabase.from('messages').select('id, conversation_id, sender_id, body, created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(200),
  ]);
  if (members.error) throw members.error;
  if (messages.error) throw messages.error;

  const peerByConversation = new Map<string, string>();
  for (const row of members.data ?? []) if (row.user_id !== userId) peerByConversation.set(row.conversation_id, row.user_id);
  const lastByConversation = new Map<string, { body: string; at: string }>();
  for (const row of messages.data ?? []) if (!lastByConversation.has(row.conversation_id)) lastByConversation.set(row.conversation_id, { body: row.body, at: row.created_at });

  return ids.map((id) => ({
    id,
    peerId: peerByConversation.get(id) ?? userId,
    lastMessage: lastByConversation.get(id)?.body,
    lastMessageAt: lastByConversation.get(id)?.at,
  })).sort((a,b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
}

export async function loadMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const result = await supabase.from('messages').select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId).order('created_at', { ascending: true }).range(0, 199);
  if (result.error) throw result.error;
  const rows = result.data ?? [];
  const ids = rows.map((row) => row.id);
  const shares = ids.length ? await supabase.from('message_event_shares').select('message_id, event_id').in('message_id', ids) : { data: [], error: null };
  if (shares.error) throw shares.error;
  const eventByMessage = new Map((shares.data ?? []).map((row) => [row.message_id, row.event_id]));
  return rows.map((row) => ({
    id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, body: row.body, createdAt: row.created_at,
    sharedEventId: eventByMessage.get(row.id),
  }));
}

export async function sendMessage(conversationId: string, userId: string, body: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const result = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: userId, body: body.trim() }).select('id').single();
  if (result.error) throw result.error;
  return result.data.id as string;
}

export async function sendEventShare(conversationId: string, userId: string, eventId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const messageId = await sendMessage(conversationId, userId, 'Shared an event');
  const share = await supabase.from('message_event_shares').insert({ message_id: messageId, event_id: eventId });
  if (share.error) {
    await supabase.from('messages').delete().eq('id', messageId).eq('sender_id', userId);
    throw share.error;
  }
  return messageId;
}

export async function recordProfileView(profileId: string) {
  if (!supabase) return;
  const result = await supabase.rpc('record_profile_view', { p_profile_id: profileId });
  if (result.error) console.warn('[FOMO:profile-view]', result.error.message);
}

export async function getMyProfileViewCount(): Promise<number> {
  if (!supabase) return 0;
  const result = await supabase.rpc('get_my_profile_view_count');
  if (result.error) return 0;
  return Number(result.data ?? 0);
}


export async function loadNotifications(limit = 80): Promise<SocialNotification[]> {
  if (!supabase) return [];
  const result = await supabase.from('notifications')
    .select('id, user_id, actor_id, type, post_id, event_id, message_id, created_at, read_at')
    .order('created_at', { ascending: false }).range(0, Math.max(0, limit - 1));
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({
    id: row.id, userId: row.user_id, actorId: row.actor_id ?? undefined, type: row.type,
    postId: row.post_id ?? undefined, eventId: row.event_id ?? undefined, messageId: row.message_id ?? undefined,
    createdAt: row.created_at, readAt: row.read_at ?? undefined,
  })) as SocialNotification[];
}

export async function markNotificationRead(notificationId: string) {
  if (!supabase) return;
  const result = await supabase.rpc('mark_notification_read', { p_notification_id: notificationId });
  if (result.error) throw result.error;
}

export async function markAllNotificationsRead() {
  if (!supabase) return;
  const result = await supabase.rpc('mark_all_notifications_read');
  if (result.error) throw result.error;
}

export async function getProfileSocialStats(profileId: string) {
  if (!supabase) return { followers: 0, following: 0, friends: 0, mutualFriends: 0 };
  const result = await supabase.rpc('get_profile_social_stats', { p_profile: profileId });
  if (result.error) throw result.error;
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return {
    followers: Number(row?.follower_count ?? 0),
    following: Number(row?.following_count ?? 0),
    friends: Number(row?.friend_count ?? 0),
    mutualFriends: Number(row?.mutual_friend_count ?? 0),
  };
}

export async function loadProfileFollowLists(profileId: string) {
  if (!supabase) return { followers: [] as string[], following: [] as string[], friends: [] as string[] };
  const [incoming, outgoing] = await Promise.all([
    supabase.from('follows').select('follower_id').eq('following_id', profileId),
    supabase.from('follows').select('following_id').eq('follower_id', profileId),
  ]);
  if (incoming.error) throw incoming.error;
  if (outgoing.error) throw outgoing.error;
  const followers = (incoming.data ?? []).map((row) => row.follower_id);
  const following = (outgoing.data ?? []).map((row) => row.following_id);
  const followerSet = new Set(followers);
  return { followers, following, friends: following.filter((id) => followerSet.has(id)) };
}
