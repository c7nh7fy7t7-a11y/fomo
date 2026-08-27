import { StyleSheet, View } from 'react-native';
import { Person } from '@/data/seed';
import { Avatar } from './Avatar';
import { colors } from '@/theme/colors';

export function AvatarStack({ people, size = 26, max = 4 }: { people: Person[]; size?: number; max?: number }) {
  return (
    <View style={styles.row}>
      {people.slice(0, max).map((person, index) => (
        <View key={person.id} style={{ marginLeft: index === 0 ? 0 : -8, borderRadius: size / 2, borderWidth: 2, borderColor: colors.bg }}>
          <Avatar person={person} size={size} />
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
