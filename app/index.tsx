import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandWordmark } from '@/components/BrandWordmark';
import { GlassSurface } from '@/components/GlassSurface';
import { PressableScale } from '@/components/PressableScale';
import { colors } from '@/theme/colors';
import { demoEnabled, useApp } from '@/context/AppContext';

export default function WelcomeScreen(){
  const router=useRouter();const {backendConfigured,isAuthenticated,authLoading,needsOnboarding,enterDemoMode}=useApp();
  if(authLoading||(isAuthenticated&&needsOnboarding===null))return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator color={colors.accent2}/></View></SafeAreaView>;
  if(isAuthenticated)return <Redirect href={needsOnboarding?'/onboarding':'/(tabs)'}/>;
  return <SafeAreaView style={styles.safe}>
    <View pointerEvents="none" style={styles.orbA}/><View pointerEvents="none" style={styles.orbB}/>
    <View style={styles.logo}><BrandWordmark width={112}/><View style={[styles.liveDot,{backgroundColor:backendConfigured?colors.success:colors.warning}]}/></View>
    <View style={styles.hero}><Text style={styles.eyebrow}>UNIVERSITY, LIVE.</Text><Text style={styles.headline}>Find what’s happening. Be there.</Text><Text style={styles.deck}>Parties, study sessions, clubs, sports and the people actually going.</Text>
      <GlassSurface style={styles.preview} intensity={54}><View style={styles.previewOrb}><Ionicons name="location" color={colors.white} size={18}/></View><View style={{flex:1}}><Text style={styles.previewKicker}>HAPPENING SOON</Text><Text style={styles.previewTitle}>Friday night</Text><Text style={styles.previewSub}>82 going · 7 friends in</Text></View><Ionicons name="arrow-forward" color={colors.text} size={18}/></GlassSurface>
    </View>
    <View style={styles.bottom}><PressableScale onPress={()=>router.push('/signup')} haptic="light" style={styles.primary}><Text style={styles.primaryText}>Create account</Text><View style={styles.primaryArrow}><Ionicons name="arrow-forward" color={colors.white} size={17}/></View></PressableScale><PressableScale onPress={()=>router.push('/login')} style={styles.secondary}><Text style={styles.secondaryText}>Log in</Text></PressableScale>{demoEnabled?<PressableScale onPress={()=>{enterDemoMode();router.replace('/(tabs)');}} style={styles.demo}><Text style={styles.demoText}>Explore demo</Text></PressableScale>:null}</View>
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg,paddingHorizontal:18,overflow:'hidden'},orbA:{position:'absolute',right:-130,top:110,width:330,height:330,borderRadius:165,backgroundColor:colors.accentGlow,opacity:.48},orbB:{position:'absolute',left:-150,bottom:80,width:280,height:280,borderRadius:140,backgroundColor:'rgba(255,255,255,.035)'},logo:{paddingTop:18,flexDirection:'row',alignItems:'center',gap:9},liveDot:{width:7,height:7,borderRadius:4},hero:{flex:1,justifyContent:'center',paddingBottom:10},eyebrow:{color:colors.accent2,fontSize:9,fontWeight:'900',letterSpacing:1.4},headline:{color:colors.text,fontSize:44,lineHeight:45,fontWeight:'900',letterSpacing:-2,marginTop:9,maxWidth:365},deck:{color:colors.muted,fontSize:13,lineHeight:19,marginTop:13,maxWidth:335},preview:{height:82,borderRadius:25,marginTop:29,paddingHorizontal:13,flexDirection:'row',alignItems:'center'},previewOrb:{width:45,height:45,borderRadius:17,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',marginRight:11},previewKicker:{color:colors.accent2,fontSize:7.5,fontWeight:'900',letterSpacing:.9},previewTitle:{color:colors.text,fontSize:13.5,fontWeight:'900',marginTop:1},previewSub:{color:colors.muted,fontSize:10.5,marginTop:2},bottom:{paddingBottom:14},primary:{height:56,borderRadius:21,backgroundColor:colors.accent,paddingHorizontal:17,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.21)'},primaryText:{color:colors.white,fontSize:13,fontWeight:'900'},primaryArrow:{width:32,height:32,borderRadius:13,backgroundColor:'rgba(0,0,0,.16)',alignItems:'center',justifyContent:'center'},secondary:{height:50,borderRadius:20,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center',marginTop:9,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},secondaryText:{color:colors.text,fontSize:12,fontWeight:'800'},demo:{alignItems:'center',paddingVertical:12},demoText:{color:colors.muted,fontSize:10.5,fontWeight:'700'},loading:{flex:1,alignItems:'center',justifyContent:'center'}});
