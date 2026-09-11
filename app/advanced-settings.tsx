import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';

export default function AdvancedSettingsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" color={colors.text} size={21} />
        </Pressable>
        <Text style={styles.headerTitle}>Advanced settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.introIcon}><Ionicons name="shield-checkmark-outline" color={colors.accent2} size={25} /></View>
          <Text style={styles.introTitle}>Your safety controls</Text>
          <Text style={styles.introSub}>Manage the controls that affect who can interact with you.</Text>
        </View>

        <Text style={styles.sectionLabel}>PRIVACY & SAFETY</Text>
        <View style={styles.group}>
          <AdvancedRow icon="ban-outline" title="Blocked users" subtitle="Review and unblock accounts" onPress={() => router.push('/blocked-users')} />
          <AdvancedRow icon="lock-closed-outline" title="Privacy & safety" subtitle="More controls coming soon" last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AdvancedRow({ icon, title, subtitle, onPress, last = false }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed, !onPress && styles.rowUnavailable]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.rowIcon}><Ionicons name={icon} color={onPress ? colors.text : colors.subtle} size={19} /></View>
      <View style={styles.rowCopy}><Text style={[styles.rowTitle, !onPress && styles.unavailableText]}>{title}</Text><Text style={styles.rowSub}>{subtitle}</Text></View>
      {onPress ? <Ionicons name="chevron-forward" color={colors.subtle} size={17} /> : <Text style={styles.soon}>SOON</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { height: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  headerSpacer: { width: 44, height: 44 },
  content: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 30 },
  intro: { padding: 18, borderRadius: 25, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  introIcon: { width: 48, height: 48, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  introTitle: { color: colors.text, fontSize: 22, lineHeight: 26, fontWeight: '900', letterSpacing: -.5, marginTop: 15 },
  introSub: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 6, maxWidth: 310 },
  sectionLabel: { color: colors.accent2, fontSize: 10, fontWeight: '900', letterSpacing: 1.05, marginTop: 25, marginBottom: 9, marginLeft: 4 },
  group: { borderRadius: 23, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  row: { minHeight: 74, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowUnavailable: { opacity: .72 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  rowTitle: { color: colors.text, fontSize: 13.5, fontWeight: '800' },
  unavailableText: { color: colors.muted },
  rowSub: { color: colors.muted, fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  soon: { color: colors.subtle, fontSize: 9, fontWeight: '900', letterSpacing: .7 },
  pressed: { opacity: .72, transform: [{ scale: .99 }] },
});
