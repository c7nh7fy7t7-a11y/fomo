import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BrandWordmark } from '@/components/BrandWordmark';
import { colors } from '@/theme/colors';
import { PressableScale } from '@/components/PressableScale';

export default function VerifyEmailScreen(){
  const router=useRouter();
  const params=useLocalSearchParams<{email?:string}>();
  const email=typeof params.email==='string'?params.email:'';
  return <SafeAreaView style={styles.safe}>
    <View style={styles.top}><BrandWordmark width={78}/></View>
    <View style={styles.content}>
      <View style={styles.icon}><Ionicons name="mail-outline" color={colors.accent2} size={30}/></View>
      <Text style={styles.kicker}>ONE QUICK STEP</Text>
      <Text style={styles.title}>Check your email.</Text>
      <Text style={styles.body}>We sent a verification link{email?` to ${email}`:''}. Verify the account first, then come back to FOMO. Your name, username and profile setup happen after verification.</Text>
      <PressableScale haptic="light" onPress={()=>router.replace({pathname:'/login',params:{email}})} style={styles.primary}><Text style={styles.primaryText}>I’ve verified — log in</Text><Ionicons name="arrow-forward" color={colors.white} size={18}/></PressableScale>
      <Pressable onPress={()=>router.replace('/signup')} style={styles.secondary}><Text style={styles.secondaryText}>Use a different email</Text></Pressable>
    </View>
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg,paddingHorizontal:20},top:{width:'100%',maxWidth:480,alignSelf:'center',height:64,justifyContent:'center'},content:{flex:1,width:'100%',maxWidth:480,alignSelf:'center',justifyContent:'center',paddingBottom:70},icon:{width:62,height:62,borderRadius:31,backgroundColor:colors.accentSoft,alignItems:'center',justifyContent:'center',marginBottom:20},kicker:{color:colors.accent2,fontSize:9,fontWeight:'900',letterSpacing:1.2},title:{color:colors.text,fontSize:36,fontWeight:'900',letterSpacing:-1.35,marginTop:7},body:{color:colors.muted,fontSize:12.5,lineHeight:19,marginTop:10,maxWidth:355},primary:{height:54,borderRadius:27,backgroundColor:colors.accent,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,marginTop:28},primaryText:{color:colors.white,fontSize:12.5,fontWeight:'900'},secondary:{height:46,alignItems:'center',justifyContent:'center',marginTop:7},secondaryText:{color:colors.muted,fontSize:10.5,fontWeight:'800'}});
