import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { ProfileView } from '@/components/ProfileView';
import { BrandWordmark } from '@/components/BrandWordmark';
import { colors } from '@/theme/colors';

export default function ProfileScreen(){
  const router=useRouter(); const {currentUser}=useApp();
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.head}><BrandWordmark width={70}/><Pressable onPress={()=>router.push('/settings')} style={styles.settings} accessibilityRole="button" accessibilityLabel="Open settings"><Ionicons name="settings-outline" color={colors.text} size={21}/></Pressable></View><ProfileView personId={currentUser.id} isOwn/></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},head:{height:54,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},settings:{width:44,height:44,borderRadius:22,backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,alignItems:'center',justifyContent:'center'}});
