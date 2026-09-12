import { Image, StyleSheet, Text, View } from 'react-native';
import { Person } from '@/data/seed';
import { colors } from '@/theme/colors';

export function Avatar({ person, size = 42, circular = false }: { person: Person; size?: number; circular?: boolean }) {
  const borderRadius=circular?size/2:size*.38;
  const frame={width:size,height:size,borderRadius};
  if (person.avatar) return <View style={[styles.frame,frame]}><Image source={{ uri: person.avatar }} resizeMode="cover" style={[StyleSheet.absoluteFill,{borderRadius,backgroundColor:colors.surface2}]} /></View>;
  return <View style={[styles.fallback,styles.frame,frame]}><Text style={[styles.initials, { fontSize: Math.max(12, size * 0.30) }]}>{person.initials}</Text></View>;
}
const styles = StyleSheet.create({
  frame:{overflow:'hidden',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.13)',backgroundColor:colors.surface2},
  fallback:{alignItems:'center',justifyContent:'center',backgroundColor:colors.surface3},
  initials:{color:colors.text,fontWeight:'900',letterSpacing:-.3},
});
