import { Image, StyleSheet, Text, View } from 'react-native';
import { Person } from '@/data/seed';
import { colors } from '@/theme/colors';

export function Avatar({ person, size = 42 }: { person: Person; size?: number }) {
  const frame={width:size,height:size,borderRadius:size*.38};
  if (person.avatar) return <View style={[styles.frame,frame]}><Image source={{ uri: person.avatar }} style={[StyleSheet.absoluteFill,{borderRadius:size*.38,backgroundColor:colors.surface2}]} /></View>;
  return <View style={[styles.fallback,styles.frame,frame]}><Text style={[styles.initials, { fontSize: Math.max(12, size * 0.30) }]}>{person.initials}</Text></View>;
}
const styles = StyleSheet.create({
  frame:{overflow:'hidden',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.13)',backgroundColor:colors.surface2},
  fallback:{alignItems:'center',justifyContent:'center',backgroundColor:colors.surface3},
  initials:{color:colors.text,fontWeight:'900',letterSpacing:-.3},
});
