import { FomoEvent, InterestKey, NotificationPreferences, OrganizerProfile, Person, Privacy, VerificationType } from '@/data/seed';
import { supabase } from '@/lib/supabase';
import { signedUrlsFor } from '@/services/mediaCache';

export type BackendState = {
  currentUser: Person;
  people: Person[];
  events: FomoEvent[];
  followingIds: string[];
  followerIds: string[];
  friendIds: string[];
  savedEventIds: string[];
  requestedEventIds: string[];
  eventRequestIdsByEvent: Record<string, string[]>;
  organizers: OrganizerProfile[];
  interests: InterestKey[];
  blockedIds: string[];
  notificationPreferences: NotificationPreferences;
};

type ProfileRow = {
  id: string; full_name: string; username: string; graduation_year: string | null; program: string | null;
  avatar_url: string | null; bio: string | null;
};
type VerificationRow={profile_id:string;verification_type:VerificationType};
type OrganizerRow={profile_id:string;display_name:string;handle:string;bio:string|null;avatar_url:string|null;website_url:string|null};
type EventRow = {
  id: string; title: string; category: string; day: string; event_date: string; date_label: string; time_label: string;
  location_label: string; description: string | null; privacy: 'public' | 'request' | 'private'; cover_url: string | null;
  host_id: string; latitude: number; longitude: number; trending: boolean;
};
type EventLocationRow = {
  event_id: string; precise_address: string | null; precise_latitude: number | null; precise_longitude: number | null;
};

const initialsFor = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'F';

const profileToPerson = (row: ProfileRow, verificationType?:VerificationType): Person => ({
  id: row.id,
  name: row.full_name || row.username,
  username: row.username,
  year: row.graduation_year || '—',
  program: row.program || 'Undeclared',
  avatar: row.avatar_url || undefined,
  bio: row.bio || undefined,
  verificationType,
  initials: initialsFor(row.full_name || row.username),
});

const privacyFromDb = (privacy: EventRow['privacy']): Privacy =>
  privacy === 'public' ? 'Public' : privacy === 'request' ? 'Request' : 'Private';
const privacyToDb = (privacy: Privacy) =>
  privacy === 'Public' ? 'public' : privacy === 'Request' ? 'request' : 'private';

export async function loadBackendState(userId: string): Promise<BackendState> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const [profilesResult, eventsResult, locationsResult, attendeesResult, followsResult, photosResult, savedResult, cohostsResult, verificationsResult, organizersResult, interestsResult, blocksResult, prefsResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, username, graduation_year, program, avatar_url, bio').order('full_name'),
    supabase.from('events').select('id, title, category, day, event_date, date_label, time_label, location_label, description, privacy, cover_url, host_id, latitude, longitude, trending').order('event_date', { ascending: true }).order('created_at', { ascending: false }),
    supabase.from('event_locations').select('event_id, precise_address, precise_latitude, precise_longitude'),
    supabase.from('event_attendees').select('event_id, user_id, status'),
    supabase.from('follows').select('follower_id, following_id, created_at').or(`follower_id.eq.${userId},following_id.eq.${userId}`),
    supabase.from('event_photos').select('event_id, uploader_id, storage_path, created_at').order('created_at', { ascending: false }),
    supabase.from('saved_events').select('event_id').eq('user_id', userId),
    supabase.from('event_cohosts').select('event_id, user_id, added_by, created_at'),
    supabase.from('profile_verifications').select('profile_id, verification_type'),
    supabase.from('organizer_profiles').select('profile_id, display_name, handle, bio, avatar_url, website_url'),
    supabase.from('user_interests').select('interest').eq('user_id',userId),
    supabase.from('user_blocks').select('blocked_id').eq('blocker_id',userId),
    supabase.from('notification_preferences').select('messages, social, events, reminders').eq('user_id',userId).maybeSingle(),
  ]);
  for (const result of [profilesResult, eventsResult, locationsResult, attendeesResult, followsResult, photosResult, savedResult, cohostsResult, verificationsResult, organizersResult, interestsResult, blocksResult, prefsResult]) {
    if (result.error) throw result.error;
  }

  const verificationByProfile=new Map<string,VerificationType>((verificationsResult.data??[]).map((row:any)=>[row.profile_id,row.verification_type as VerificationType]));
  const people = (profilesResult.data ?? []).map((row) => profileToPerson(row as ProfileRow,verificationByProfile.get((row as ProfileRow).id)));
  const currentUser = people.find((person) => person.id === userId);
  if (!currentUser) throw new Error('Your FOMO profile was not created. Try signing out and back in.');

  const followingIds = (followsResult.data ?? []).filter((row) => row.follower_id === userId).map((row) => row.following_id);
  const followerIds = (followsResult.data ?? []).filter((row) => row.following_id === userId).map((row) => row.follower_id);
  const followerSet = new Set(followerIds);
  const friendIds = followingIds.filter((id) => followerSet.has(id));

  const eventRows = (eventsResult.data ?? []) as EventRow[];
  const cohostIdsByEvent = new Map<string, string[]>();
  const managedEventIds = new Set(eventRows.filter((event) => event.host_id === userId).map((event) => event.id));
  for (const row of cohostsResult.data ?? []) {
    const cur = cohostIdsByEvent.get(row.event_id) ?? [];
    cur.push(row.user_id);
    cohostIdsByEvent.set(row.event_id, cur);
    if (row.user_id === userId) managedEventIds.add(row.event_id);
  }

  const attendeesByEvent = new Map<string, string[]>();
  const requestedEventIds: string[] = [];
  const requestMap = new Map<string, string[]>();
  for (const row of attendeesResult.data ?? []) {
    if (row.status === 'going' || row.status === 'invited') {
      const current = attendeesByEvent.get(row.event_id) ?? [];
      current.push(row.user_id);
      attendeesByEvent.set(row.event_id, current);
    }
    if (row.user_id === userId && row.status === 'requested') requestedEventIds.push(row.event_id);
    if (row.status === 'requested' && managedEventIds.has(row.event_id)) {
      const current = requestMap.get(row.event_id) ?? [];
      current.push(row.user_id);
      requestMap.set(row.event_id, current);
    }
  }

  const exactLocationMap = new Map<string, EventLocationRow>();
  for (const row of (locationsResult.data ?? []) as EventLocationRow[]) exactLocationMap.set(row.event_id, row);

  const photoPaths = (photosResult.data ?? []).map((row) => row.storage_path).filter(Boolean) as string[];
  let signedPhotoMap = new Map<string, string>();
  try { signedPhotoMap = await signedUrlsFor('event-photos', photoPaths); } catch { /* keep event usable if photo signing fails */ }
  const photosByEvent = new Map<string, string[]>();
  for (const row of photosResult.data ?? []) {
    const signed = signedPhotoMap.get(row.storage_path);
    if (!signed) continue;
    const current = photosByEvent.get(row.event_id) ?? [];
    current.push(signed); photosByEvent.set(row.event_id, current);
  }

  const events: FomoEvent[] = eventRows.map((event) => {
    const exact = exactLocationMap.get(event.id);
    return {
      id: event.id,
      title: event.title,
      category: event.category,
      day: event.day,
      eventDate: event.event_date,
      dateLabel: event.date_label,
      time: event.time_label,
      location: event.location_label,
      exactLocation: exact?.precise_address || undefined,
      description: event.description || 'No description yet.',
      privacy: privacyFromDb(event.privacy),
      cover: event.cover_url || undefined,
      hostId: event.host_id,
      cohostIds: cohostIdsByEvent.get(event.id) ?? [],
      attendeeIds: attendeesByEvent.get(event.id) ?? [],
      latitude: Number(event.latitude),
      longitude: Number(event.longitude),
      exactLatitude: exact?.precise_latitude == null ? undefined : Number(exact.precise_latitude),
      exactLongitude: exact?.precise_longitude == null ? undefined : Number(exact.precise_longitude),
      photos: photosByEvent.get(event.id) ?? [],
      trending: Boolean(event.trending),
    };
  });

  return {
    currentUser,
    people,
    events,
    followingIds,
    followerIds,
    friendIds,
    savedEventIds: (savedResult.data ?? []).map((row) => row.event_id),
    requestedEventIds,
    eventRequestIdsByEvent: Object.fromEntries([...requestMap.entries()]),
    organizers: ((organizersResult.data??[]) as OrganizerRow[]).map((row)=>({profileId:row.profile_id,displayName:row.display_name,handle:row.handle,bio:row.bio||undefined,avatar:row.avatar_url||undefined,websiteUrl:row.website_url||undefined,verificationType:verificationByProfile.get(row.profile_id)})),
    interests: (interestsResult.data??[]).map((row:any)=>row.interest as InterestKey),
    blockedIds: (blocksResult.data??[]).map((row:any)=>row.blocked_id as string),
    notificationPreferences: prefsResult.data ? {messages:Boolean(prefsResult.data.messages),social:Boolean(prefsResult.data.social),events:Boolean(prefsResult.data.events),reminders:Boolean(prefsResult.data.reminders)} : {messages:true,social:true,events:true,reminders:true},
  };
}

async function uriToUpload(uri: string) {
  const arrayBuffer = await fetch(uri).then((res) => res.arrayBuffer());
  const ext = (uri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
  return { arrayBuffer, ext, contentType };
}

export async function uploadPublicImage(bucket: 'avatars' | 'event-covers', uri: string, ownerId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { arrayBuffer, ext, contentType } = await uriToUpload(uri);
  const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function uploadPrivateEventPhoto(eventId: string, uri: string, ownerId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { arrayBuffer, ext, contentType } = await uriToUpload(uri);
  const path = `${eventId}/${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('event-photos').upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

export async function createBackendEvent(userId: string, input: {
  title: string; category: string; eventDate: string; time: string; location: string; exactLocation?: string;
  description: string; privacy: Privacy; cover?: string; latitude: number; longitude: number;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const ensureResult = await supabase.rpc('ensure_fomo_profile');
  if (ensureResult.error) throw ensureResult.error;

  const payload = {
    p_title: input.title,
    p_category: input.category,
    p_event_date: input.eventDate,
    p_time_label: input.time,
    p_location_label: input.location,
    p_description: input.description || null,
    p_privacy: privacyToDb(input.privacy),
    p_cover_url: null,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_precise_address: input.exactLocation?.trim() || null,
    p_precise_latitude: input.latitude,
    p_precise_longitude: input.longitude,
  };

  const { data, error } = await supabase.rpc('create_fomo_event_v6', payload);
  if (error) {
    console.error('[FOMO:create-event]', { userId, payload: { ...payload, p_precise_address: payload.p_precise_address ? '[protected]' : null }, error });
    throw error;
  }
  if (!data) throw new Error('FOMO created the event but did not receive an event ID.');
  const eventId = data as string;

  if (input.cover) {
    try {
      const coverUrl = await uploadPublicImage('event-covers', input.cover, userId);
      const update = await supabase.from('events').update({ cover_url: coverUrl, updated_at: new Date().toISOString() }).eq('id', eventId).eq('host_id', userId);
      if (update.error) throw update.error;
    } catch (coverError: any) {
      console.warn('[FOMO:event-cover]', { eventId, message: coverError?.message });
    }
  }
  return eventId;
}
