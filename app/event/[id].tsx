import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/Avatar';
import { AvatarStack } from '@/components/AvatarStack';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { categoryColor, colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { eventLocationForViewer } from '@/utils/eventLocation';
import { showReportSheet } from '@/utils/reporting';
import { backendConfigured, supabase } from '@/lib/supabase';

export default function EventDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    currentUser, events, people, followingIds, friendIds, savedEventIds, requestedEventIds, eventRequestIdsByEvent, posts,
    toggleGoing, toggleEventRequest, approveEventRequest, declineEventRequest, removeEventAttendee, cancelEvent, addEventPhoto,
    toggleSavedEvent, shareEventWithPerson, addCohost, removeCohost, invitePeople, report, refreshAll, revalidateEventAccess, demoMode,
  } = useApp();
  const event = events.find((item) => item.id === id);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [cohostBusy, setCohostBusy] = useState<string>();
  const [accessVerified,setAccessVerified]=useState(demoMode);

  useEffect(()=>{
    let active=true;
    if(demoMode){setAccessVerified(true);return()=>{active=false;};}
    setAccessVerified(false);
    revalidateEventAccess().then((verified)=>{if(active)setAccessVerified(verified);});
    return()=>{active=false;};
  },[demoMode,id,revalidateEventAccess]);

  useEffect(() => {
    const client = supabase;
    if (!id || demoMode || !backendConfigured || !client) return;
    const channel = client.channel(`event-live-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${id}` }, () => refreshAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendees', filter: `event_id=eq.${id}` }, () => refreshAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_cohosts', filter: `event_id=eq.${id}` }, () => refreshAll())
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [id, demoMode, refreshAll]);

  if (!event) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>This event isn’t here.</Text>
          <Pressable onPress={() => router.back()} style={styles.backTarget} accessibilityRole="button">
            <Text style={styles.backLink}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const host = people.find((person) => person.id === event.hostId);
  const isHost = event.hostId === currentUser.id;
  const isCohost = (event.cohostIds ?? []).includes(currentUser.id);
  const isManager = isHost || isCohost;
  const going = event.attendeeIds.includes(currentUser.id);
  const saved = savedEventIds.includes(event.id);
  const requested = requestedEventIds.includes(event.id);
  // RLS protects the row; this separate viewer-state gate prevents accidental rendering if precise data is present.
  const accessSafeEvent=accessVerified?event:{...event,exactLocation:undefined,exactLatitude:undefined,exactLongitude:undefined,photos:[]};
  const eventLocation = eventLocationForViewer(accessSafeEvent, currentUser?.id);
  const canSeeExact = eventLocation.canSeeExact;
  const canShowExactCoords = eventLocation.showsExactCoordinates;
  const attendees = event.attendeeIds
    .map((attendeeId) => people.find((person) => person.id === attendeeId))
    .filter(Boolean) as typeof people;
  const sortedAttendees = [...attendees].sort((a, b) => {
    const rank = (personId: string) => friendIds.includes(personId) ? 0 : followingIds.includes(personId) ? 1 : 2;
    return rank(a.id) - rank(b.id);
  });
  const friends = sortedAttendees.filter((person) => friendIds.includes(person.id));
  const followedGoing = sortedAttendees.filter((person) => !friendIds.includes(person.id) && followingIds.includes(person.id));
  const requests = (eventRequestIdsByEvent[event.id] ?? [])
    .map((requestId) => people.find((person) => person.id === requestId))
    .filter(Boolean) as typeof people;
  const socialProof = friends.length
    ? `${friends[0].name.split(' ')[0]}${friends.length > 1 ? ` + ${friends.length - 1} friend${friends.length > 2 ? 's' : ''}` : ''} ${friends.length === 1 ? 'is' : 'are'} going`
    : followedGoing.length
      ? `${followedGoing.length} ${followedGoing.length === 1 ? 'person' : 'people'} you follow ${followedGoing.length === 1 ? 'is' : 'are'} going`
      : 'Be the friend who starts it.';
  const eventPosts = accessVerified?posts.filter((post) => post.eventId === event.id):[];
  const eventPhotos=accessVerified?event.photos:[];
  const cohosts = (event.cohostIds ?? [])
    .map((cohostId) => people.find((person) => person.id === cohostId))
    .filter(Boolean) as typeof people;
  const cohostCandidates = people.filter((person) => person.id !== currentUser.id && person.id !== event.hostId).slice(0, 8);
  const displayLat = eventLocation.latitude;
  const displayLng = eventLocation.longitude;
  const exactLocationCopy = canSeeExact
    ? (accessSafeEvent.exactLocation ?? (eventLocation.hasExactCoordinates ? 'Precise pin available' : 'Exact details unavailable'))
    : 'Available after approval or invitation';
  const rsvpDisabled = isManager || event.privacy === 'Private';

  const act = async () => {
    try {
      if (isManager) return;
      if (event.privacy === 'Public' || going) await toggleGoing(event.id);
      else if (event.privacy === 'Request') await toggleEventRequest(event.id);
      else Alert.alert('Invite only', 'The host has to invite you to this one.');
    } catch (error: any) {
      Alert.alert('Couldn’t update RSVP', friendlyErrorMessage(error, 'Try again.'));
    }
  };
  const buttonLabel = isHost
    ? 'Hosting'
    : isCohost
      ? 'Co-hosting'
      : going
        ? 'Going'
        : event.privacy === 'Public'
          ? 'I’m going'
          : event.privacy === 'Request'
            ? (requested ? 'Request Sent' : 'Request to Join')
            : 'Invite Only';

  const addPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .82 });
    if (!result.canceled && result.assets[0]?.uri) {
      try { await addEventPhoto(event.id, result.assets[0].uri); }
      catch (error: any) { Alert.alert('Couldn’t add photo', friendlyErrorMessage(error, 'Try again.')); }
    }
  };
  const nativeShare = () => Share.share({
    message: `${event.title} · ${event.dateLabel} · ${event.time}\n${event.location}\n${Linking.createURL(`/event/${event.id}`)}`,
  }).catch(() => {});
  const inviteCandidates = [...people.filter((person) => person.id !== currentUser.id)].sort((a, b) => {
    const rank = (personId: string) => friendIds.includes(personId) ? 0 : followingIds.includes(personId) ? 1 : 2;
    return rank(a.id) - rank(b.id);
  });
  const sendInvites = async () => {
    if (!selectedInvitees.length) return;
    setInviteBusy(true);
    try {
      await invitePeople(event.id, selectedInvitees);
      setInviteOpen(false);
      setSelectedInvitees([]);
      Alert.alert('Invites sent', `Sent to ${selectedInvitees.length} ${selectedInvitees.length === 1 ? 'person' : 'people'}.`);
    } catch (error: any) {
      Alert.alert('Couldn’t send invites', friendlyErrorMessage(error, 'Try again.'));
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 108 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.circle} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="arrow-back" color={colors.white} size={21} />
          </Pressable>
          <View style={styles.topActions}>
            <Pressable
              onPress={() => toggleSavedEvent(event.id).catch(() => {})}
              style={styles.circle}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Unsave event' : 'Save event'}
            >
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} color={saved ? colors.accent2 : colors.white} size={19} />
            </Pressable>
            <Pressable onPress={nativeShare} style={styles.circle} accessibilityRole="button" accessibilityLabel="Share event">
              <Ionicons name="share-outline" color={colors.white} size={20} />
            </Pressable>
            <Pressable onPress={() => setMoreOpen(true)} style={styles.circle} accessibilityRole="button" accessibilityLabel="More event actions">
              <Ionicons name="ellipsis-horizontal" color={colors.white} size={20} />
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          {event.cover
            ? <Image source={{ uri: event.cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <View style={[StyleSheet.absoluteFill, styles.heroFallback]}><Ionicons name="sparkles" color={colors.accent2} size={34} /></View>}
          <View style={styles.heroShade} />
          <View style={styles.category}><Text style={styles.categoryText}>{event.category}</Text></View>
          <View style={styles.heroCopy}>
            <Text style={styles.date}>{event.dateLabel} · {event.time}</Text>
            <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
            <View style={styles.placeRow}>
              <Ionicons name="location" color={colors.white} size={14} />
              <Text style={styles.place} numberOfLines={1}>{event.location}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.summaryCard}>
            <Pressable
              disabled={!host}
              onPress={() => host && router.push(`/profile/${host.id}`)}
              style={styles.hostRow}
              accessibilityRole={host ? 'button' : undefined}
              accessibilityLabel={host ? `View ${host.name}’s profile` : undefined}
            >
              {host ? <Avatar person={host} size={44} /> : null}
              <View style={styles.hostCopy}>
                <Text style={styles.hostLabel}>Hosted by</Text>
                <View style={styles.hostNameRow}>
                  <Text style={styles.hostName} numberOfLines={1}>{host?.name ?? 'FOMO host'}</Text>
                  {host ? <VerifiedBadge person={host} size={13} /> : null}
                </View>
                {host?.username ? <Text style={styles.hostUser}>@{host.username}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" color={colors.subtle} size={17} />
            </Pressable>

            <View style={styles.attendanceRow}>
              {sortedAttendees.length
                ? <AvatarStack people={sortedAttendees} size={31} max={5} />
                : <View style={styles.attendanceIcon}><Ionicons name="people" color={colors.accent2} size={18} /></View>}
              <View style={styles.attendanceCopy}>
                <Text style={styles.actionCount}>{event.attendeeIds.length} going</Text>
                <Text style={styles.actionSub} numberOfLines={2}>{socialProof}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Info icon="calendar-outline" label="Date & time" value={`${event.dateLabel} · ${event.time}`} />
            <Info icon="location-outline" label="Area" value={event.location} />
            <Info icon={canSeeExact ? 'lock-open-outline' : 'lock-closed-outline'} label="Exact location" value={exactLocationCopy} accent={!canSeeExact} last />
          </View>

          <View style={styles.map}>
            <MapView
              key={`${event.id}-${canShowExactCoords ? 'exact' : 'area'}`}
              style={StyleSheet.absoluteFill}
              initialRegion={{ latitude: displayLat, longitude: displayLng, latitudeDelta: .009, longitudeDelta: .009 }}
              userInterfaceStyle="dark"
              scrollEnabled
              zoomEnabled
            >
              <Marker coordinate={{ latitude: displayLat, longitude: displayLng }}>
                <View style={[styles.mapPin, { borderColor: categoryColor(event.category) }]}><View style={styles.mapPinCore} /></View>
              </Marker>
            </MapView>
            <View style={styles.mapStatus}>
              <Ionicons name={canShowExactCoords ? 'navigate' : 'lock-closed'} color={colors.white} size={15} />
              <Text style={styles.mapStatusText}>{canShowExactCoords ? 'Exact pin' : 'Approximate area'}</Text>
            </View>
          </View>

          {event.description ? (
            <View style={[styles.section, styles.sectionCard]}>
              <Text style={styles.sectionEyebrow}>DETAILS</Text>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View><Text style={styles.sectionEyebrow}>COMMUNITY</Text><Text style={styles.sectionTitle}>People</Text></View>
              <Text style={styles.sectionMeta}>{event.attendeeIds.length} going</Text>
            </View>
            {sortedAttendees.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>
                {sortedAttendees.map((person) => (
                  <Pressable key={person.id} onPress={() => router.push(`/profile/${person.id}`)} style={styles.person} accessibilityRole="button">
                    <Avatar person={person} size={50} />
                    <Text style={styles.personName} numberOfLines={1}>{person.name.split(' ')[0]}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : <Text style={styles.emptyPhotos}>No attendees yet.</Text>}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View><Text style={styles.sectionEyebrow}>MEMORIES</Text><Text style={styles.sectionTitle}>From this event</Text></View>
              <Pressable onPress={addPhoto} style={styles.addPhotoTarget} accessibilityRole="button">
                <Ionicons name="add" color={colors.accent2} size={17} /><Text style={styles.addPhoto}>Add photo</Text>
              </Pressable>
            </View>
            {eventPosts.length || eventPhotos.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
                {eventPosts.map((post) => (
                  <Pressable key={post.id} onPress={() => router.push(`/post/${post.id}`)} style={styles.photo} accessibilityRole="button">
                    {post.mediaUrl && post.mediaType !== 'video'
                      ? <Image source={{ uri: post.mediaUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      : <View style={styles.videoTile}><Ionicons name="play" color={colors.white} size={24} /></View>}
                  </Pressable>
                ))}
                {eventPhotos.map((uri, index) => <Image key={`${uri}-${index}`} source={{ uri }} style={styles.photo} resizeMode="cover" />)}
              </ScrollView>
            ) : <Text style={styles.emptyPhotos}>Nothing from this one yet.</Text>}
          </View>

          {isManager ? (
            <View style={styles.hostTools}>
              <View style={styles.hostToolsHead}>
                <View><Text style={styles.sectionEyebrow}>MANAGE</Text><Text style={styles.hostToolsTitle}>Host controls</Text></View>
                <View style={styles.hostBadge}><Ionicons name="shield-checkmark" color={colors.accent2} size={15} /></View>
              </View>
              <Text style={styles.hostToolsSub}>{requests.length} pending · {event.attendeeIds.length} going</Text>
              {requests.length ? (
                <View style={styles.requestList}>
                  {requests.map((person) => (
                    <View key={person.id} style={styles.requestRow}>
                      <Avatar person={person} size={39} />
                      <View style={styles.requestCopy}><Text style={styles.requestName}>{person.name}</Text><Text style={styles.requestUser}>@{person.username}</Text></View>
                      <Pressable onPress={() => declineEventRequest(event.id, person.id)} style={styles.smallAction}><Text style={styles.decline}>Decline</Text></Pressable>
                      <Pressable onPress={() => approveEventRequest(event.id, person.id)} style={styles.approve}><Text style={styles.approveText}>Approve</Text></Pressable>
                    </View>
                  ))}
                </View>
              ) : <Text style={styles.noRequests}>No join requests right now.</Text>}

              {isHost ? (
                <>
                  <Text style={styles.guestLabel}>CO-HOSTS</Text>
                  {cohosts.map((person) => (
                    <View key={person.id} style={styles.guest}>
                      <Avatar person={person} size={36} />
                      <View style={styles.guestNameLine}><Text style={styles.guestName}>{person.name}</Text><VerifiedBadge person={person} size={12} /></View>
                      <Pressable
                        onPress={async () => { setCohostBusy(person.id); try { await removeCohost(event.id, person.id); } finally { setCohostBusy(undefined); } }}
                        style={styles.textAction}
                      ><Text style={styles.remove}>{cohostBusy === person.id ? '…' : 'Remove'}</Text></Pressable>
                    </View>
                  ))}
                  {cohostCandidates.filter((person) => !(event.cohostIds ?? []).includes(person.id)).slice(0, 4).map((person) => (
                    <View key={person.id} style={styles.guest}>
                      <Avatar person={person} size={36} />
                      <View style={styles.guestNameLine}><Text style={styles.guestName}>{person.name}</Text><VerifiedBadge person={person} size={12} /></View>
                      <Pressable
                        onPress={async () => { setCohostBusy(person.id); try { await addCohost(event.id, person.id); } finally { setCohostBusy(undefined); } }}
                        style={styles.textAction}
                      ><Text style={styles.addHost}>{cohostBusy === person.id ? '…' : 'Add'}</Text></Pressable>
                    </View>
                  ))}
                </>
              ) : null}

              {attendees.filter((person) => person.id !== currentUser.id).length ? (
                <>
                  <Text style={styles.guestLabel}>GUEST LIST</Text>
                  {attendees.filter((person) => person.id !== currentUser.id).map((person) => (
                    <View key={person.id} style={styles.guest}>
                      <Avatar person={person} size={36} />
                      <View style={styles.guestNameLine}><Text style={styles.guestName}>{person.name}</Text><VerifiedBadge person={person} size={12} /></View>
                      <Pressable onPress={() => removeEventAttendee(event.id, person.id)} style={styles.textAction}><Text style={styles.remove}>Remove</Text></Pressable>
                    </View>
                  ))}
                </>
              ) : null}

              {isHost ? (
                <Pressable
                  onPress={() => Alert.alert('Cancel event?', 'This removes it from the active campus feed.', [
                    { text: 'Keep it', style: 'cancel' },
                    { text: 'Cancel event', style: 'destructive', onPress: async () => { await cancelEvent(event.id); router.back(); } },
                  ])}
                  style={styles.cancel}
                ><Text style={styles.cancelText}>Cancel event</Text></Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.rsvpDock, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <BlurView intensity={72} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
        <View style={styles.rsvpDockInner}>
          <View style={styles.rsvpDockCopy}>
            <Text style={styles.rsvpDockLabel}>{event.privacy} event</Text>
            <Text style={styles.rsvpDockMeta} numberOfLines={1}>{event.dateLabel} · {event.time}</Text>
          </View>
          <Pressable
            onPress={act}
            disabled={rsvpDisabled}
            style={({ pressed }) => [
              styles.rsvp,
              (isManager || going || requested) && styles.rsvpSecondary,
              pressed && !rsvpDisabled && styles.rsvpPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: rsvpDisabled }}
          >
            <Text style={[styles.rsvpText, (isManager || going || requested) && styles.rsvpTextSecondary]}>{buttonLabel}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setMoreOpen(false)} />
        <View style={[styles.actionSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.shareTitle}>Event actions</Text>
          <Text style={styles.shareSub}>Invite people or send this event in FOMO.</Text>
          {event.privacy !== 'Private' || isManager ? (
            <SheetAction icon="person-add-outline" label="Invite people" onPress={() => { setMoreOpen(false); setInviteOpen(true); }} />
          ) : null}
          <SheetAction icon="chatbubble-outline" label="Send in chat" onPress={() => { setMoreOpen(false); setShareOpen(true); }} />
          {!isHost ? (
            <SheetAction
              icon="flag-outline"
              label="Report event"
              danger
              onPress={() => { setMoreOpen(false); showReportSheet({ type: 'event', id: event.id }, report); }}
            />
          ) : null}
        </View>
      </Modal>

      <Modal visible={inviteOpen} transparent animationType="slide" onRequestClose={() => setInviteOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setInviteOpen(false)} />
        <View style={[styles.shareSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.inviteHead}>
            <View style={styles.sheetTitleCopy}>
              <Text style={styles.shareTitle}>Invite people</Text>
              <Text style={styles.shareSub}>{event.privacy === 'Private' ? 'Host invites grant access to this private event.' : 'Friends first, then people you follow.'}</Text>
            </View>
            <Pressable onPress={sendInvites} disabled={!selectedInvitees.length || inviteBusy} style={[styles.inviteSend, (!selectedInvitees.length || inviteBusy) && styles.inviteSendDisabled]}>
              <Text style={styles.inviteSendText}>{inviteBusy ? '…' : `Send${selectedInvitees.length ? ` ${selectedInvitees.length}` : ''}`}</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {inviteCandidates.map((person) => {
              const active = selectedInvitees.includes(person.id);
              return (
                <Pressable
                  key={person.id}
                  onPress={() => setSelectedInvitees((current) => current.includes(person.id) ? current.filter((personId) => personId !== person.id) : [...current, person.id])}
                  style={styles.shareRow}
                >
                  <Avatar person={person} size={44} />
                  <View style={styles.shareCopy}>
                    <View style={styles.hostNameRow}><Text style={styles.shareName}>{person.name}</Text><VerifiedBadge person={person} size={12} /></View>
                    <Text style={styles.shareUser}>@{person.username}{friendIds.includes(person.id) ? ' · Friend' : followingIds.includes(person.id) ? ' · Following' : ''}</Text>
                  </View>
                  <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} color={active ? colors.accent2 : colors.subtle} size={22} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={shareOpen} transparent animationType="slide" onRequestClose={() => setShareOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setShareOpen(false)} />
        <View style={[styles.shareSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.shareTitle}>Send this event</Text>
          <Text style={styles.shareSub}>Drop it straight into a FOMO chat.</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {people.filter((person) => person.id !== currentUser.id).map((person) => (
              <Pressable
                key={person.id}
                onPress={async () => {
                  try {
                    const chat = await shareEventWithPerson(event.id, person.id);
                    setShareOpen(false);
                    router.push(`/chat/${chat}?peer=${person.id}`);
                  } catch (error: any) {
                    Alert.alert('Couldn’t send event', friendlyErrorMessage(error, 'Try again.'));
                  }
                }}
                style={styles.shareRow}
              >
                <Avatar person={person} size={44} />
                <View style={styles.shareCopy}><Text style={styles.shareName}>{person.name}</Text><Text style={styles.shareUser}>@{person.username}</Text></View>
                <View style={styles.sendIcon}><Ionicons name="send" color={colors.accent2} size={17} /></View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Info({ icon, label, value, last = false, accent = false }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={[styles.info, !last && styles.infoBorder]}>
      <View style={styles.infoIcon}><Ionicons name={icon} color={accent ? colors.accent2 : colors.text} size={19} /></View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SheetAction({ icon, label, onPress, danger = false }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.sheetAction, pressed && styles.sheetActionPressed]} accessibilityRole="button">
      <View style={styles.sheetActionIcon}><Ionicons name={icon} color={danger ? colors.danger : colors.text} size={19} /></View>
      <Text style={[styles.sheetActionText, danger && styles.sheetActionDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" color={colors.subtle} size={17} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 108 },
  topbar: { height: 56, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', gap: 7 },
  circle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  hero: { aspectRatio: 1.28, marginHorizontal: 10, borderRadius: 27, overflow: 'hidden', backgroundColor: colors.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  heroFallback: { backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(4,5,7,.38)' },
  category: { position: 'absolute', left: 15, top: 15, minHeight: 30, borderRadius: 15, backgroundColor: 'rgba(9,11,14,.82)', paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.14)' },
  categoryText: { color: colors.white, fontSize: 10.5, fontWeight: '900', letterSpacing: .6 },
  heroCopy: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  date: { color: colors.accent2, fontSize: 12, fontWeight: '900', letterSpacing: .65 },
  title: { color: colors.white, fontSize: 30, lineHeight: 32, fontWeight: '900', letterSpacing: -1.1, marginTop: 6 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  place: { flex: 1, color: '#ECECEE', fontSize: 13.5, fontWeight: '700' },
  body: { paddingHorizontal: 14 },
  summaryCard: { marginTop: 12, borderRadius: 23, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  hostRow: { minHeight: 76, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  hostCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  hostLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  hostNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hostName: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 2, flexShrink: 1 },
  hostUser: { color: colors.muted, fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  attendanceRow: { minHeight: 72, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  attendanceIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  attendanceCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  actionCount: { color: colors.text, fontSize: 17, fontWeight: '900' },
  actionSub: { color: colors.muted, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  infoCard: { marginTop: 12, backgroundColor: colors.surface, borderRadius: 23, paddingHorizontal: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  info: { minHeight: 68, flexDirection: 'row', alignItems: 'center' },
  infoBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  infoIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, minWidth: 0, marginLeft: 11, paddingVertical: 10 },
  infoLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  infoValue: { color: colors.text, fontSize: 13.5, lineHeight: 18, fontWeight: '800', marginTop: 3 },
  map: { height: 210, borderRadius: 23, overflow: 'hidden', marginTop: 12, backgroundColor: colors.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  mapPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, borderWidth: 3, alignItems: 'center', justifyContent: 'center', shadowColor: colors.black, shadowOpacity: .28, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  mapPinCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.black },
  mapStatus: { position: 'absolute', left: 11, bottom: 11, minHeight: 34, borderRadius: 17, backgroundColor: 'rgba(9,11,14,.86)', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.14)' },
  mapStatusText: { color: colors.white, fontSize: 10.5, fontWeight: '800' },
  section: { marginTop: 29 },
  sectionCard: { padding: 16, borderRadius: 23, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  sectionHead: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionEyebrow: { color: colors.accent2, fontSize: 10, fontWeight: '900', letterSpacing: 1.05, marginBottom: 4 },
  sectionTitle: { color: colors.text, fontSize: 21, lineHeight: 25, fontWeight: '900', letterSpacing: -.45 },
  sectionMeta: { color: colors.muted, fontSize: 11.5, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  peopleRow: { gap: 13, paddingTop: 12, paddingRight: 16 },
  person: { width: 56, minHeight: 78, alignItems: 'center' },
  personName: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 6, maxWidth: 56 },
  addPhotoTarget: { minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhoto: { color: colors.text, fontSize: 11.5, fontWeight: '800' },
  photos: { gap: 8, paddingTop: 12, paddingRight: 16 },
  photo: { width: 156, aspectRatio: 1, borderRadius: 19, backgroundColor: colors.surface2, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  videoTile: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface3 },
  emptyPhotos: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 10 },
  hostTools: { marginTop: 32, padding: 16, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(139,150,255,.22)' },
  hostToolsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hostBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  hostToolsTitle: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -.5 },
  hostToolsSub: { color: colors.muted, fontSize: 11.5, marginTop: 5 },
  requestList: { marginTop: 13 },
  requestRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  requestCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  requestName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  requestUser: { color: colors.muted, fontSize: 11, marginTop: 2 },
  smallAction: { minWidth: 54, height: 44, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  decline: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  approve: { minWidth: 68, height: 44, borderRadius: 18, backgroundColor: colors.accent, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  approveText: { color: colors.white, fontSize: 10.5, fontWeight: '900' },
  noRequests: { color: colors.muted, fontSize: 12, marginTop: 13 },
  guestLabel: { color: colors.muted, fontSize: 10.5, fontWeight: '900', letterSpacing: .8, marginTop: 22, marginBottom: 3 },
  guest: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  guestNameLine: { flex: 1, minWidth: 0, marginLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  guestName: { color: colors.text, fontSize: 12.5, fontWeight: '700', flexShrink: 1 },
  textAction: { minWidth: 56, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  remove: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  addHost: { color: colors.accent2, fontSize: 11, fontWeight: '900' },
  cancel: { height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  cancelText: { color: colors.danger, fontSize: 11.5, fontWeight: '800' },
  rsvpDock: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,.13)', paddingTop: 10, paddingHorizontal: 14 },
  rsvpDockInner: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  rsvpDockCopy: { flex: 1, minWidth: 0, marginRight: 12 },
  rsvpDockLabel: { color: colors.accent2, fontSize: 10.5, fontWeight: '900', letterSpacing: .45 },
  rsvpDockMeta: { color: colors.text, fontSize: 12.5, fontWeight: '800', marginTop: 3 },
  rsvp: { minWidth: 116, height: 50, borderRadius: 20, backgroundColor: colors.accent, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.18)' },
  rsvpSecondary: { backgroundColor: colors.surface2, borderColor: colors.line },
  rsvpPressed: { backgroundColor: colors.accentPressed, transform: [{ scale: .98 }] },
  rsvpText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  rsvpTextSecondary: { color: colors.text },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,.62)' },
  actionSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: 29, borderTopRightRadius: 29, paddingHorizontal: 16, paddingTop: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  shareSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '70%', backgroundColor: colors.surface, borderTopLeftRadius: 29, borderTopRightRadius: 29, paddingHorizontal: 16, paddingTop: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 15 },
  sheetAction: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  sheetActionPressed: { opacity: .68 },
  sheetActionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  sheetActionText: { flex: 1, color: colors.text, fontSize: 13.5, fontWeight: '800' },
  sheetActionDanger: { color: colors.danger },
  inviteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sheetTitleCopy: { flex: 1, minWidth: 0 },
  inviteSend: { minWidth: 70, height: 44, borderRadius: 20, backgroundColor: colors.accent, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  inviteSendDisabled: { opacity: .3 },
  inviteSendText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  shareTitle: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -.55 },
  shareSub: { color: colors.muted, fontSize: 11.5, lineHeight: 16, marginTop: 4, marginBottom: 10 },
  shareRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  shareCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  shareName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  shareUser: { color: colors.muted, fontSize: 11, marginTop: 2 },
  sendIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  backTarget: { minWidth: 80, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  backLink: { color: colors.muted, fontSize: 12, fontWeight: '700' },
});
