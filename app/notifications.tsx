import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { SocialNotification } from '@/data/seed';
import { colors } from '@/theme/colors';
import { timeAgo } from '@/utils/time';

const iconFor=(type:SocialNotification['type']):keyof typeof Ionicons.glyphMap=>({follow:'person-add',friend:'people',reaction:'heart',comment:'chatbubble',tag:'at',event_approved:'checkmark-circle',event_invite:'ticket',message:'chatbubble-ellipses'}[type] as any);

export default function NotificationsScreen(){
  const router=useRouter();
  const {notifications,people,events,posts,markNotificationRead,markAllNotificationsRead,openChatWith}=useApp();
  const rows=useMemo(()=>notifications.map((notice)=>({notice,actor:people.find((p)=>p.id===notice.actorId),event:events.find((e)=>e.id===notice.eventId),post:posts.find((p)=>p.id===notice.postId)})),[notifications,people,events,posts]);
  const copy=(notice:SocialNotification,actorName?:string,eventTitle?:string)=>{
    const who=actorName??'Someone';
    switch(notice.type){
      case 'follow': return `${who} followed you`;
      case 'friend': return `${who} followed you back — you’re friends`;
      case 'reaction': return `${who} reacted to your post`;
      case 'comment': return `${who} commented on your post`;
      case 'tag': return `${who} tagged you in a post`;
      case 'event_approved': return `${who} approved you for ${eventTitle??'an event'}`;
      case 'event_invite': return `${who} invited you to ${eventTitle??'an event'}`;
      case 'message': return `${who} sent you a message`;
    }
  };
  const open=async(notice:SocialNotification)=>{
    if(!notice.readAt)await markNotificationRead(notice.id).catch(()=>{});
    if(notice.postId){router.push(`/post/${notice.postId}`);return;}
    if(notice.eventId){router.push(`/event/${notice.eventId}`);return;}
    if(notice.type==='message'&&notice.actorId){const id=await openChatWith(notice.actorId);router.push(`/chat/${id}?peer=${notice.actorId}`);return;}
    if(notice.actorId)router.push(`/profile/${notice.actorId}`);
  };
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.head}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" color={colors.text} size={21}/></Pressable><View><Text style={styles.title}>Notifications</Text><Text style={styles.sub}>What changed around you.</Text></View><Pressable onPress={()=>markAllNotificationsRead()}><Text style={styles.readAll}>Read all</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {rows.length?rows.map(({notice,actor,event})=><Pressable key={notice.id} onPress={()=>open(notice)} style={[styles.row,!notice.readAt&&styles.unread]}>
        <View style={styles.avatarWrap}>{actor?<Avatar person={actor} size={48}/>:<View style={styles.iconOnly}><Ionicons name={iconFor(notice.type)} color={colors.accent2} size={20}/></View>}<View style={styles.typeBadge}><Ionicons name={iconFor(notice.type)} color={colors.white} size={10}/></View></View>
        <View style={styles.copy}>{actor?<View style={styles.actorLine}><Text style={styles.actorName}>{actor.name}</Text><VerifiedBadge person={actor} size={12}/></View>:null}<Text style={styles.body}>{copy(notice,actor?.name,event?.title)}</Text><Text style={styles.time}>{timeAgo(notice.createdAt)}</Text></View>{!notice.readAt?<View style={styles.dot}/>:null}
      </Pressable>):<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="notifications-outline" color={colors.accent2} size={27}/></View><Text style={styles.emptyTitle}>All quiet.</Text><Text style={styles.emptyText}>Follows, comments, tags, event approvals and messages will land here.</Text></View>}
    </ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},head:{height:66,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{width:38,height:38,borderRadius:19,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},title:{color:colors.text,fontSize:24,fontWeight:'900',letterSpacing:-.7,textAlign:'center'},sub:{color:colors.muted,fontSize:9.5,textAlign:'center',marginTop:1},readAll:{color:colors.accent2,fontSize:9.5,fontWeight:'900',width:48,textAlign:'right'},content:{paddingHorizontal:14,paddingBottom:44},row:{minHeight:74,borderRadius:21,padding:11,flexDirection:'row',alignItems:'center',marginBottom:6,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,backgroundColor:colors.surface},unread:{backgroundColor:colors.surface2,borderColor:'rgba(111,125,255,.32)'},avatarWrap:{width:48,height:48},iconOnly:{width:48,height:48,borderRadius:24,backgroundColor:colors.surface3,alignItems:'center',justifyContent:'center'},typeBadge:{position:'absolute',right:-3,bottom:-2,width:20,height:20,borderRadius:10,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:colors.surface},copy:{flex:1,marginLeft:12},actorLine:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:1},actorName:{color:colors.muted,fontSize:8.5,fontWeight:'800'},body:{color:colors.text,fontSize:11.5,lineHeight:16,fontWeight:'700'},time:{color:colors.subtle,fontSize:9.5,marginTop:4},dot:{width:7,height:7,borderRadius:4,backgroundColor:colors.accent2,marginLeft:8},empty:{alignItems:'center',paddingTop:110,paddingHorizontal:30},emptyIcon:{width:60,height:60,borderRadius:30,backgroundColor:colors.accentSoft,alignItems:'center',justifyContent:'center'},emptyTitle:{color:colors.text,fontSize:18,fontWeight:'900',marginTop:14},emptyText:{color:colors.muted,fontSize:11,lineHeight:17,textAlign:'center',marginTop:6},
});
