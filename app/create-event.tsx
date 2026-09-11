import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { MapPressEvent, Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Privacy } from '@/data/seed';
import { categoryColor, colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { PressableScale } from '@/components/PressableScale';

const categories = ['Social', 'Study', 'Clubs', 'Sports & Rec', 'Campus Event', 'Other'];
const DEFAULT_PIN = { latitude: 52.1290, longitude: -106.6334 };
const privacyOptions: { value: Privacy; title: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'Public', title: 'Open', desc: 'Anyone on your campus can join and see the pin.', icon: 'earth-outline' },
  { value: 'Request', title: 'Request to join', desc: 'People see the area. You approve who gets the exact pin.', icon: 'hand-left-outline' },
  { value: 'Private', title: 'Invite only', desc: 'Only invited people get the exact pin.', icon: 'lock-closed-outline' },
];
const startOfToday = () => { const date = new Date(); date.setHours(0, 0, 0, 0); return date; };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const prettyDate = (date: Date) => date.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });

export default function CreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addEvent } = useApp();
  const today = useMemo(startOfToday, []);
  const maxDate = useMemo(() => { const date = new Date(today); date.setFullYear(date.getFullYear() + 1); return date; }, [today]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Social');
  const [eventDate, setEventDate] = useState(today);
  const [showAndroidDate, setShowAndroidDate] = useState(false);
  const [time, setTime] = useState('9:00 PM');
  const [location, setLocation] = useState('College Quarter');
  const [exactLocation, setExactLocation] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('Request');
  const [cover, setCover] = useState<string>();
  const [pin, setPin] = useState(DEFAULT_PIN);
  const [publishing, setPublishing] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [invalid, setInvalid] = useState({ title: false, location: false });

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: .82 });
    if (!result.canceled && result.assets[0]?.uri) setCover(result.assets[0].uri);
  };
  const movePin = (event: MapPressEvent) => setPin(event.nativeEvent.coordinate);
  const publish = async () => {
    if (publishing) return;
    const missingTitle = !title.trim();
    const missingLocation = !location.trim();
    setInvalid({ title: missingTitle, location: missingLocation });
    if (missingTitle) { Alert.alert('What are you doing?', 'Give the event a name.'); return; }
    if (missingLocation) { Alert.alert('Where is it?', 'Add a public location or area.'); return; }
    setPublishing(true);
    try {
      const event = await addEvent({
        title, category, eventDate: dateKey(eventDate), time, location, exactLocation: exactLocation || location,
        description, privacy, cover, latitude: pin.latitude, longitude: pin.longitude,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTitle(''); setCategory('Social'); setEventDate(today); setTime('9:00 PM'); setLocation('College Quarter');
      setExactLocation(''); setDescription(''); setPrivacy('Request'); setCover(undefined); setPin(DEFAULT_PIN); setInvalid({ title: false, location: false });
      router.replace({ pathname: '/(tabs)', params: { view: 'feed', posted: event.id } } as any);
    } catch (error: any) {
      Alert.alert('Couldn’t post your event', friendlyErrorMessage(error, 'Try again in a moment.'));
    } finally {
      setPublishing(false);
    }
  };

  const protectedLocation = privacy !== 'Public';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" color={colors.text} size={21} />
        </Pressable>
        <View style={styles.topbarCopy}><Text style={styles.topbarTitle}>Create event</Text><Text style={styles.topbarSub}>One screen, then it’s live.</Text></View>
        <View style={styles.draftPill}><View style={styles.draftDot} /><Text style={styles.draftText}>DRAFT</Text></View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <Text style={styles.introKicker}>MAKE SOMETHING HAPPEN</Text>
            <Text style={styles.introTitle}>Give campus a reason to show up.</Text>
            <Text style={styles.introSub}>Add the essentials now. You can manage guests and photos from the event afterward.</Text>
          </View>

          <SectionCard eyebrow="EVENT IDENTITY" title="What’s happening?" subtitle="A clear name and cover make the event easy to recognize.">
            <Text style={styles.fieldLabel}>EVENT NAME</Text>
            <TextInput
              value={title}
              onChangeText={(value) => { setTitle(value); if (invalid.title) setInvalid((current) => ({ ...current, title: false })); }}
              placeholder="Party, study sprint, pickup…"
              placeholderTextColor={colors.subtle}
              style={[styles.titleInput, invalid.title && styles.inputInvalid]}
              maxLength={70}
              returnKeyType="next"
              accessibilityLabel="Event name"
            />
            {invalid.title ? <Text style={styles.errorText}>Add an event name.</Text> : null}

            <Pressable onPress={pickCover} style={({ pressed }) => [styles.cover, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={cover ? 'Change cover photo' : 'Add cover photo'}>
              {cover
                ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                : <><View style={styles.coverIcon}><Ionicons name="image-outline" color={colors.accent2} size={25} /></View><Text style={styles.coverTitle}>Add a cover</Text><Text style={styles.coverSub}>Choose a photo that sets the vibe.</Text></>}
              {cover ? <View style={styles.coverChange}><Ionicons name="camera-outline" color={colors.white} size={15} /><Text style={styles.coverChangeText}>Change</Text></View> : null}
            </Pressable>

            <Text style={[styles.fieldLabel, styles.categoryLabel]}>CATEGORY</Text>
            <View style={styles.categoryWrap}>
              {categories.map((item) => {
                const active = category === item;
                return (
                  <PressableScale
                    key={item}
                    haptic="selection"
                    onPress={() => setCategory(item)}
                    style={[styles.category, active && styles.categoryActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: categoryColor(item) }]} />
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </SectionCard>

          <SectionCard eyebrow="DATE & TIME" title="When is it?" subtitle="Choose the date, then enter the time people should arrive.">
            {Platform.OS === 'ios' ? (
              <View style={styles.dateField}>
                <View style={styles.dateCopy}>
                  <View style={styles.fieldIcon}><Ionicons name="calendar-outline" color={colors.accent2} size={19} /></View>
                  <View style={styles.fieldCopy}><Text style={styles.rowLabel}>Event date</Text><Text style={styles.rowValue}>{prettyDate(eventDate)}</Text></View>
                </View>
                <DateTimePicker value={eventDate} mode="date" display="compact" minimumDate={today} maximumDate={maxDate} accentColor={colors.accent2} onChange={(_, selected) => selected && setEventDate(selected)} />
              </View>
            ) : (
              <Pressable onPress={() => setShowAndroidDate(true)} style={({ pressed }) => [styles.dateField, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Event date, ${prettyDate(eventDate)}`}>
                <View style={styles.dateCopy}>
                  <View style={styles.fieldIcon}><Ionicons name="calendar-outline" color={colors.accent2} size={19} /></View>
                  <View style={styles.fieldCopy}><Text style={styles.rowLabel}>Event date</Text><Text style={styles.rowValue}>{prettyDate(eventDate)}</Text></View>
                </View>
                <Ionicons name="chevron-forward" color={colors.subtle} size={17} />
              </Pressable>
            )}
            {Platform.OS === 'android' && showAndroidDate ? (
              <DateTimePicker value={eventDate} mode="date" minimumDate={today} maximumDate={maxDate} onChange={(_, selected) => { setShowAndroidDate(false); if (selected) setEventDate(selected); }} />
            ) : null}
            <Text style={styles.fieldLabel}>START TIME</Text>
            <View style={styles.inputShell}>
              <Ionicons name="time-outline" color={colors.muted} size={19} />
              <TextInput value={time} onChangeText={setTime} placeholder="9:00 PM" placeholderTextColor={colors.subtle} style={styles.input} accessibilityLabel="Start time" />
            </View>
          </SectionCard>

          <SectionCard eyebrow="LOCATION" title="Where should people go?" subtitle="The area helps people decide. The exact spot follows your privacy choice.">
            <View style={styles.locationLabelRow}><Text style={styles.fieldLabel}>PUBLIC AREA</Text><Text style={styles.visibilityTag}>EVERYONE SEES THIS</Text></View>
            <View style={[styles.inputShell, invalid.location && styles.inputInvalid]}>
              <Ionicons name="location-outline" color={colors.muted} size={19} />
              <TextInput
                value={location}
                onChangeText={(value) => { setLocation(value); if (invalid.location) setInvalid((current) => ({ ...current, location: false })); }}
                placeholder="College Quarter"
                placeholderTextColor={colors.subtle}
                style={styles.input}
                accessibilityLabel="Public event area"
              />
            </View>
            {invalid.location ? <Text style={styles.errorText}>Add a public location or area.</Text> : <Text style={styles.helper}>Use a recognizable campus area—not a private address.</Text>}

            <View style={styles.locationLabelRow}><Text style={styles.fieldLabel}>EXACT SPOT</Text><View style={styles.protectedTag}><Ionicons name={protectedLocation ? 'lock-closed' : 'earth'} color={protectedLocation ? colors.accent2 : colors.muted} size={11} /><Text style={styles.protectedTagText}>{protectedLocation ? 'PROTECTED' : 'PUBLIC'}</Text></View></View>
            <View style={styles.inputShell}>
              <Ionicons name="navigate-outline" color={colors.muted} size={19} />
              <TextInput value={exactLocation} onChangeText={setExactLocation} placeholder="Building, room, unit, or entrance" placeholderTextColor={colors.subtle} style={styles.input} accessibilityLabel="Exact event location" />
            </View>
            <Text style={styles.helper}>{protectedLocation ? 'Only approved or invited people can receive the exact spot.' : 'Open events make the exact spot visible to campus.'}</Text>

            <View style={styles.mapShell}>
              <MapView style={StyleSheet.absoluteFill} initialRegion={{ ...pin, latitudeDelta: .012, longitudeDelta: .012 }} onPress={movePin} userInterfaceStyle="dark">
                <Marker coordinate={pin} draggable onDragEnd={(event) => setPin(event.nativeEvent.coordinate)}><View style={styles.pin}><View style={styles.pinCore} /></View></Marker>
              </MapView>
              <View style={styles.mapHint}><Ionicons name="hand-left-outline" color={colors.white} size={15} /><Text style={styles.mapHintText}>Tap or drag the pin</Text></View>
            </View>
            <View style={styles.mapPrivacy}>
              <View style={styles.mapPrivacyIcon}><Ionicons name={protectedLocation ? 'shield-checkmark' : 'earth'} color={colors.accent2} size={18} /></View>
              <View style={styles.mapPrivacyCopy}><Text style={styles.mapPrivacyTitle}>{protectedLocation ? 'Exact pin protected' : 'Exact pin public'}</Text><Text style={styles.mapPrivacySub}>{protectedLocation ? 'People only see the approximate area until they’re authorized.' : 'Anyone who can view the event can see this pin.'}</Text></View>
            </View>
          </SectionCard>

          <SectionCard eyebrow="ACCESS" title="Who can come?" subtitle="Choose how people join. You can still manage guests afterward.">
            {privacyOptions.map((item) => {
              const active = privacy === item.value;
              return (
                <PressableScale
                  key={item.value}
                  haptic="selection"
                  onPress={() => setPrivacy(item.value)}
                  style={[styles.privacy, active && styles.privacyActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.privacyIcon, active && styles.privacyIconActive]}><Ionicons name={item.icon} color={active ? colors.accent2 : colors.muted} size={20} /></View>
                  <View style={styles.privacyCopy}><View style={styles.privacyTitleRow}><Text style={styles.privacyTitle}>{item.title}</Text><Text style={[styles.privacyKey, active && styles.privacyKeyActive]}>{item.value.toUpperCase()}</Text></View><Text style={styles.privacyDesc}>{item.desc}</Text></View>
                  {active ? <Ionicons name="checkmark-circle" color={colors.accent2} size={23} /> : <View style={styles.radio} />}
                </PressableScale>
              );
            })}
          </SectionCard>

          <SectionCard eyebrow="DETAILS" title="Give people the vibe" subtitle="Add anything guests should know before they show up.">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What should people know?"
              placeholderTextColor={colors.subtle}
              multiline
              style={styles.description}
              accessibilityLabel="Event description"
            />
          </SectionCard>
        </ScrollView>

        <View style={[styles.publishDock, { paddingBottom: keyboardOpen ? 8 : Math.max(insets.bottom, 10) }]}>
          <BlurView intensity={72} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
          <View style={styles.publishDockInner}>
            <View style={styles.publishCopy}><Text style={styles.publishLabel}>{privacy} event</Text><Text style={styles.publishSub} numberOfLines={1}>{title.trim() || 'Untitled event'}</Text></View>
            <PressableScale haptic="medium" onPress={publish} disabled={publishing} style={[styles.publish, publishing && styles.disabled]} accessibilityRole="button">
              <Text style={styles.publishText}>{publishing ? 'Creating…' : 'Create event'}</Text>
              <Ionicons name="arrow-forward" color={colors.white} size={18} />
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionCard({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{subtitle}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.bg },
  topbar: { height: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  topbarCopy: { flex: 1, minWidth: 0, marginLeft: 5 },
  topbarTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  topbarSub: { color: colors.muted, fontSize: 10.5, marginTop: 2 },
  draftPill: { height: 30, borderRadius: 15, paddingHorizontal: 10, backgroundColor: colors.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 5 },
  draftDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent2 },
  draftText: { color: colors.muted, fontSize: 8.5, fontWeight: '900', letterSpacing: .7 },
  content: { paddingHorizontal: 14, paddingTop: 19 },
  intro: { paddingHorizontal: 3, paddingBottom: 23 },
  introKicker: { color: colors.accent2, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.15 },
  introTitle: { color: colors.text, fontSize: 31, lineHeight: 34, fontWeight: '900', letterSpacing: -1.05, marginTop: 7, maxWidth: 340 },
  introSub: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 9, maxWidth: 340 },
  section: { marginBottom: 14, padding: 15, borderRadius: 25, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  sectionEyebrow: { color: colors.accent2, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.05 },
  sectionTitle: { color: colors.text, fontSize: 21, lineHeight: 25, fontWeight: '900', letterSpacing: -.45, marginTop: 5 },
  sectionSub: { color: colors.muted, fontSize: 11.5, lineHeight: 16, marginTop: 5 },
  sectionBody: { marginTop: 17 },
  fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: .85, marginBottom: 8 },
  titleInput: { minHeight: 60, color: colors.text, fontSize: 20, lineHeight: 25, fontWeight: '800', backgroundColor: colors.surface2, borderRadius: 19, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  inputInvalid: { borderWidth: 1, borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 10.5, fontWeight: '700', marginTop: 6, marginLeft: 3 },
  pressed: { opacity: .78, transform: [{ scale: .992 }] },
  cover: { aspectRatio: 1.78, marginTop: 14, borderRadius: 21, overflow: 'hidden', backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  coverIcon: { width: 46, height: 46, borderRadius: 19, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  coverTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  coverSub: { color: colors.muted, fontSize: 10.5, marginTop: 4 },
  coverChange: { position: 'absolute', right: 10, bottom: 10, minHeight: 44, borderRadius: 18, backgroundColor: 'rgba(9,11,14,.86)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.14)' },
  coverChangeText: { color: colors.white, fontSize: 10.5, fontWeight: '800' },
  categoryLabel: { marginTop: 18 },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { minHeight: 44, borderRadius: 20, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  categoryActive: { backgroundColor: colors.accentSoft, borderColor: 'rgba(111,125,255,.42)' },
  categoryDot: { width: 7, height: 7, borderRadius: 4 },
  categoryText: { color: colors.muted, fontSize: 11.5, fontWeight: '700' },
  categoryTextActive: { color: colors.text, fontWeight: '900' },
  dateField: { minHeight: 66, borderRadius: 20, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, marginBottom: 15 },
  dateCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  fieldIcon: { width: 40, height: 40, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  fieldCopy: { flex: 1, minWidth: 0 },
  rowLabel: { color: colors.muted, fontSize: 10.5, fontWeight: '700' },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 3 },
  inputShell: { minHeight: 54, borderRadius: 18, backgroundColor: colors.surface2, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  input: { flex: 1, minHeight: 50, color: colors.text, fontSize: 13.5, paddingVertical: 0 },
  locationLabelRow: { marginTop: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visibilityTag: { color: colors.subtle, fontSize: 8.5, fontWeight: '900', letterSpacing: .55, marginBottom: 8 },
  protectedTag: { minHeight: 26, borderRadius: 13, paddingHorizontal: 8, marginBottom: 8, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 5 },
  protectedTagText: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: .55 },
  helper: { color: colors.muted, fontSize: 10.5, lineHeight: 15, marginTop: 6, marginBottom: 16, marginLeft: 3 },
  mapShell: { height: 220, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surface2, marginTop: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  pin: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(5,5,5,.35)' },
  pinCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.black },
  mapHint: { position: 'absolute', left: 11, bottom: 11, minHeight: 36, borderRadius: 18, backgroundColor: 'rgba(5,5,5,.84)', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.14)' },
  mapHintText: { color: colors.white, fontSize: 10.5, fontWeight: '800' },
  mapPrivacy: { minHeight: 66, marginTop: 10, borderRadius: 19, backgroundColor: colors.surface2, padding: 10, flexDirection: 'row', alignItems: 'center' },
  mapPrivacyIcon: { width: 40, height: 40, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  mapPrivacyCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  mapPrivacyTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  mapPrivacySub: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  privacy: { minHeight: 82, borderRadius: 21, backgroundColor: colors.surface2, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  privacyActive: { backgroundColor: colors.accentSoft, borderColor: 'rgba(111,125,255,.38)' },
  privacyIcon: { width: 42, height: 42, borderRadius: 19, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' },
  privacyIconActive: { backgroundColor: colors.surface2 },
  privacyCopy: { flex: 1, minWidth: 0 },
  privacyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  privacyTitle: { color: colors.text, fontSize: 13.5, fontWeight: '900' },
  privacyKey: { color: colors.subtle, fontSize: 7.5, fontWeight: '900', letterSpacing: .55 },
  privacyKeyActive: { color: colors.accent2 },
  privacyDesc: { color: colors.muted, fontSize: 10.5, lineHeight: 15, marginTop: 4 },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1, borderColor: colors.line },
  description: { minHeight: 130, maxHeight: 220, borderRadius: 19, backgroundColor: colors.surface2, color: colors.text, padding: 14, fontSize: 13.5, lineHeight: 20, textAlignVertical: 'top', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  publishDock: { overflow: 'hidden', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,.13)', paddingTop: 9, paddingHorizontal: 14 },
  publishDockInner: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  publishCopy: { flex: 1, minWidth: 0, marginRight: 11 },
  publishLabel: { color: colors.accent2, fontSize: 10.5, fontWeight: '900', letterSpacing: .4 },
  publishSub: { color: colors.text, fontSize: 12.5, fontWeight: '800', marginTop: 3 },
  publish: { minWidth: 142, height: 52, borderRadius: 21, backgroundColor: colors.accent, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.18)' },
  publishText: { color: colors.white, fontSize: 12.5, fontWeight: '900' },
  disabled: { opacity: .45 },
});
