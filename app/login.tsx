import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandWordmark } from '@/components/BrandWordmark';
import { PressableScale } from '@/components/PressableScale';
import { FomoInput } from '@/components/FomoInput';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';

export default function LoginScreen(){
  const router=useRouter(); const params=useLocalSearchParams<{email?:string}>(); const {backendConfigured,signIn}=useApp();
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false);
  useEffect(()=>{if(typeof params.email==='string'&&!email)setEmail(params.email);},[params.email]);
  const login=async()=>{if(!email.trim()||!password)return;setBusy(true);try{const result=await signIn(email,password);router.replace(result.needsOnboarding?'/onboarding':'/(tabs)');}catch(error:any){Alert.alert('Couldn’t log in',friendlyErrorMessage(error,'Check your email and password.'));}finally{setBusy(false);}};
  const disabled=!backendConfigured||busy||!email.trim()||!password;
  return <SafeAreaView style={styles.safe}><View pointerEvents="none" style={styles.orb}/><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={styles.top}><PressableScale onPress={()=>router.back()} style={styles.back} haptic="selection"><Ionicons name="arrow-back" color={colors.text} size={20}/></PressableScale><BrandWordmark width={74}/><View style={{width:40}}/></View>
    <View style={styles.content}><Text style={styles.kicker}>WELCOME BACK</Text><Text style={styles.title}>Back to what’s happening.</Text><Text style={styles.sub}>Log in and FOMO will pick up right where you left off.</Text>
      <FomoInput label="EMAIL" icon="mail-outline" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" textContentType={Platform.OS==='ios'?'username':undefined} autoComplete={Platform.OS==='ios'?undefined:'username'} returnKeyType="next"/>
      <FomoInput label="PASSWORD" icon="lock-closed-outline" secureToggle value={password} onChangeText={setPassword} placeholder="Your password" autoCapitalize="none" autoCorrect={false} textContentType={Platform.OS==='ios'?'password':undefined} autoComplete={Platform.OS==='ios'?undefined:'current-password'} returnKeyType="go" onSubmitEditing={login}/>
      {!backendConfigured?<Text style={styles.warn}>Supabase isn’t connected on this copy.</Text>:null}
      <PressableScale onPress={login} disabled={disabled} haptic="light" style={[styles.primary,disabled&&styles.disabled]}><Text style={styles.primaryText}>{busy?'Logging in…':'Log in'}</Text><View style={styles.arrow}><Ionicons name="arrow-forward" color={colors.white} size={17}/></View></PressableScale>
      <Text style={styles.autofill}>Apple Password AutoFill stays enabled. FOMO never stores your password inside the app.</Text>
      <PressableScale onPress={()=>router.replace('/signup')} style={styles.link}><Text style={styles.linkText}>New here? <Text style={styles.linkAccent}>Create an account</Text></Text></PressableScale>
    </View>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg,overflow:'hidden'},orb:{position:'absolute',right:-120,top:70,width:300,height:300,borderRadius:150,backgroundColor:colors.accentGlow,opacity:.55},top:{height:60,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:40,height:40,borderRadius:16,backgroundColor:colors.glassSoft,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},content:{flex:1,justifyContent:'center',paddingHorizontal:20,paddingBottom:52},kicker:{color:colors.accent2,fontSize:9,fontWeight:'900',letterSpacing:1.3,marginBottom:7},title:{color:colors.text,fontSize:38,lineHeight:40,fontWeight:'900',letterSpacing:-1.5,maxWidth:350},sub:{color:colors.muted,fontSize:12.5,lineHeight:18,marginTop:9,marginBottom:7,maxWidth:330},warn:{color:colors.warning,fontSize:10,marginTop:12},primary:{height:56,borderRadius:21,backgroundColor:colors.accent,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:17,marginTop:24,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.22)'},primaryText:{color:colors.white,fontSize:12.5,fontWeight:'900'},arrow:{width:32,height:32,borderRadius:13,backgroundColor:'rgba(0,0,0,.16)',alignItems:'center',justifyContent:'center'},disabled:{opacity:.35},autofill:{color:colors.subtle,fontSize:9.5,lineHeight:14,textAlign:'center',marginTop:13,paddingHorizontal:12},link:{alignItems:'center',paddingVertical:17},linkText:{color:colors.muted,fontSize:11,fontWeight:'700'},linkAccent:{color:colors.text,fontWeight:'900'}});
