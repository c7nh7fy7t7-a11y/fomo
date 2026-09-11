import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { InterestKey } from '@/data/seed';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';

const options:{key:InterestKey;label:string;icon:keyof typeof Ionicons.glyphMap}[]=[
 {key:'parties',label:'Parties',icon:'sparkles-outline'},{key:'sports',label:'Sports',icon:'football-outline'},
 {key:'clubs',label:'Clubs',icon:'megaphone-outline'},{key:'study',label:'Study',icon:'book-outline'},
 {key:'campus',label:'Campus events',icon:'school-outline'},{key:'music',label:'Live music',icon:'musical-notes-outline'},
 {key:'social',label:'Social',icon:'people-outline'},{key:'gaming',label:'Gaming',icon:'game-controller-outline'},
];
export default function InterestsScreen(){
 const router=useRouter(); const {isAuthenticated,authLoading,needsOnboarding,interests,saveInterests}=useApp();
 const [selected,setSelected]=useState<InterestKey[]>(interests); const [busy,setBusy]=useState(false);
 const count=selected.length; const subtitle=useMemo(()=>count?`${count} selected · you can change this later`:'Pick a few so Discover starts useful.',[count]);
 if(!authLoading&&!isAuthenticated)return <Redirect href="/login"/>;
 if(isAuthenticated&&needsOnboarding===true)return <Redirect href="/onboarding"/>;
 const toggle=(key:InterestKey)=>{setSelected(cur=>cur.includes(key)?cur.filter(x=>x!==key):[...cur,key]);Haptics.selectionAsync().catch(()=>{});};
 const finish=async(skip=false)=>{setBusy(true);try{await saveInterests(skip?[]:selected);router.replace('/(tabs)');}catch(e:any){Alert.alert('Couldn’t save interests',e?.message??'Try again.');}finally{setBusy(false);}};
 return <SafeAreaView style={styles.safe}><View style={styles.wrap}>
  <View><Text style={styles.kicker}>MAKE DISCOVER YOURS</Text><Text style={styles.title}>What are you into?</Text><Text style={styles.sub}>{subtitle}</Text></View>
  <View style={styles.grid}>{options.map(o=>{const active=selected.includes(o.key);return <Pressable key={o.key} onPress={()=>toggle(o.key)} style={({pressed})=>[styles.card,active&&styles.cardActive,pressed&&styles.cardPressed]}><Ionicons name={o.icon} color={active?colors.white:colors.muted} size={24}/><Text style={[styles.label,active&&styles.labelActive]}>{o.label}</Text>{active?<Ionicons name="checkmark-circle" color={colors.accent2} size={18} style={styles.check}/>:null}</Pressable>})}</View>
  <View style={styles.bottom}><Pressable onPress={()=>finish(true)} disabled={busy} style={styles.skip}><Text style={styles.skipText}>Skip</Text></Pressable><Pressable onPress={()=>finish(false)} disabled={busy} style={styles.continue}><Text style={styles.continueText}>{busy?'Saving…':'Continue'}</Text><Ionicons name="arrow-forward" color={colors.white} size={18}/></Pressable></View>
 </View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},wrap:{flex:1,padding:20,paddingTop:48},kicker:{color:colors.accent2,fontSize:9,fontWeight:'900',letterSpacing:1.2},title:{color:colors.text,fontSize:38,lineHeight:41,fontWeight:'900',letterSpacing:-1.5,marginTop:7},sub:{color:colors.muted,fontSize:12,marginTop:8},grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:30},card:{width:'48.4%',height:105,borderRadius:23,backgroundColor:colors.surface,padding:15,justifyContent:'space-between',borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},cardActive:{backgroundColor:colors.accentSoft,borderColor:'rgba(111,125,255,.42)'},cardPressed:{transform:[{scale:.972}],opacity:.86},label:{color:colors.muted,fontSize:13,fontWeight:'800'},labelActive:{color:colors.text},check:{position:'absolute',right:11,top:11},bottom:{marginTop:'auto',flexDirection:'row',gap:10,paddingBottom:10},skip:{height:52,paddingHorizontal:22,borderRadius:26,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface2},skipText:{color:colors.muted,fontWeight:'800'},continue:{flex:1,height:52,borderRadius:20,backgroundColor:colors.accent,alignItems:'center',justifyContent:'space-between',flexDirection:'row',paddingHorizontal:18},continueText:{color:colors.white,fontWeight:'900'}});
