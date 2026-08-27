import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BrandWordmark } from '@/components/BrandWordmark';
import { PressableScale } from '@/components/PressableScale';
import { FomoInput } from '@/components/FomoInput';
import { colors } from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { friendlyErrorMessage } from '@/utils/errors';

export default function SignupScreen(){
  const router=useRouter(); const {backendConfigured,signUp}=useApp();
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [confirmPassword,setConfirmPassword]=useState(''); const [busy,setBusy]=useState(false);
  const createAccount=async()=>{const normalized=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))return Alert.alert('Check your email','Enter a valid email address.');if(password.length<8)return Alert.alert('Password too short','Use at least 8 characters.');if(password!==confirmPassword)return Alert.alert('Passwords don’t match','Make sure both password boxes are the same.');setBusy(true);try{const result=await signUp({email:normalized,password});if(result.needsEmailConfirmation){router.replace({pathname:'/verify-email',params:{email:normalized}});return;}router.replace(result.needsOnboarding?'/onboarding':'/(tabs)');}catch(error:any){Alert.alert('Couldn’t create account',friendlyErrorMessage(error,'Try again.'));}finally{setBusy(false);}};
  const disabled=!backendConfigured||busy;
  return <SafeAreaView style={styles.safe}><View pointerEvents="none" style={styles.orb}/><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={styles.top}><PressableScale onPress={()=>router.back()} style={styles.back} haptic="selection"><Ionicons name="arrow-back" color={colors.text} size={20}/></PressableScale><BrandWordmark width={74}/><View style={{width:40}}/></View>
    <View style={styles.content}><Text style={styles.kicker}>CREATE ACCOUNT</Text><Text style={styles.title}>Get in before you miss it.</Text><Text style={styles.sub}>Start with email and password. After verification, you’ll set your name, username and profile.</Text>
      <FomoInput label="EMAIL" icon="mail-outline" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" textContentType={Platform.OS==='ios'?'username':undefined} autoComplete={Platform.OS==='ios'?undefined:'username'} returnKeyType="next"/>
      <FomoInput label="PASSWORD" icon="lock-closed-outline" secureToggle autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword} placeholder="At least 8 characters" textContentType={Platform.OS==='ios'?'newPassword':undefined} autoComplete={Platform.OS==='ios'?undefined:'new-password'} returnKeyType="next"/>
      <FomoInput label="CONFIRM PASSWORD" icon="shield-checkmark-outline" secureToggle autoCapitalize="none" autoCorrect={false} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Type it again" textContentType={Platform.OS==='ios'?'newPassword':undefined} autoComplete={Platform.OS==='ios'?undefined:'new-password'} returnKeyType="go" onSubmitEditing={createAccount}/>
      {!backendConfigured?<Text style={styles.warn}>Supabase isn’t connected on this copy.</Text>:null}
      <PressableScale onPress={createAccount} disabled={disabled} haptic="light" style={[styles.primary,disabled&&styles.disabled]}><Text style={styles.primaryText}>{busy?'Creating…':'Create account'}</Text><View style={styles.arrow}><Ionicons name="arrow-forward" color={colors.white} size={17}/></View></PressableScale>
      <PressableScale onPress={()=>router.replace('/login')} style={styles.link}><Text style={styles.linkText}>Already have an account? <Text style={styles.linkAccent}>Log in</Text></Text></PressableScale>
    </View>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg,overflow:'hidden'},orb:{position:'absolute',left:-130,top:160,width:310,height:310,borderRadius:155,backgroundColor:colors.accentGlow,opacity:.46},top:{height:60,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:40,height:40,borderRadius:16,backgroundColor:colors.glassSoft,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},content:{flex:1,justifyContent:'center',paddingHorizontal:20,paddingBottom:40},kicker:{color:colors.accent2,fontSize:9,fontWeight:'900',letterSpacing:1.3,marginBottom:7},title:{color:colors.text,fontSize:36,lineHeight:39,fontWeight:'900',letterSpacing:-1.4,maxWidth:350},sub:{color:colors.muted,fontSize:12.3,lineHeight:18,marginTop:8,marginBottom:2,maxWidth:350},warn:{color:colors.warning,fontSize:10,marginTop:10},primary:{height:56,borderRadius:21,backgroundColor:colors.accent,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:17,marginTop:22,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.22)'},primaryText:{color:colors.white,fontSize:12.5,fontWeight:'900'},arrow:{width:32,height:32,borderRadius:13,backgroundColor:'rgba(0,0,0,.16)',alignItems:'center',justifyContent:'center'},disabled:{opacity:.35},link:{alignItems:'center',paddingVertical:18},linkText:{color:colors.muted,fontSize:11,fontWeight:'700'},linkAccent:{color:colors.text,fontWeight:'900'}});
