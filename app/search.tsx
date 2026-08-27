import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { EventCard } from '@/components/EventCard';
import { GlassSurface } from '@/components/GlassSurface';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';

const tabs=['PEOPLE','EVENTS','CLUBS'] as const;
const filters=['All','Today','This week','Parties','Sports','Study','Clubs','Campus','Music','Other'] as const;
const lower=(v?:string)=>String(v??'').toLowerCase();
export default function SearchScreen(){
 const router=useRouter(); const {people,events,organizers,followingIds,followerIds,friendIds,currentUser,toggleFollow}=useApp();
 const [tab,setTab]=useState<(typeof tabs)[number]>('PEOPLE'); const [q,setQ]=useState(''); const [filter,setFilter]=useState<(typeof filters)[number]>('All'); const [busyId,setBusyId]=useState<string>();
 const query=lower(q.trim());
 const personResults=useMemo(()=>people.filter(p=>p.id!==currentUser.id&&(!query||[p.name,p.username,p.program].some(v=>lower(v).includes(query)))),[people,currentUser.id,query]);
 const eventResults=useMemo(()=>events.filter(e=>{
  const match=!query||[e.title,e.category,e.location,people.find(p=>p.id===e.hostId)?.name,organizers.find(o=>o.profileId===e.hostId)?.displayName].some(v=>lower(v).includes(query)); if(!match)return false;
  const now=new Date(); const d=new Date(`${e.eventDate}T12:00:00`); const days=(d.getTime()-new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime())/86400000;
  if(filter==='Today')return Math.floor(days)===0; if(filter==='This week')return days>=0&&days<=7;
  if(filter==='Parties')return /social|party/i.test(e.category); if(filter==='Sports')return /sport/i.test(e.category); if(filter==='Study')return /study/i.test(e.category);
  if(filter==='Clubs')return /club/i.test(e.category); if(filter==='Campus')return /campus/i.test(e.category); if(filter==='Music')return /music/i.test(e.category);
  if(filter==='Other')return !/(social|party|sport|study|club|campus|music)/i.test(e.category); return true;
 }),[events,people,organizers,query,filter]);
 const organizerResults=useMemo(()=>organizers.filter(o=>!query||[o.displayName,o.handle,o.bio].some(v=>lower(v).includes(query))),[organizers,query]);
 const relation=(id:string)=>followingIds.includes(id)&&followerIds.includes(id)?'Friends':followingIds.includes(id)?'Following':followerIds.includes(id)?'Follow Back':'Follow';
 return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.head}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" color={colors.text} size={21}/></Pressable><GlassSurface style={styles.search} intensity={56}><Ionicons name="search" color={colors.muted} size={18}/><TextInput autoFocus value={q} onChangeText={setQ} placeholder="People, events, clubs…" placeholderTextColor={colors.subtle} style={styles.input} autoCapitalize="none"/></GlassSurface></View>
  <View style={styles.tabs}>{tabs.map(t=><Pressable key={t} onPress={()=>setTab(t)} style={styles.tab}><Text style={[styles.tabText,tab===t&&styles.active]}>{t}</Text>{tab===t?<View style={styles.rule}/>:null}</Pressable>)}</View>
  {tab==='EVENTS'?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{filters.map(f=><Pressable key={f} onPress={()=>setFilter(f)} style={[styles.chip,filter===f&&styles.chipActive]}><Text style={[styles.chipText,filter===f&&styles.chipTextActive]}>{f}</Text></Pressable>)}</ScrollView>:null}
  <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
   {tab==='PEOPLE'?personResults.length?personResults.map(p=><Pressable key={p.id} onPress={()=>router.push(`/profile/${p.id}`)} style={styles.row}><Avatar person={p} size={48}/><View style={styles.copy}><View style={styles.nameLine}><Text style={styles.name}>{p.name}</Text><VerifiedBadge person={p} size={14}/></View><Text style={styles.meta}>@{p.username}{p.program?` · ${p.program}`:''}</Text>{friendIds.includes(p.id)?<Text style={styles.mutual}>Already friends</Text>:null}</View><Pressable disabled={busyId===p.id} onPress={async()=>{setBusyId(p.id);try{await toggleFollow(p.id);}finally{setBusyId(undefined);}}} style={styles.state}><Text style={styles.stateText}>{busyId===p.id?'…':relation(p.id)}</Text></Pressable></Pressable>):<Empty text="No people found."/>:null}
   {tab==='EVENTS'?eventResults.length?eventResults.map(e=><EventCard key={e.id} event={e} people={people} friendIds={friendIds}/>):<Empty text="No events found."/>:null}
   {tab==='CLUBS'?organizerResults.length?organizerResults.map(o=>{const p=people.find(x=>x.id===o.profileId);return <Pressable key={o.profileId} onPress={()=>router.push(`/profile/${o.profileId}`)} style={styles.row}>{p?<Avatar person={p} size={48}/>:<View style={styles.orgAvatar}><Ionicons name="megaphone" color={colors.accent2} size={19}/></View>}<View style={styles.copy}><View style={styles.nameLine}><Text style={styles.name}>{o.displayName}</Text><VerifiedBadge type={o.verificationType} size={14}/></View><Text style={styles.meta}>@{o.handle}</Text>{o.bio?<Text numberOfLines={1} style={styles.mutual}>{o.bio}</Text>:null}</View><Ionicons name="chevron-forward" color={colors.subtle} size={17}/></Pressable>}):<Empty text="No clubs or organizers yet."/>:null}
  </ScrollView>
 </SafeAreaView>;
}
function Empty({text}:{text:string}){return <View style={styles.empty}><Ionicons name="search-outline" color={colors.subtle} size={30}/><Text style={styles.emptyText}>{text}</Text></View>}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},head:{height:62,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8},back:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},search:{flex:1,height:46,borderRadius:20,flexDirection:'row',alignItems:'center',paddingHorizontal:13,gap:8,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},input:{flex:1,color:colors.text,fontSize:13},tabs:{height:43,flexDirection:'row',paddingHorizontal:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},tab:{flex:1,alignItems:'center',justifyContent:'center'},tabText:{color:colors.muted,fontSize:9.5,fontWeight:'900',letterSpacing:.7},active:{color:colors.text},rule:{position:'absolute',bottom:-1,height:3,width:30,borderRadius:2,backgroundColor:colors.accent},filters:{paddingHorizontal:12,paddingVertical:9,gap:7},chip:{height:31,borderRadius:16,paddingHorizontal:12,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface},chipActive:{backgroundColor:colors.accentSoft,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,107,87,.28)'},chipText:{color:colors.muted,fontSize:9.5,fontWeight:'800'},chipTextActive:{color:colors.text},content:{padding:12,paddingBottom:70},row:{minHeight:67,borderRadius:20,backgroundColor:colors.surface,marginBottom:7,paddingHorizontal:11,flexDirection:'row',alignItems:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},copy:{flex:1,marginLeft:10,minWidth:0},nameLine:{flexDirection:'row',alignItems:'center',gap:5},name:{color:colors.text,fontSize:12.5,fontWeight:'900'},meta:{color:colors.muted,fontSize:9.5,marginTop:2},mutual:{color:colors.subtle,fontSize:8.5,marginTop:3},state:{height:30,borderRadius:15,paddingHorizontal:10,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface2},stateText:{color:colors.text,fontSize:8.5,fontWeight:'900'},orgAvatar:{width:48,height:48,borderRadius:24,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},empty:{height:240,alignItems:'center',justifyContent:'center',gap:9},emptyText:{color:colors.muted,fontSize:12}});
