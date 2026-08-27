import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/Avatar';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { PressableScale } from '@/components/PressableScale';

export default function EditProfile(){
  const router=useRouter();const {currentUser,updateProfile}=useApp();
  const [name,setName]=useState(currentUser.name);const [username,setUsername]=useState(currentUser.username);const [bio,setBio]=useState(currentUser.bio??'');const [program,setProgram]=useState(currentUser.program);const [year,setYear]=useState(currentUser.year);const [saving,setSaving]=useState(false);
  const save=async()=>{if(!name.trim()||!username.trim()){Alert.alert('Missing info','Name and username are required.');return;}setSaving(true);try{await updateProfile({name:name.trim(),username:username.replace('@','').trim(),bio:bio.trim(),program:program.trim(),year:year.trim()});router.back();}catch(error:any){Alert.alert('Couldn’t save profile',friendlyErrorMessage(error,'Try again.'));}finally{setSaving(false);}};
  return <SafeAreaView style={styles.safe} edges={['top']}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={styles.head}><Pressable onPress={()=>router.back()} style={styles.round}><Ionicons name="close" color={colors.text} size={21}/></Pressable><Text style={styles.title}>Edit profile</Text><PressableScale haptic="light" onPress={save} disabled={saving} style={styles.save}><Text style={styles.saveText}>{saving?'Saving…':'Save'}</Text></PressableScale></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.avatar}><Avatar person={currentUser} size={92}/><Text style={styles.photoHint}>Change your photo from your profile.</Text></View>
      <Field label="NAME" value={name} onChangeText={setName} placeholder="Your name"/>
      <Field label="USERNAME" value={username} onChangeText={setUsername} placeholder="username" autoCapitalize="none"/>
      <View style={styles.field}><Text style={styles.label}>BIO</Text><TextInput value={bio} onChangeText={setBio} placeholder="What should campus know about you?" placeholderTextColor={colors.subtle} multiline maxLength={160} style={styles.bioInput}/><Text style={styles.counter}>{bio.length}/160</Text></View>
      <Field label="PROGRAM" value={program} onChangeText={setProgram} placeholder="Computer Science"/>
      <Field label="GRAD YEAR" value={year} onChangeText={setYear} placeholder="2028" keyboardType="number-pad"/>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
function Field(props:any){return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput {...props} placeholderTextColor={colors.subtle} style={styles.input}/></View>}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},head:{height:58,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},round:{width:38,height:38,borderRadius:19,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},title:{color:colors.text,fontSize:16,fontWeight:'900'},save:{height:36,borderRadius:18,backgroundColor:colors.accent,paddingHorizontal:14,alignItems:'center',justifyContent:'center'},saveText:{color:colors.white,fontSize:11,fontWeight:'900'},content:{padding:18,paddingBottom:40},avatar:{alignItems:'center',marginVertical:18},photoHint:{color:colors.muted,fontSize:10.5,marginTop:9},field:{marginBottom:18},label:{color:colors.muted,fontSize:9,fontWeight:'900',letterSpacing:1,marginBottom:7},input:{height:50,borderRadius:17,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,color:colors.text,paddingHorizontal:14,fontSize:13},bioInput:{minHeight:94,borderRadius:17,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,color:colors.text,paddingHorizontal:14,paddingVertical:12,fontSize:13,lineHeight:18,textAlignVertical:'top'},counter:{color:colors.subtle,fontSize:9,textAlign:'right',marginTop:5}});
