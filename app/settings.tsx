import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';

export default function SettingsScreen() {
  const router = useRouter();
  const { currentUser, profileViewCount, signOut, demoMode } = useApp();
  const [signingOut, setSigningOut] = useState(false);

  const logOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Couldn’t log out', friendlyErrorMessage(error, 'Try again.'));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" color={colors.text} size={21} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Avatar person={currentUser} size={54} />
          <View style={styles.profileCopy}>
            <Text style={styles.profileName} numberOfLines={1}>{currentUser.name}</Text>
            <Text style={styles.profileUser} numberOfLines={1}>@{currentUser.username}</Text>
          </View>
          <View style={styles.viewsPill}>
            <Text style={styles.viewsCount}>{profileViewCount}</Text>
            <Text style={styles.viewsLabel}>views</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>BASIC</Text>
        <View style={styles.group}>
          <SettingsRow icon="person-outline" title="Edit profile" subtitle="Photo, name, bio and school details" onPress={() => router.push('/edit-profile')} />
          <SettingsRow icon="notifications-outline" title="Notifications" subtitle="Choose what FOMO sends you" onPress={() => router.push('/notification-settings')} />
          <SettingsRow icon="sparkles-outline" title="Your interests" subtitle="Tune what appears in Discover" onPress={() => router.push('/interests')} />
          <SettingsRow icon="help-circle-outline" title="Help & support" subtitle="Coming soon" last />
        </View>

        <Pressable onPress={() => router.push('/advanced-settings')} style={({ pressed }) => [styles.advanced, pressed && styles.pressed]} accessibilityRole="button">
          <View style={styles.advancedIcon}><Ionicons name="options-outline" color={colors.accent2} size={22} /></View>
          <View style={styles.advancedCopy}>
            <Text style={styles.advancedTitle}>Advanced settings</Text>
            <Text style={styles.advancedSub}>Privacy, safety and blocked accounts</Text>
          </View>
          <Ionicons name="chevron-forward" color={colors.subtle} size={18} />
        </Pressable>

        <Pressable onPress={logOut} disabled={signingOut} style={({ pressed }) => [styles.logout, pressed && styles.pressed, signingOut && styles.disabled]} accessibilityRole="button">
          <Ionicons name="log-out-outline" color={colors.danger} size={18} />
          <Text style={styles.logoutText}>{signingOut ? 'Logging out…' : demoMode ? 'Exit demo' : 'Log out'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({ icon, title, subtitle, onPress, last = false }: {
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
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, !onPress && styles.unavailableText]}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
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
  profileCard: { minHeight: 82, padding: 13, borderRadius: 23, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, flexDirection: 'row', alignItems: 'center' },
  profileCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  profileName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  profileUser: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  viewsPill: { minWidth: 58, height: 44, borderRadius: 17, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  viewsCount: { color: colors.text, fontSize: 15, fontWeight: '900' },
  viewsLabel: { color: colors.muted, fontSize: 9.5, fontWeight: '700', marginTop: 1 },
  sectionLabel: { color: colors.accent2, fontSize: 10, fontWeight: '900', letterSpacing: 1.05, marginTop: 25, marginBottom: 9, marginLeft: 4 },
  group: { borderRadius: 23, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  row: { minHeight: 72, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowUnavailable: { opacity: .72 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  rowTitle: { color: colors.text, fontSize: 13.5, fontWeight: '800' },
  unavailableText: { color: colors.muted },
  rowSub: { color: colors.muted, fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  soon: { color: colors.subtle, fontSize: 9, fontWeight: '900', letterSpacing: .7 },
  advanced: { minHeight: 78, marginTop: 14, paddingHorizontal: 13, borderRadius: 23, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: 'rgba(139,150,255,.23)', flexDirection: 'row', alignItems: 'center' },
  advancedIcon: { width: 44, height: 44, borderRadius: 19, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  advancedCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  advancedTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  advancedSub: { color: colors.muted, fontSize: 10.5, marginTop: 4 },
  logout: { height: 50, marginTop: 24, borderRadius: 21, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  logoutText: { color: colors.danger, fontSize: 12, fontWeight: '900' },
  pressed: { opacity: .72, transform: [{ scale: .99 }] },
  disabled: { opacity: .5 },
});
