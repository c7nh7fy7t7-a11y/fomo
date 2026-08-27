import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Person, VerificationType } from '@/data/seed';
import { colors } from '@/theme/colors';

/** Small FOMO-specific verification seal: neutral shell + warm coral check. */
export function VerifiedBadge({person,type,size=14}:{person?:Person;type?:VerificationType;size?:number}){
  const verification=type??person?.verificationType;
  if(!verification)return null;
  const shell=size+2;
  return <View accessibilityLabel={`${verification} verified`} style={[styles.seal,{width:shell,height:shell,borderRadius:shell/2},verification==='organizer'&&styles.organizer]}><Ionicons name="checkmark" size={Math.max(8,size-4)} color={verification==='organizer'?colors.success:colors.accent2}/></View>;
}
const styles=StyleSheet.create({seal:{alignItems:'center',justifyContent:'center',backgroundColor:colors.surface3,borderWidth:1,borderColor:colors.highlight},organizer:{backgroundColor:'rgba(120,215,167,.10)'}});
