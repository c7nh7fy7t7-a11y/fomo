import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { GlassSurface } from '@/components/GlassSurface';
import { PressableScale } from '@/components/PressableScale';

const modes=['discover','followers','following','friends'] as const;
type Mode=(typeof modes)[number];

export default function PeopleScreen(){
  const router=useRouter(); const params=useLocalSearchParams<{profileId?:string;mode?:string}>();
  const {currentUser,people,events,followingIds,followerIds,friendIds,toggleFollow,loadProfileFollowLists}=useApp();
  const targetId=params.profileId||currentUser.id; const requestedMode=(modes.includes(params.mode as Mode)?params.mode:'discover') as Mode;
  const [mode,setMode]=useState<Mode>(requestedMode); const [search,setSearch]=useState('');
  const [lists,setLists]=useState({followers:[] as string[],following:[] as string[],friends:[] as string[]});
  const target=people.find((p)=>p.id===targetId)??currentUser;
  useEffect(()=>{setMode(requestedMode);},[requestedMode]);
  useEffect(()=>{loadProfileFollowLists(targetId).then(setLists).catch(()=>setLists({followers:[],following:[],friends:[]}));},[targetId,followingIds.length,followerIds.length,friendIds.length]);

  const discovery=useMemo(()=>{
    const shared=(id:string)=>events.filter((event)=>event.attendeeIds.includes(currentUser.id)&&event.attendeeIds.includes(id)).length;
    return people.filter((p)=>p.id!==currentUser.id).sort((a,b)=>shared(b.id)-shared(a.id));
  },[people,events,currentUser.id]);
  const ids=mode==='followers'?lists.followers:mode==='following'?lists.following:mode==='friends'?lists.friends:discovery.map((p)=>p.id);
  const visible=ids.map((id)=>people.find((p)=>p.id===id)).filter(Boolean).filter((p:any)=>`${p.name} ${p.username}`.toLowerCase().includes(search.toLowerCase())) as typeof people;
  const action=async(id:string)=>{try{await toggleFollow(id);Haptics.selectionAsync().catch(()=>{});}catch(error:any){Alert.alert('Couldn’t update follow',friendlyErrorMessage(error,'Try again.'));}};
  const relationship=(id:string)=>{const following=followingIds.includes(id),followsMe=followerIds.includes(id);return following&&followsMe?'Friends':following?'Following':followsMe?'Follow Back':'Follow';};

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.head}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" color={colors.text} size={21}/></Pressable><View><Text style={styles.title}>{targetId===currentUser.id?'People':target.name}</Text><Text style={styles.sub}>{targetId===currentUser.id?'Your campus social graph.':`@${target.username}`}</Text></View><View style={{width:38}}/></View>
    <View style={styles.tabs}>{modes.map((item)=><Pressable key={item} onPress={()=>setMode(item)} style={[styles.tab,mode===item&&styles.tabActive]}><Text style={[styles.tabText,mode===item&&styles.tabTextActive]}>{item==='discover'?'Discover':item[0].toUpperCase()+item.slice(1)}</Text></Pressable>)}</View>
    <GlassSurface style={styles.searchShell}><Ionicons name="search" color={colors.subtle} size={16}/><TextInput value={search} onChangeText={setSearch} placeholder="Search people" placeholderTextColor={colors.subtle} style={styles.search}/></GlassSurface>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {visible.length?visible.map((person)=>{
        const label=relationship(person.id); const isMe=person.id===currentUser.id;
        const mutual=events.filter((event)=>event.attendeeIds.includes(currentUser.id)&&event.attendeeIds.includes(person.id)).length;
        return <View key={person.id} style={styles.row}><Pressable onPress={()=>router.push(`/profile/${person.id}`)} style={styles.personPress}><Avatar person={person} size={49}/><View style={styles.personCopy}><View style={styles.nameLine}><Text style={styles.name}>{person.name}</Text><VerifiedBadge person={person} size={13}/></View><Text style={styles.meta}>@{person.username} · {person.program}</Text>{mode==='discover'&&mutual>0?<Text style={styles.mutual}>{mutual} shared {mutual===1?'event':'events'}</Text>:null}</View></Pressable>{!isMe?<PressableScale haptic="light" onPress={()=>action(person.id)} style={[styles.action,(label==='Following'||label==='Friends')&&styles.actionMuted]}><Text style={[styles.actionText,(label==='Following'||label==='Friends')&&styles.actionMutedText]}>{label}</Text></PressableScale>:null}</View>;
      }):<View style={styles.empty}><Ionicons name="people-outline" color={colors.subtle} size={30}/><Text style={styles.emptyTitle}>Nobody here yet.</Text><Text style={styles.emptyText}>{mode==='discover'?'As more students join FOMO, people will show up here.':'This list is empty right now.'}</Text></View>}
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},head:{height:66,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:38,height:38,borderRadius:19,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},title:{color:colors.text,fontSize:24,fontWeight:'900',letterSpacing:-.7,textAlign:'center'},sub:{color:colors.muted,fontSize:9.5,textAlign:'center',marginTop:1},
  tabs:{height:43,marginHorizontal:16,backgroundColor:colors.surface,borderRadius:21,padding:4,flexDirection:'row',gap:2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},tab:{flex:1,borderRadius:17,alignItems:'center',justifyContent:'center'},tabActive:{backgroundColor:colors.surface3},tabText:{color:colors.subtle,fontSize:8.5,fontWeight:'800'},tabTextActive:{color:colors.text},
  searchShell:{height:46,borderRadius:23,marginHorizontal:16,marginTop:10,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:8},search:{flex:1,height:'100%',color:colors.text,fontSize:13},content:{paddingHorizontal:16,paddingBottom:44,paddingTop:10},row:{minHeight:72,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},personPress:{flex:1,flexDirection:'row',alignItems:'center'},personCopy:{flex:1,marginLeft:11},nameLine:{flexDirection:'row',alignItems:'center',gap:4},name:{color:colors.text,fontSize:12.5,fontWeight:'800'},meta:{color:colors.muted,fontSize:9.5,marginTop:2},mutual:{color:colors.accent2,fontSize:8.5,fontWeight:'700',marginTop:3},action:{minWidth:74,height:32,borderRadius:16,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',paddingHorizontal:10},actionText:{color:colors.white,fontSize:9,fontWeight:'900'},actionMuted:{backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},actionMutedText:{color:colors.text},empty:{alignItems:'center',paddingTop:90,paddingHorizontal:28},emptyTitle:{color:colors.text,fontSize:16,fontWeight:'900',marginTop:12},emptyText:{color:colors.muted,fontSize:11,lineHeight:16,textAlign:'center',marginTop:5},
});
