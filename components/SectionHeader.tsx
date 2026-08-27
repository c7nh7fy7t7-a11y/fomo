import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.45 },
  meta: { color: colors.muted, fontSize: 11, fontWeight: '700' },
});
