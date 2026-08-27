import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
      <View style={[styles.rule, active && styles.activeRule]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 2, paddingTop: 6, paddingBottom: 2, marginRight: 17 },
  text: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  activeText: { color: colors.text, fontWeight: '900' },
  rule: { height: 2, marginTop: 7, backgroundColor: 'transparent' },
  activeRule: { backgroundColor: colors.accent },
});
