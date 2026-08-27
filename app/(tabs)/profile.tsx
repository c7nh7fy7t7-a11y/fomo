import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, Text } from 'react-native';
import { useApp } from '@/context/AppContext';
import { ProfileView } from '@/components/ProfileView';
import { BrandWordmark } from '@/components/BrandWordmark';
import { colors } from '@/theme/colors';

export default function ProfileScreen(){
  const {currentUser}=useApp();
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.head}><BrandWordmark width={70}/><Text style={styles.you}>YOUR PROFILE</Text></View><ProfileView personId={currentUser.id} isOwn/></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},head:{height:54,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},you:{color:colors.muted,fontSize:8.5,fontWeight:'900',letterSpacing:1}});
