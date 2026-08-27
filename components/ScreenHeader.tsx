import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export function ScreenHeader({ title, eyebrow, right }: { title: string; eyebrow?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  title: { color: colors.text, fontSize: 30, lineHeight: 34, fontWeight: '900', letterSpacing: -1.2 },
});
