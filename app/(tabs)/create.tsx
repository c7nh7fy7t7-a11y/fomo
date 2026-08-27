import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FeedMediaType } from '@/data/seed';
import { useApp } from '@/context/AppContext';
import { CreatePostModal } from '@/components/CreatePostModal';
import { colors } from '@/theme/colors';

type Choice={kind:'image'|'video'|'event';title:string;subtitle:string;icon:keyof typeof Ionicons.glyphMap;accent:string;soft:string};
const choices:Choice[]=[
  {kind:'image',title:'Take or choose photo',subtitle:'Share a moment from campus',icon:'camera',accent:colors.social,soft:colors.socialSoft},
  {kind:'video',title:'Choose video',subtitle:'Post a clip to the campus Feed',icon:'videocam',accent:colors.study,soft:colors.studySoft},
  {kind:'event',title:'Create event',subtitle:'Party, study, club, sport — put it on the map',icon:'sparkles',accent:colors.accent2,soft:colors.accentSoft},
];

export default function CreateHub(){
  const router=useRouter();
  const {events,people,currentUser,createPost}=useApp();
  const [kind,setKind]=useState<FeedMediaType>();
  const choose=(choice:Choice)=>{
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
    if(choice.kind==='event')router.push('/create-event');else setKind(choice.kind);
  };
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.glow}/>
    <View style={styles.head}><Text style={styles.eyebrow}>CREATE</Text><Text style={styles.title}>What are you putting out there?</Text><Text style={styles.sub}>A moment, a clip, or the reason everyone leaves the house.</Text></View>
    <View style={styles.grid}>
      {choices.map((choice)=><Pressable key={choice.kind} onPress={()=>choose(choice)} style={({pressed})=>[styles.choice,pressed&&styles.pressed]}>
        <View style={[styles.icon,{backgroundColor:choice.soft,borderColor:choice.accent}]}><Ionicons name={choice.icon} color={choice.accent} size={25}/></View>
        <View style={styles.copy}><Text style={styles.choiceTitle}>{choice.title}</Text><Text style={styles.choiceSub}>{choice.subtitle}</Text></View>
        <View style={styles.arrow}><Ionicons name="arrow-forward" color={colors.text} size={18}/></View>
      </Pressable>)}
    </View>
    <View style={styles.tip}><Ionicons name="flash-outline" color={colors.campus} size={16}/><Text style={styles.tipText}>Keep it real. FOMO is best when posts connect back to things actually happening.</Text></View>
    <CreatePostModal visible={Boolean(kind)} initialKind={kind??'image'} events={events} people={people} currentUserId={currentUser.id} onClose={()=>setKind(undefined)} onPost={createPost}/>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg,paddingHorizontal:16},glow:{position:'absolute',right:-90,top:65,width:250,height:250,borderRadius:125,backgroundColor:colors.accentGlow,opacity:.7},head:{paddingTop:28,paddingHorizontal:3,paddingBottom:26},eyebrow:{color:colors.accent2,fontSize:9,fontWeight:'900',letterSpacing:1.4},title:{color:colors.text,fontSize:32,lineHeight:35,fontWeight:'900',letterSpacing:-1.1,marginTop:7,maxWidth:340},sub:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:9,maxWidth:320},grid:{gap:12},choice:{minHeight:104,borderRadius:25,backgroundColor:colors.surface,padding:14,flexDirection:'row',alignItems:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,shadowColor:'#000',shadowOpacity:.12,shadowRadius:12,shadowOffset:{width:0,height:6}},pressed:{opacity:.78,transform:[{scale:.985}]},icon:{width:58,height:58,borderRadius:20,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth},copy:{flex:1,minWidth:0,marginLeft:14},choiceTitle:{color:colors.text,fontSize:17,fontWeight:'900',letterSpacing:-.3},choiceSub:{color:colors.muted,fontSize:10.5,lineHeight:15,marginTop:4,maxWidth:220},arrow:{width:38,height:38,borderRadius:19,backgroundColor:colors.surface3,alignItems:'center',justifyContent:'center'},tip:{marginTop:20,backgroundColor:colors.surface2,borderRadius:18,padding:13,flexDirection:'row',alignItems:'flex-start',gap:9,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},tipText:{flex:1,color:colors.muted,fontSize:10.5,lineHeight:15},
});
