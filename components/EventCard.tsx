import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FomoEvent, Person } from '@/data/seed';
import { categoryColor, categorySoft, colors } from '@/theme/colors';
import { AvatarStack } from './AvatarStack';
import { BlurView } from 'expo-blur';

const iconForCategory = (category: string): keyof typeof Ionicons.glyphMap => {
  if (category === 'Study') return 'book-outline';
  if (category === 'Clubs') return 'people-outline';
  if (category === 'Sports & Rec') return 'football-outline';
  if (category === 'Campus Event') return 'school-outline';
  return 'sparkles-outline';
};

export function EventCard({ event, people, friendIds, compact = false }: { event: FomoEvent; people: Person[]; friendIds: string[]; compact?: boolean }) {
  const router = useRouter();
  const attendees = event.attendeeIds.map((id) => people.find((p) => p.id === id)).filter(Boolean) as Person[];
  const friends = attendees.filter((p) => friendIds.includes(p.id));
  const accent = categoryColor(event.category);

  if (compact) {
    return (
      <Pressable onPress={() => router.push(`/event/${event.id}`)} style={({ pressed }) => [styles.compactCard, pressed && styles.pressed]}>
        <View style={styles.compactImageWrap}>
          {event.cover ? <Image source={{ uri: event.cover }} style={styles.image} resizeMode="cover" /> : (
            <View style={[styles.image, styles.fallback, { backgroundColor: categorySoft(event.category) }]}>
              <Ionicons name={iconForCategory(event.category)} color={accent} size={25} />
            </View>
          )}
          <BlurView intensity={48} tint="systemUltraThinMaterialDark" style={styles.compactTime}><Text style={styles.compactTimeText}>{event.dateLabel}</Text></BlurView>
        </View>
        <View style={styles.compactCopy}>
          <View style={styles.compactTopline}>
            <Text style={[styles.category, { color: accent }]}>{event.category}{event.recurrence?' · WEEKLY':''}</Text>
            <Text style={styles.compactClock}>{event.time}</Text>
          </View>
          <Text style={styles.compactTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.locationLine}><Ionicons name="location-outline" color={colors.subtle} size={12} /><Text style={styles.compactLocation} numberOfLines={1}>{event.location}</Text></View>
          <View style={styles.compactSocial}>
            {friends.length ? <AvatarStack people={friends} size={23} max={3} /> : null}
            <Text style={[styles.socialText, friends.length ? { marginLeft: 7 } : null]} numberOfLines={1}>
              {friends.length ? `${friends.length} friend${friends.length === 1 ? '' : 's'} going` : `${event.attendeeIds.length} going`}
            </Text>
          </View>
        </View>
        <View style={styles.compactArrow}><Ionicons name="chevron-forward" color={colors.subtle} size={16} /></View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={() => router.push(`/event/${event.id}`)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        {event.cover ? <Image source={{ uri: event.cover }} style={styles.image} resizeMode="cover" /> : (
          <View style={[styles.image, styles.fallback, { backgroundColor: categorySoft(event.category) }]}>
            <Ionicons name={iconForCategory(event.category)} color={accent} size={28} />
          </View>
        )}
        <View style={styles.imageShade} />
        <BlurView intensity={48} tint="systemUltraThinMaterialDark" style={styles.timeBubble}><Text style={styles.timeText}>{event.dateLabel} · {event.time}</Text></BlurView>
      </View>

      <View style={styles.copy}>
        <View style={styles.topline}>
          <Text style={[styles.category, { color: accent }]}>{event.category}{event.recurrence?' · WEEKLY':''}</Text>
          <Text style={styles.location} numberOfLines={1}>{event.location}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        <View style={styles.social}>
          {friends.length ? <AvatarStack people={friends} size={25} max={3} /> : null}
          <Text style={[styles.socialText, friends.length ? styles.socialWithAvatars : null]} numberOfLines={1}>
            {friends.length ? `${friends[0].name.split(' ')[0]}${friends.length > 1 ? ` + ${friends.length - 1} friend${friends.length > 2 ? 's' : ''}` : ''}` : `${event.attendeeIds.length} going`}
          </Text>
          <Ionicons name="chevron-forward" color={colors.subtle} size={16} style={styles.chevron} />
        </View>
      </View>
    </Pressable>
  );
}

export function FeaturedEvent({ event, people, friendIds }: { event: FomoEvent; people: Person[]; friendIds: string[] }) {
  const router = useRouter();
  const friendCandidates = event.attendeeIds.map((id) => people.find((p) => p.id === id)).filter(Boolean) as Person[];
  const friends = friendCandidates.filter((p) => friendIds.includes(p.id));
  return (
    <Pressable onPress={() => router.push(`/event/${event.id}`)} style={({ pressed }) => [styles.featured, pressed && styles.pressed]}>
      {event.cover ? <Image source={{ uri: event.cover }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: categorySoft(event.category) }]} />}
      <View style={styles.featuredShade} />
      <View style={styles.featuredTop}>
        <BlurView intensity={48} tint="systemUltraThinMaterialDark" style={styles.featuredChip}><View style={[styles.featuredDot, { backgroundColor: categoryColor(event.category) }]} /><Text style={styles.featuredChipText}>{event.recurrence?'WEEKLY · ':''}{event.category}</Text></BlurView>
        <BlurView intensity={48} tint="systemUltraThinMaterialDark" style={styles.featuredMetaPill}><Text style={styles.featuredMeta} numberOfLines={1}>{event.dateLabel} · {event.time}</Text></BlurView>
      </View>
      <View style={styles.featuredBottom}>
        <Text style={styles.featuredTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.featuredLocation} numberOfLines={1}><Ionicons name="location-outline" size={13} /> {event.location}</Text>
        <View style={styles.featuredSocial}>
          {friends.length ? <AvatarStack people={friends} size={29} max={4} /> : null}
          <Text style={[styles.featuredSocialText, friends.length ? { marginLeft: 9 } : null]} numberOfLines={1}>
            {friends.length ? `${friends.length} friend${friends.length === 1 ? '' : 's'} going` : `${event.attendeeIds.length} going`}
          </Text>
          <View style={styles.viewEvent}><Text style={styles.viewEventText}>Open</Text><Ionicons name="arrow-forward" color={colors.black} size={13} /></View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 26, overflow: 'hidden', marginBottom: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  compactCard: { minHeight: 132, flexDirection: 'row', alignItems: 'center', marginBottom: 11, padding: 9, borderRadius: 24, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  pressed: { opacity: 0.86, transform: [{ scale: 0.982 }] },
  imageWrap: { height: 166, backgroundColor: colors.surface2 },
  compactImageWrap: { width: 112, height: 112, borderRadius: 19, overflow: 'hidden', backgroundColor: colors.surface2 },
  image: { width: '100%', height: '100%' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  imageShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.12)' },
  timeBubble: { position: 'absolute', left: 11, bottom: 10, backgroundColor: 'rgba(5,5,5,0.78)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  timeText: { color: colors.white, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  compactTime: { position: 'absolute', left: 7, bottom: 7, backgroundColor: 'rgba(5,5,5,.78)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 },
  compactTimeText: { color: colors.white, fontSize: 7.5, fontWeight: '900', letterSpacing: .3 },
  copy: { padding: 14 },
  compactCopy: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 5 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  compactTopline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  category: { fontSize: 9.5, fontWeight: '900' },
  compactClock: { color: colors.subtle, fontSize: 9, fontWeight: '700' },
  location: { flex: 1, color: colors.muted, fontSize: 10, textAlign: 'right' },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  compactLocation: { flex: 1, color: colors.muted, fontSize: 9.5 },
  title: { color: colors.text, fontSize: 19, lineHeight: 23, fontWeight: '900', letterSpacing: -0.45, marginTop: 5 },
  compactTitle: { color: colors.text, fontSize: 16, lineHeight: 20, fontWeight: '900', letterSpacing: -.3, marginTop: 4 },
  social: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  compactSocial: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  socialWithAvatars: { marginLeft: 9 },
  socialText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  chevron: { marginLeft: 'auto' },
  compactArrow: { width: 27, alignItems: 'center' },
  featured: { height: 278, borderRadius: 30, overflow: 'hidden', backgroundColor: colors.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.13)', shadowColor: '#000', shadowOpacity: .3, shadowRadius: 18, shadowOffset: { width: 0, height: 9 } },
  featuredShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.38)' },
  featuredTop: { position: 'absolute', left: 15, right: 15, top: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  featuredChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(9,9,11,.78)', borderRadius: 17, paddingHorizontal: 10, paddingVertical: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.14)' },
  featuredDot: { width: 6, height: 6, borderRadius: 3 },
  featuredChipText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  featuredMetaPill: { maxWidth: '64%', backgroundColor: 'rgba(9,9,11,.72)', borderRadius: 15, paddingHorizontal: 9, paddingVertical: 6 },
  featuredMeta: { color: colors.white, fontSize: 9.5, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 8 },
  featuredBottom: { position: 'absolute', left: 19, right: 19, bottom: 18 },
  featuredTitle: { color: colors.white, fontSize: 28, lineHeight: 31, fontWeight: '900', letterSpacing: -.95 },
  featuredLocation: { color: '#EEEEF0', fontSize: 11, fontWeight: '700', marginTop: 7 },
  featuredSocial: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  featuredSocialText: { flexShrink: 1, color: colors.white, fontSize: 10.5, fontWeight: '700' },
  viewEvent: { minHeight: 38, marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.white, borderRadius: 19, paddingHorizontal: 12 },
  viewEventText: { color: colors.black, fontSize: 9, fontWeight: '900' },
});
