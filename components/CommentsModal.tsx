import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedPost, Person } from '@/data/seed';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { colors } from '@/theme/colors';
import { timeAgo } from '@/utils/time';

export function CommentsModal({ visible, post, people, currentUserId, onClose, onSend, onDelete }: {
  visible: boolean; post?: FeedPost; people: Person[]; currentUserId: string; onClose: () => void;
  onSend: (body: string) => Promise<void>; onDelete: (commentId: string) => Promise<void>;
}) {
  const [body, setBody] = useState('');
  const [, setClock] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setClock((n) => n + 1);
    const timer = setInterval(() => setClock((n) => n + 1), 15000);
    return () => clearInterval(timer);
  }, [visible]);

  const submit = async () => {
    if (!body.trim()) return;
    const text = body.trim();
    setBody('');
    await onSend(text);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <View>
            <Text style={styles.title}>Comments</Text>
            <Text style={styles.subtitle}>{post?.comments.length ?? 0} {(post?.comments.length ?? 0) === 1 ? 'reply' : 'replies'}</Text>
          </View>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}><Ionicons name="close" color={colors.text} size={20} /></Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {post?.comments.length ? post.comments.map((comment) => {
            const author = people.find((p) => p.id === comment.authorId);
            if (!author) return null;
            return (
              <View key={comment.id} style={styles.comment}>
                <Avatar person={author} size={36} />
                <View style={styles.commentCopy}>
                  <View style={styles.metaLine}>
                    <Text style={styles.commentName}>@{author.username}</Text><VerifiedBadge person={author} size={12}/>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentBody}>{comment.body}</Text>
                </View>
                {comment.authorId === currentUserId ? (
                  <Pressable onPress={() => onDelete(comment.id)} hitSlop={10} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                    <Ionicons name="trash-outline" color={colors.subtle} size={15} />
                  </Pressable>
                ) : null}
              </View>
            );
          }) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="chatbubble-ellipses-outline" color={colors.muted} size={24} /></View>
              <Text style={styles.emptyTitle}>Start the conversation.</Text>
              <Text style={styles.emptyBody}>Be the first person to say something.</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Add a comment…"
              placeholderTextColor={colors.subtle}
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={submit}
              maxLength={600}
            />
            <Pressable onPress={submit} disabled={!body.trim()} style={({ pressed }) => [styles.send, !body.trim() && styles.sendDisabled, pressed && body.trim() ? styles.pressed : null]}>
              <Ionicons name="arrow-up" color={body.trim() ? colors.white : colors.subtle} size={18} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingTop: 9 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 5 },
  head: { minHeight: 62, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: colors.subtle, fontSize: 9.5, fontWeight: '700', marginTop: 2 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 19 },
  commentCopy: { flex: 1, marginLeft: 10, paddingTop: 1 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap:4 },
  commentName: { color: colors.text, fontSize: 11.5, fontWeight: '900' },
  dot: { color: colors.subtle, fontSize: 8, marginHorizontal: 6 },
  commentTime: { color: colors.subtle, fontSize: 9.5, fontWeight: '600' },
  commentBody: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 4 },
  deleteButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginLeft: 5 },
  empty: { alignItems: 'center', paddingTop: 84, paddingHorizontal: 28 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  emptyBody: { color: colors.muted, fontSize: 11.5, marginTop: 5, textAlign: 'center' },
  composerWrap: { paddingHorizontal: 12, paddingTop: 9, paddingBottom: Platform.OS === 'ios' ? 8 : 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.glass },
  composer: { minHeight: 48, borderRadius: 25, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', paddingLeft: 15, paddingRight: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  input: { flex: 1, minHeight: 44, color: colors.text, fontSize: 13, paddingVertical: 10 },
  send: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: colors.surface3 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
