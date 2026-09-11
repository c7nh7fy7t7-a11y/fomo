import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { GlassSurface } from '@/components/GlassSurface';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { timeAgo } from '@/utils/time';

export default function MessagesScreen() {
  const router = useRouter();
  const { conversations, people, currentUser, friendIds, openChatWith, refreshConversations } = useApp();
  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [newQuery, setNewQuery] = useState('');

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversations;
    return conversations.filter((conversation) => {
      const peer = people.find((person) => person.id === conversation.peerId);
      return peer?.name.toLowerCase().includes(normalized)
        || peer?.username.toLowerCase().includes(normalized)
        || (conversation.lastMessage ?? '').toLowerCase().includes(normalized);
    });
  }, [conversations, people, query]);

  const candidates = useMemo(() => {
    const normalized = newQuery.trim().toLowerCase();
    return people
      .filter((person) => person.id !== currentUser.id)
      .filter((person) => !normalized || person.name.toLowerCase().includes(normalized) || person.username.toLowerCase().includes(normalized))
      .sort((a, b) => Number(friendIds.includes(b.id)) - Number(friendIds.includes(a.id)) || a.name.localeCompare(b.name));
  }, [people, currentUser.id, friendIds, newQuery]);

  const open = async (peerId: string) => {
    try {
      const conversationId = await openChatWith(peerId);
      setNewOpen(false);
      setNewQuery('');
      router.push(`/chat/${conversationId}?peer=${peerId}`);
    } catch (error: any) {
      Alert.alert('Couldn’t open chat', friendlyErrorMessage(error, 'Try again.'));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrowRow}>
            <View style={styles.privateDot} />
            <Text style={styles.kicker}>PRIVATE INBOX</Text>
          </View>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.sub}>{conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'} on campus</Text>
        </View>
        <Pressable
          onPress={() => setNewOpen(true)}
          style={({ pressed }) => [styles.newMessage, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Start a new message"
        >
          <Ionicons name="create-outline" color={colors.white} size={22} />
        </Pressable>
      </View>

      <GlassSurface style={styles.searchWrap} intensity={56}>
        <Ionicons name="search-outline" color={colors.muted} size={19} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search conversations"
          placeholderTextColor={colors.subtle}
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Search conversations"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} style={styles.clearSearch} accessibilityRole="button" accessibilityLabel="Clear search">
            <Ionicons name="close-circle" color={colors.muted} size={19} />
          </Pressable>
        ) : null}
      </GlassSurface>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollEndDrag={refreshConversations}
      >
        {filteredConversations.length ? (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listLabel}>{query ? 'RESULTS' : 'RECENT'}</Text>
              <Text style={styles.listCount}>{filteredConversations.length}</Text>
            </View>
            {filteredConversations.map((conversation) => {
              const peer = people.find((person) => person.id === conversation.peerId);
              if (!peer) return null;
              return (
                <Pressable
                  key={conversation.id}
                  onPress={() => router.push(`/chat/${conversation.id}?peer=${peer.id}`)}
                  style={({ pressed }) => [styles.conversation, pressed && styles.conversationPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open conversation with ${peer.name}`}
                >
                  <View style={styles.avatarFrame}><Avatar person={peer} size={58} /></View>
                  <View style={styles.conversationCopy}>
                    <View style={styles.nameLine}>
                      <View style={styles.nameInline}>
                        <Text style={styles.name} numberOfLines={1}>{peer.name}</Text>
                        <VerifiedBadge person={peer} size={14} />
                      </View>
                      <Text style={styles.time}>{conversation.lastMessageAt ? timeAgo(conversation.lastMessageAt) : ''}</Text>
                    </View>
                    <Text style={[styles.preview, !conversation.lastMessage && styles.previewEmpty]} numberOfLines={2}>
                      {conversation.lastMessage ?? `Start a conversation with ${peer.name.split(' ')[0]}.`}
                    </Text>
                  </View>
                  <View style={styles.openIcon}><Ionicons name="chevron-forward" color={colors.muted} size={17} /></View>
                </Pressable>
              );
            })}
          </>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyGlow} />
            <View style={styles.emptyIcon}><Ionicons name={query ? 'search-outline' : 'chatbubbles-outline'} color={colors.accent2} size={30} /></View>
            <Text style={styles.emptyTitle}>{query ? 'No conversations found' : 'Your inbox is ready'}</Text>
            <Text style={styles.emptyBody}>
              {query ? 'Try a different name, username, or message.' : 'Start a private conversation with someone on campus.'}
            </Text>
            {!query ? (
              <Pressable onPress={() => setNewOpen(true)} style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]} accessibilityRole="button">
                <Ionicons name="create-outline" color={colors.white} size={17} />
                <Text style={styles.emptyButtonText}>New message</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal visible={newOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNewOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleCopy}>
              <Text style={styles.modalKicker}>START A CONVERSATION</Text>
              <Text style={styles.modalTitle}>New message</Text>
              <Text style={styles.modalSub}>Pick someone on campus.</Text>
            </View>
            <Pressable onPress={() => setNewOpen(false)} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" color={colors.text} size={21} />
            </Pressable>
          </View>
          <GlassSurface style={[styles.searchWrap, styles.modalSearch]} intensity={56}>
            <Ionicons name="search-outline" color={colors.muted} size={19} />
            <TextInput
              value={newQuery}
              onChangeText={setNewQuery}
              placeholder="Search people"
              placeholderTextColor={colors.subtle}
              style={styles.searchInput}
              returnKeyType="search"
              autoFocus
            />
            {newQuery ? (
              <Pressable onPress={() => setNewQuery('')} style={styles.clearSearch} accessibilityRole="button" accessibilityLabel="Clear search">
                <Ionicons name="close-circle" color={colors.muted} size={19} />
              </Pressable>
            ) : null}
          </GlassSurface>
          <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.listHeader}>
              <Text style={styles.listLabel}>{newQuery ? 'RESULTS' : 'PEOPLE'}</Text>
              <Text style={styles.listCount}>{candidates.length}</Text>
            </View>
            {candidates.map((person) => (
              <Pressable
                key={person.id}
                onPress={() => open(person.id)}
                style={({ pressed }) => [styles.person, pressed && styles.conversationPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Message ${person.name}`}
              >
                <Avatar person={person} size={52} />
                <View style={styles.personCopy}>
                  <View style={styles.personNameLine}>
                    <Text style={styles.personName} numberOfLines={1}>{person.name}</Text>
                    <VerifiedBadge person={person} size={13} />
                    {friendIds.includes(person.id) ? <View style={styles.friendPill}><Text style={styles.friendPillText}>FRIEND</Text></View> : null}
                  </View>
                  <Text style={styles.personUser} numberOfLines={1}>@{person.username}</Text>
                </View>
                <View style={styles.personAction}><Ionicons name="arrow-forward" color={colors.accent2} size={17} /></View>
              </Pressable>
            ))}
            {!candidates.length ? <Text style={styles.noPeople}>No people match that search.</Text> : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  privateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent2 },
  kicker: { color: colors.accent2, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.15 },
  title: { color: colors.text, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2, marginTop: 3 },
  sub: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 3 },
  newMessage: { width: 48, height: 48, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.20)', shadowColor: colors.accent, shadowOpacity: .18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  pressed: { opacity: .75, transform: [{ scale: .97 }] },
  searchWrap: { height: 50, marginHorizontal: 16, borderRadius: 21, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  searchInput: { flex: 1, color: colors.text, fontSize: 13.5, marginLeft: 9, paddingVertical: 0 },
  clearSearch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 12, paddingTop: 15, paddingBottom: 128, flexGrow: 1 },
  listHeader: { height: 30, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  listLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.05 },
  listCount: { color: colors.subtle, fontSize: 10.5, fontWeight: '800' },
  conversation: { minHeight: 98, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 24, marginBottom: 8, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  conversationPressed: { backgroundColor: colors.surface2, borderColor: 'rgba(139,150,255,.26)', transform: [{ scale: .992 }] },
  avatarFrame: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  conversationCopy: { flex: 1, minWidth: 0, marginLeft: 12, marginRight: 8 },
  nameLine: { flexDirection: 'row', alignItems: 'center' },
  nameInline: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, color: colors.text, fontSize: 15.5, fontWeight: '900' },
  time: { color: colors.subtle, fontSize: 10.5, fontWeight: '700', marginLeft: 8 },
  preview: { color: colors.muted, fontSize: 12.5, lineHeight: 17, fontWeight: '600', marginTop: 6 },
  previewEmpty: { color: colors.accent2 },
  openIcon: { width: 34, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  empty: { minHeight: 330, marginTop: 8, paddingHorizontal: 30, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  emptyGlow: { position: 'absolute', top: -95, width: 230, height: 190, borderRadius: 115, backgroundColor: colors.accentGlow, opacity: .52 },
  emptyIcon: { width: 66, height: 66, borderRadius: 26, backgroundColor: colors.accentSoft, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(139,150,255,.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: colors.text, fontSize: 21, fontWeight: '900', letterSpacing: -.4 },
  emptyBody: { color: colors.muted, fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginTop: 7, maxWidth: 270 },
  emptyButton: { minWidth: 140, height: 48, borderRadius: 20, backgroundColor: colors.accent, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 },
  emptyButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginTop: 8 },
  modalHeader: { minHeight: 102, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitleCopy: { flex: 1, minWidth: 0 },
  modalKicker: { color: colors.accent2, fontSize: 9, fontWeight: '900', letterSpacing: 1.05 },
  modalTitle: { color: colors.text, fontSize: 25, lineHeight: 29, fontWeight: '900', letterSpacing: -.65, marginTop: 3 },
  modalSub: { color: colors.muted, fontSize: 11.5, marginTop: 3 },
  close: { width: 44, height: 44, borderRadius: 20, backgroundColor: colors.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  modalSearch: { marginTop: 0, marginBottom: 11 },
  modalList: { paddingHorizontal: 12, paddingBottom: 30 },
  person: { minHeight: 78, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, marginBottom: 7, borderRadius: 22, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  personCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  personNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personName: { color: colors.text, fontSize: 14, fontWeight: '900', flexShrink: 1 },
  personUser: { color: colors.muted, fontSize: 11.5, fontWeight: '600', marginTop: 3 },
  friendPill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.accentSoft },
  friendPillText: { color: colors.accent2, fontSize: 7.5, fontWeight: '900', letterSpacing: .55 },
  personAction: { width: 44, height: 44, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  noPeople: { color: colors.muted, fontSize: 12.5, textAlign: 'center', paddingVertical: 70 },
});
