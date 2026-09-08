import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { Avatar } from '@/components/Avatar';
import { EventCard, FeaturedEvent, TonightEventCard } from '@/components/EventCard';
import { FeedPostCard } from '@/components/FeedPostCard';
import { CommentsModal } from '@/components/CommentsModal';
import { CreatePostModal } from '@/components/CreatePostModal';
import { BrandWordmark } from '@/components/BrandWordmark';
import { FeedMediaType, FeedPost, FomoEvent, ReactionKind } from '@/data/seed';
import { friendlyErrorMessage } from '@/utils/errors';
import { showReportSheet } from '@/utils/reporting';
import { backendConfigured, supabase } from '@/lib/supabase';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const HOUR=60*60*1000;

function eventStart(event:FomoEvent){
  const date=new Date(`${event.eventDate}T00:00:00`);
  const match=event.time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if(!match||Number.isNaN(date.getTime()))return new Date(event.eventDate).getTime();
  let hours=Number(match[1]); const minutes=Number(match[2]??0); const period=match[3]?.toUpperCase();
  if(period==='PM'&&hours<12)hours+=12;
  if(period==='AM'&&hours===12)hours=0;
  date.setHours(hours,minutes,0,0);
  return date.getTime();
}

function SectionHead({kicker,title,action,onPress}:{kicker:string;title:string;action?:string;onPress?:()=>void}){
  return <View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>{kicker}</Text><Text style={styles.sectionTitle}>{title}</Text></View>{action&&onPress?<Pressable onPress={onPress} hitSlop={8}><Text style={styles.sectionAction}>{action}</Text></Pressable>:null}</View>;
}

export default function HomeScreen(){
  const router=useRouter();
  const reducedMotion=useReducedMotion();
  const {
    currentUser,events,people,followingIds,friendIds,posts,unreadNotificationCount,refreshAll,refreshFeed,syncing,syncError,demoMode,
    createPost,reactToPost,addComment,removeComment,markPostViewed,removeMyTag,removePost,report,loadMoreFeed,hasMoreFeed,
  }=useApp();
  const [createKind,setCreateKind]=useState<FeedMediaType>();
  const [commentPostId,setCommentPostId]=useState<string>();
  const [videoPauseToken,setVideoPauseToken]=useState(0);
  const intro=useRef(new Animated.Value(reducedMotion?1:0)).current;
  const commentPost=posts.find((post)=>post.id===commentPostId);

  useEffect(()=>{if(reducedMotion){intro.setValue(1);return;}Animated.timing(intro,{toValue:1,duration:420,useNativeDriver:true}).start();},[intro,reducedMotion]);
  useEffect(()=>{
    if(!commentPostId||demoMode||!backendConfigured||!supabase)return;
    const client=supabase;
    const channel=client.channel(`feed-comments-${commentPostId}`).on('postgres_changes',{event:'*',schema:'public',table:'feed_comments',filter:`post_id=eq.${commentPostId}`},()=>refreshFeed()).subscribe();
    return()=>{client.removeChannel(channel);};
  },[commentPostId,demoMode,refreshFeed]);

  const rankedPosts=useMemo(()=>[...posts].sort((a,b)=>{
    const social=(post:FeedPost)=>friendIds.includes(post.authorId)?2:followingIds.includes(post.authorId)?1:0;
    const ageHours=(post:FeedPost)=>Math.max(0,(Date.now()-new Date(post.createdAt).getTime())/HOUR);
    return (social(b)-ageHours(b)/12)-(social(a)-ageHours(a)/12);
  }),[posts,friendIds,followingIds]);

  const timeline=useMemo(()=>{
    const now=Date.now(); const today=new Date(); today.setHours(0,0,0,0); const tomorrow=today.getTime()+24*HOUR;
    const ordered=[...events].sort((a,b)=>eventStart(a)-eventStart(b));
    const happening=ordered.filter((event)=>eventStart(event)<=now&&eventStart(event)>=now-4*HOUR);
    const tonight=ordered.filter((event)=>eventStart(event)>now&&eventStart(event)<tomorrow);
    const upcoming=ordered.filter((event)=>eventStart(event)>=tomorrow);
    const active=[...happening,...tonight];
    const hero=happening[0]??tonight[0]??upcoming[0]??events[0];
    const heroStatus=happening.some((event)=>event.id===hero?.id)?'HAPPENING NOW':tonight.some((event)=>event.id===hero?.id)?'TONIGHT':upcoming.some((event)=>event.id===hero?.id)?'NEXT UP':'AROUND CAMPUS';
    const friendActivity=[...active,...upcoming].filter((event)=>event.attendeeIds.some((id)=>friendIds.includes(id)));
    return {happening,tonight,upcoming,active,hero,heroStatus,friendActivity};
  },[events,friendIds]);

  const onReaction=async(post:FeedPost,reaction?:ReactionKind)=>{try{await reactToPost(post.id,reaction);}catch(error:any){Alert.alert('Couldn’t react',friendlyErrorMessage(error,'Try again.'));}};
  const renderPost=({item:post}:{item:FeedPost})=><FeedPostCard post={post} people={people} events={events} currentUserId={currentUser.id} pauseToken={videoPauseToken} onReact={(reaction)=>onReaction(post,reaction)} onComments={()=>setCommentPostId(post.id)} onViewed={()=>markPostViewed(post.id)} onRemoveTag={()=>removeMyTag(post.id)} onDelete={()=>Alert.alert('Delete post?','This removes the post for everyone.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>removePost(post.id)}])} onReport={()=>showReportSheet({type:'post',id:post.id},report)}/>;

  const Header=<>
    <View style={styles.header}><View style={styles.brandLine}><BrandWordmark width={79}/><View style={styles.tonightBadge}><View style={styles.liveDot}/><Text style={styles.tonightBadgeText}>{demoMode?'DEMO':'TONIGHT'}</Text></View></View><View style={styles.headerActions}><Pressable accessibilityLabel="Search" onPress={()=>router.push('/search')} style={({pressed})=>[styles.headerButton,pressed&&styles.pressed]}><Ionicons name="search" color={colors.text} size={19}/></Pressable><Pressable accessibilityLabel="Notifications" onPress={()=>router.push('/notifications')} style={({pressed})=>[styles.headerButton,pressed&&styles.pressed]}><Ionicons name={unreadNotificationCount?'notifications':'notifications-outline'} color={colors.text} size={20}/>{unreadNotificationCount?<View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{Math.min(unreadNotificationCount,9)}{unreadNotificationCount>9?'+':''}</Text></View>:null}</Pressable><Pressable accessibilityLabel="Your profile" onPress={()=>router.push('/(tabs)/profile')}><Avatar person={currentUser} size={39}/></Pressable></View></View>

    <Animated.View style={[styles.intro,{opacity:intro,transform:[{translateY:intro.interpolate({inputRange:[0,1],outputRange:[reducedMotion?0:10,0]})}]}]}>
      <Text style={styles.dateLine}>{new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(new Date()).toUpperCase()}</Text>
      <Text style={styles.heroQuestion}>What is everyone doing tonight?</Text>
      <View style={styles.contextRow}><View style={styles.contextItem}><Text style={styles.contextNumber}>{timeline.active.length}</Text><Text style={styles.contextLabel}>tonight</Text></View><View style={styles.contextRule}/><View style={styles.contextItem}><Text style={styles.contextNumber}>{timeline.active.reduce((count,event)=>count+event.attendeeIds.length,0)}</Text><Text style={styles.contextLabel}>going out</Text></View><View style={styles.contextRule}/><View style={styles.contextItem}><Text style={styles.contextNumber}>{timeline.friendActivity.length}</Text><Text style={styles.contextLabel}>with friends</Text></View></View>
    </Animated.View>

    {syncError?<View style={styles.error}><Ionicons name="cloud-offline-outline" color={colors.warning} size={16}/><Text style={styles.errorText}>{syncError}</Text></View>:null}

    {timeline.hero?<View style={styles.heroEvent}><FeaturedEvent event={timeline.hero} people={people} friendIds={friendIds} status={timeline.heroStatus}/></View>:<View style={styles.quietHero}><Text style={styles.quietKicker}>TONIGHT IS OPEN</Text><Text style={styles.quietTitle}>Nothing planned yet?</Text><Text style={styles.quietBody}>Be the person who starts something.</Text><Pressable onPress={()=>router.push('/create-event')} style={styles.quietButton}><Text style={styles.quietButtonText}>Create an event</Text><Ionicons name="arrow-forward" color={colors.white} size={14}/></Pressable></View>}

    {timeline.friendActivity.length?<View style={styles.section}><SectionHead kicker="YOUR PEOPLE" title="Friends have plans" action="See friends" onPress={()=>router.push('/(tabs)/friends')}/><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRail}>{timeline.friendActivity.slice(0,5).map((event)=>{
      const friends=event.attendeeIds.map((id)=>people.find((person)=>person.id===id)).filter((person)=>person&&friendIds.includes(person.id));
      const lead=friends[0]; if(!lead)return null;
      return <Pressable key={event.id} onPress={()=>router.push(`/event/${event.id}`)} style={({pressed})=>[styles.peopleStory,pressed&&styles.pressed]}><Avatar person={lead} size={52}/><View style={styles.peopleCopy}><Text style={styles.peopleName}>{lead.name.split(' ')[0]}{friends.length>1?` + ${friends.length-1}`:''}</Text><Text style={styles.peoplePlan} numberOfLines={2}>are going to {event.title}</Text></View><Ionicons name="arrow-forward" color={colors.subtle} size={15}/></Pressable>;
    })}</ScrollView></View>:null}

    {timeline.active.filter((event)=>event.id!==timeline.hero?.id).length?<View style={styles.section}><SectionHead kicker="HAPPENING TONIGHT" title="Go where it feels alive" action="Map" onPress={()=>router.push('/(tabs)/map')}/><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRail}>{timeline.active.filter((event)=>event.id!==timeline.hero?.id).map((event)=><TonightEventCard key={event.id} event={event} people={people} friendIds={friendIds}/>)}</ScrollView></View>:timeline.heroStatus!=='HAPPENING NOW'&&timeline.heroStatus!=='TONIGHT'?<View style={styles.tonightEmpty}><View><Text style={styles.tonightEmptyTitle}>Campus is quiet tonight.</Text><Text style={styles.tonightEmptyBody}>Your plan could be the one people join.</Text></View><Pressable accessibilityLabel="Create event" onPress={()=>router.push('/create-event')} style={styles.tonightEmptyAction}><Ionicons name="add" color={colors.white} size={20}/></Pressable></View>:null}

    <View style={styles.pulseHead}><SectionHead kicker="CAMPUS PULSE" title="See what is happening"/><Pressable onPress={()=>setCreateKind('image')} style={({pressed})=>[styles.quickPost,pressed&&styles.pressed]}><Avatar person={currentUser} size={42}/><Text style={styles.quickPostText}>Share the night…</Text><View style={styles.quickPostButton}><Ionicons name="camera" color={colors.white} size={17}/></View></Pressable></View>
  </>;

  const Footer=<View style={styles.footer}>
    {!rankedPosts.length?<View style={styles.feedEmpty}><Ionicons name="images-outline" color={colors.accent2} size={26}/><Text style={styles.emptyTitle}>The pulse starts here.</Text><Text style={styles.emptyBody}>Share the first photo or video from campus.</Text><Pressable onPress={()=>setCreateKind('image')} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Post a moment</Text></Pressable></View>:null}
    {hasMoreFeed?<Pressable onPress={()=>loadMoreFeed()} style={styles.loadMore}><Text style={styles.loadMoreText}>More from campus</Text><Ionicons name="chevron-down" color={colors.muted} size={14}/></Pressable>:null}
    {timeline.upcoming.filter((event)=>event.id!==timeline.hero?.id).length?<View style={styles.comingUp}><SectionHead kicker="COMING UP" title="Plans worth saving"/>{timeline.upcoming.filter((event)=>event.id!==timeline.hero?.id).slice(0,5).map((event)=><EventCard key={event.id} compact event={event} people={people} friendIds={friendIds}/>)}</View>:null}
  </View>;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <FlatList data={rankedPosts} renderItem={renderPost} keyExtractor={(post)=>post.id} ListHeaderComponent={Header} ListFooterComponent={Footer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshAll} tintColor={colors.accent2}/>} onScrollBeginDrag={()=>setVideoPauseToken((token)=>token+1)} initialNumToRender={3} maxToRenderPerBatch={4} windowSize={5}/>
    <CreatePostModal visible={Boolean(createKind)} initialKind={createKind??'image'} events={events} people={people} currentUserId={currentUser.id} onClose={()=>setCreateKind(undefined)} onPost={createPost}/>
    <CommentsModal visible={Boolean(commentPostId)} post={commentPost} people={people} currentUserId={currentUser.id} onClose={()=>setCommentPostId(undefined)} onSend={async(body)=>{if(commentPost)await addComment(commentPost.id,body);}} onDelete={removeComment}/>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},content:{paddingBottom:118},header:{height:60,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brandLine:{flexDirection:'row',alignItems:'center',gap:9},tonightBadge:{height:23,borderRadius:12,backgroundColor:colors.surface2,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:5},liveDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.success},tonightBadgeText:{color:colors.muted,fontSize:8,fontWeight:'900',letterSpacing:.8},headerActions:{flexDirection:'row',alignItems:'center',gap:8},headerButton:{width:39,height:39,borderRadius:16,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},notificationBadge:{position:'absolute',right:-2,top:-3,minWidth:16,height:16,borderRadius:8,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',paddingHorizontal:3,borderWidth:2,borderColor:colors.bg},notificationBadgeText:{color:colors.white,fontSize:7.5,fontWeight:'900'},pressed:{opacity:.76,transform:[{scale:.985}]},
  intro:{paddingHorizontal:16,paddingTop:18,paddingBottom:18},dateLine:{color:colors.accent2,fontSize:8.5,fontWeight:'900',letterSpacing:1.3},heroQuestion:{color:colors.text,fontSize:34,lineHeight:37,fontWeight:'900',letterSpacing:-1.35,maxWidth:340,marginTop:5},contextRow:{height:57,flexDirection:'row',alignItems:'center',marginTop:18,borderTopWidth:StyleSheet.hairlineWidth,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:colors.line},contextItem:{flex:1,alignItems:'center'},contextNumber:{color:colors.text,fontSize:15,fontWeight:'900'},contextLabel:{color:colors.muted,fontSize:8.5,fontWeight:'700',marginTop:2},contextRule:{width:StyleSheet.hairlineWidth,height:24,backgroundColor:colors.line},
  error:{marginHorizontal:16,marginBottom:13,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:colors.surface2,borderRadius:15,padding:12},errorText:{color:colors.warning,fontSize:10.5,flex:1},heroEvent:{paddingHorizontal:12},quietHero:{marginHorizontal:12,minHeight:250,borderRadius:28,backgroundColor:colors.surface,padding:24,justifyContent:'flex-end',overflow:'hidden'},quietKicker:{color:colors.accent2,fontSize:8.5,fontWeight:'900',letterSpacing:1.1},quietTitle:{color:colors.text,fontSize:28,fontWeight:'900',letterSpacing:-.8,marginTop:5},quietBody:{color:colors.muted,fontSize:11.5,marginTop:6},quietButton:{alignSelf:'flex-start',height:40,borderRadius:20,backgroundColor:colors.accent,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:7,marginTop:16},quietButtonText:{color:colors.white,fontSize:10,fontWeight:'900'},
  section:{marginTop:28},sectionHead:{paddingHorizontal:16,marginBottom:12,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},sectionKicker:{color:colors.accent2,fontSize:8,fontWeight:'900',letterSpacing:1.2,marginBottom:3},sectionTitle:{color:colors.text,fontSize:21,fontWeight:'900',letterSpacing:-.5},sectionAction:{color:colors.accent2,fontSize:10.5,fontWeight:'800',paddingBottom:2},peopleRail:{paddingHorizontal:16,gap:9},peopleStory:{width:268,minHeight:76,borderRadius:20,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',paddingHorizontal:11},peopleCopy:{flex:1,minWidth:0,marginHorizontal:11},peopleName:{color:colors.text,fontSize:12.5,fontWeight:'900'},peoplePlan:{color:colors.muted,fontSize:10.5,lineHeight:14,marginTop:3},eventRail:{paddingHorizontal:12},
  tonightEmpty:{marginHorizontal:16,marginTop:25,paddingVertical:16,borderTopWidth:StyleSheet.hairlineWidth,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:colors.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},tonightEmptyTitle:{color:colors.text,fontSize:14,fontWeight:'900'},tonightEmptyBody:{color:colors.muted,fontSize:10.5,marginTop:4},tonightEmptyAction:{width:42,height:42,borderRadius:16,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},
  pulseHead:{marginTop:31},quickPost:{marginHorizontal:14,marginBottom:10,minHeight:66,borderRadius:21,backgroundColor:colors.surface,paddingHorizontal:12,flexDirection:'row',alignItems:'center'},quickPostText:{flex:1,color:colors.muted,fontSize:11.5,marginLeft:10},quickPostButton:{width:39,height:39,borderRadius:15,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},
  footer:{paddingBottom:12},feedEmpty:{alignItems:'center',paddingVertical:54,paddingHorizontal:32},emptyTitle:{color:colors.text,fontSize:18,fontWeight:'900',marginTop:11},emptyBody:{color:colors.muted,fontSize:11.5,lineHeight:17,textAlign:'center',marginTop:5},emptyButton:{height:39,borderRadius:20,backgroundColor:colors.accent,paddingHorizontal:14,alignItems:'center',justifyContent:'center',marginTop:15},emptyButtonText:{color:colors.white,fontSize:10,fontWeight:'900'},loadMore:{alignSelf:'center',height:39,borderRadius:20,backgroundColor:colors.surface2,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:7,marginTop:14},loadMoreText:{color:colors.muted,fontSize:9.5,fontWeight:'800'},comingUp:{marginTop:34,paddingHorizontal:14},
});
