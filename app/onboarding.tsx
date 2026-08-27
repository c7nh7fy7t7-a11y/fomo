import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { BrandWordmark } from '@/components/BrandWordmark';
import { FomoInput } from '@/components/FomoInput';
import { PressableScale } from '@/components/PressableScale';
import { colors } from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { friendlyErrorMessage } from '@/utils/errors';

export default function OnboardingScreen(){
  const router=useRouter();
  const {isAuthenticated,authLoading,needsOnboarding,completeOnboarding}=useApp();
  const [name,setName]=useState('');
  const [username,setUsername]=useState('');
  const [program,setProgram]=useState('');
  const [year,setYear]=useState('');
  const [avatar,setAvatar]=useState<string>();
  const [busy,setBusy]=useState(false);

  if(!authLoading&&!isAuthenticated)return <Redirect href="/login"/>;
  if(isAuthenticated&&needsOnboarding===false&&!busy)return <Redirect href="/interests"/>;

  const pick=async()=>{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.82});if(!result.canceled&&result.assets[0]?.uri)setAvatar(result.assets[0].uri);};
  const finish=async()=>{
    setBusy(true);
    try{await completeOnboarding({name,username,program,year,avatar});router.replace('/interests');}
    catch(error:any){Alert.alert('Couldn’t finish profile',friendlyErrorMessage(error,'Check the fields and try again.'));}
    finally{setBusy(false);}
  };

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.top}><BrandWordmark width={78}/><View style={styles.verified}><Ionicons name="checkmark-circle" color={colors.success} size={15}/><Text style={styles.verifiedText}>VERIFIED</Text></View></View>
    <View style={styles.stage}><Text style={styles.kicker}>NOW MAKE IT YOURS</Text><Text style={styles.title}>Set up your profile.</Text><Text style={styles.sub}>This is the first time FOMO asks who you are. Nothing here is pre-filled with someone else’s information.</Text>
      <Pressable onPress={pick} style={styles.avatarRow}>{avatar?<Image source={{uri:avatar}} style={styles.avatar}/>:<View style={styles.avatar}><Ionicons name="person-outline" color={colors.muted} size={27}/></View>}<View style={{flex:1,marginLeft:11}}><Text style={styles.avatarTitle}>{avatar?'Photo selected':'Add profile photo'}</Text><Text style={styles.avatarSub}>Optional — you can change it later.</Text></View><Text style={styles.choose}>Choose</Text></Pressable>
      <FomoInput label="NAME" icon="person-outline" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" textContentType={Platform.OS==='ios'?'name':undefined}/>
      <FomoInput label="USERNAME" icon="at-outline" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} placeholder="Choose a username"/>
      <FomoInput label="PROGRAM" icon="school-outline" value={program} onChangeText={setProgram} placeholder="e.g. Computer Science"/>
      <FomoInput label="GRAD YEAR" icon="calendar-outline" keyboardType="number-pad" value={year} onChangeText={setYear} placeholder="e.g. 2029" maxLength={4}/>
      <PressableScale onPress={finish} haptic="light" disabled={busy||!name.trim()||!username.trim()||year.length!==4} style={[styles.primary,(busy||!name.trim()||!username.trim()||year.length!==4)&&styles.disabled]}><Text style={styles.primaryText}>{busy?'Saving…':'Continue'}</Text><Ionicons name="arrow-forward" color={colors.white} size={18}/></PressableScale>
    </View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},content:{paddingHorizontal:18,paddingBottom:42},top:{height:62,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},verified:{height:28,borderRadius:14,backgroundColor:colors.surface2,paddingHorizontal:9,flexDirection:'row',alignItems:'center',gap:5,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},verifiedText:{color:colors.muted,fontSize:8,fontWeight:'900',letterSpacing:.7},stage:{paddingTop:24},kicker:{color:colors.accent2,fontSize:9,fontWeight:'900',letterSpacing:1.1},title:{color:colors.text,fontSize:36,fontWeight:'900',letterSpacing:-1.4,marginTop:6},sub:{color:colors.muted,fontSize:12.5,lineHeight:18,marginTop:7,marginBottom:8,maxWidth:355},avatarRow:{height:74,borderRadius:22,backgroundColor:colors.surface,padding:10,flexDirection:'row',alignItems:'center',marginTop:18,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},avatar:{width:52,height:52,borderRadius:19,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},avatarTitle:{color:colors.text,fontSize:12,fontWeight:'800'},avatarSub:{color:colors.muted,fontSize:9.5,marginTop:2},choose:{color:colors.text,fontSize:10,fontWeight:'800'},primary:{height:54,borderRadius:20,backgroundColor:colors.accent,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,marginTop:25},primaryText:{color:colors.white,fontSize:12.5,fontWeight:'900'},disabled:{opacity:.3}});
