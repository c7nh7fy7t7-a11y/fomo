import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { Avatar } from '@/components/Avatar';
import { EventCard, FeaturedEvent } from '@/components/EventCard';
import { FeedPostCard } from '@/components/FeedPostCard';
import { CommentsModal } from '@/components/CommentsModal';
import { CreatePostModal } from '@/components/CreatePostModal';
import { BrandWordmark } from '@/components/BrandWordmark';
import { FeedMediaType, FeedPost, ReactionKind } from '@/data/seed';
import { friendlyErrorMessage } from '@/utils/errors';
import { showReportSheet } from '@/utils/reporting';
import { backendConfigured, supabase } from '@/lib/supabase';

const filters = ['All','Social','Study','Clubs','Sports','Campus'] as const;
const filterIcon: Record<(typeof filters)[number], keyof typeof Ionicons.glyphMap> = {
  All:'sparkles-outline',Social:'people-outline',Study:'book-outline',Clubs:'megaphone-outline',Sports:'football-outline',Campus:'school-outline',
};
const TAB_WIDTH=132;
let savedDiscoverY=0;
let savedFeedY=0;

export default function HomeScreen(){
  const router=useRouter(); const params=useLocalSearchParams<{view?:string;posted?:string}>();
  const {width}=useWindowDimensions();
  const pagerRef=useRef<ScrollView>(null);
  const scrollX=useRef(new Animated.Value(0)).current;
  const {
    currentUser,events,people,followingIds,friendIds,posts,interests,unreadNotificationCount,refreshAll,refreshFeed,syncing,syncError,demoMode,
    createPost,reactToPost,addComment,removeComment,markPostViewed,removeMyTag,removePost,report,loadMoreFeed,hasMoreFeed,
  }=useApp();
  const [mode,setMode]=useState<'Discover'|'Feed'>('Discover');
  const [filter,setFilter]=useState<(typeof filters)[number]>('All');
  const [createKind,setCreateKind]=useState<FeedMediaType>();
  const [commentPostId,setCommentPostId]=useState<string>();
  const [videoPauseToken,setVideoPauseToken]=useState(0);
  const commentPost=posts.find((post)=>post.id===commentPostId);
  const rankedPosts=useMemo(()=>[...posts].sort((a,b)=>{
    const social=(post:FeedPost)=>friendIds.includes(post.authorId)?2:followingIds.includes(post.authorId)?1:0;
    const ageHours=(post:FeedPost)=>Math.max(0,(Date.now()-new Date(post.createdAt).getTime())/3600000);
    return (social(b)-ageHours(b)/12)-(social(a)-ageHours(a)/12);
  }),[posts,friendIds,followingIds]);

  useEffect(()=>{
    if(params.view==='feed'){setMode('Feed');setTimeout(()=>pagerRef.current?.scrollTo({x:width,animated:false}),0);}
  },[params.view,params.posted,width]);
  useEffect(()=>{
    if(!commentPostId||demoMode||!backendConfigured||!supabase)return;
    const client=supabase;
    const channel=client.channel(`feed-comments-${commentPostId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'feed_comments',filter:`post_id=eq.${commentPostId}`},()=>refreshFeed())
      .subscribe();
    return()=>{client.removeChannel(channel);};
  },[commentPostId,demoMode,refreshFeed]);

  const visibleEvents=useMemo(()=>{
    if(filter==='All')return events;
    if(filter==='Sports')return events.filter((e)=>e.category==='Sports & Rec');
    if(filter==='Campus')return events.filter((e)=>e.category==='Campus Event');
    return events.filter((e)=>e.category===filter);
  },[events,filter]);
  const friendEvents=visibleEvents.filter((e)=>e.attendeeIds.some((id)=>friendIds.includes(id)));
  const interestMatches=visibleEvents.filter((e)=>{const c=e.category.toLowerCase();return interests.some((i)=>i==='parties'?/(social|party)/.test(c):i==='sports'?/sport/.test(c):i==='clubs'?/club/.test(c):i==='study'?/study/.test(c):i==='campus'?/campus/.test(c):i==='music'?/music/.test(c):i==='social'?/social/.test(c):i==='gaming'?/gaming|game/.test(c):false);});
  const now=new Date(); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  const thisWeek=visibleEvents.filter((e)=>{const d=new Date(`${e.eventDate}T12:00:00`).getTime();return d>=today&&d<=today+7*86400000;});
  const featured=friendEvents[0]??visibleEvents.find((e)=>e.trending)??visibleEvents[0];
  const rest=visibleEvents.filter((e)=>e.id!==featured?.id);
  const totalGoing=events.reduce((n,e)=>n+e.attendeeIds.length,0);
  const indicatorX=scrollX.interpolate({inputRange:[0,width],outputRange:[0,TAB_WIDTH],extrapolate:'clamp'});

  const switchMode=(next:'Discover'|'Feed')=>{
    setMode(next); Haptics.selectionAsync().catch(()=>{});
    pagerRef.current?.scrollTo({x:next==='Discover'?0:width,animated:true});
  };
  const onReaction=async(post:FeedPost,reaction?:ReactionKind)=>{try{await reactToPost(post.id,reaction);}catch(error:any){Alert.alert('Couldn’t react',friendlyErrorMessage(error,'Try again.'));}};

  const discoverPage=<ScrollView
    style={{width}}
    showsVerticalScrollIndicator={false}
    contentOffset={{x:0,y:savedDiscoverY}}
    onScroll={(e)=>{savedDiscoverY=e.nativeEvent.contentOffset.y;}} scrollEventThrottle={32}
    contentContainerStyle={[styles.discover,{width}]}
    refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshAll} tintColor={colors.accent2}/>}
  >
    {syncError?<View style={styles.error}><Ionicons name="cloud-offline-outline" color={colors.warning} size={16}/><Text style={styles.errorText}>{syncError}</Text></View>:null}
    <View style={styles.introCard}>
      <View style={styles.introGlow}/>
      <View style={styles.introCopy}>
        <Text style={styles.eyebrow}>{demoMode?'DEMO CAMPUS':'USASK · RIGHT NOW'}</Text>
        <Text style={styles.hero}>What’s happening?</Text>
        <Text style={styles.heroSub}>Find the places your campus is moving toward next.</Text>
      </View>
      <Pressable onPress={()=>router.push('/(tabs)/create')} style={({pressed})=>[styles.quickCreate,pressed&&styles.pressed]}><Ionicons name="add" color={colors.white} size={22}/></Pressable>
      <View style={styles.statsRow}>
        <View style={styles.statPill}><Text style={styles.statValue}>{events.length}</Text><Text style={styles.statLabel}>events</Text></View><View style={styles.statDivider}/>
        <View style={styles.statPill}><Text style={styles.statValue}>{totalGoing}</Text><Text style={styles.statLabel}>going</Text></View><View style={styles.statDivider}/>
        <View style={styles.statPill}><Text style={styles.statValue}>{friendEvents.length}</Text><Text style={styles.statLabel}>with friends</Text></View>
      </View>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {filters.map((item)=><Pressable key={item} onPress={()=>{setFilter(item);Haptics.selectionAsync().catch(()=>{});}} style={({pressed})=>[styles.filter,filter===item&&styles.filterActive,pressed&&styles.pressed]}><Ionicons name={filterIcon[item]} color={filter===item?colors.white:colors.muted} size={14}/><Text style={[styles.filterText,filter===item&&styles.filterTextActive]}>{item}</Text></Pressable>)}
    </ScrollView>

    {featured?<View style={styles.section}><View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>NEXT UP</Text><Text style={styles.sectionTitle}>Upcoming</Text></View><Pressable onPress={()=>router.push('/(tabs)/map')}><Text style={styles.sectionLink}>See map</Text></Pressable></View><FeaturedEvent event={featured} people={people} friendIds={friendIds}/></View>:null}
    {friendEvents.filter((e)=>e.id!==featured?.id).length?<View style={styles.section}><View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>YOUR PEOPLE</Text><Text style={styles.sectionTitle}>Friends are going</Text></View></View>{friendEvents.filter((e)=>e.id!==featured?.id).slice(0,3).map((event)=><EventCard key={event.id} compact event={event} people={people} friendIds={friendIds}/>)}</View>:null}
    {interestMatches.filter((e)=>e.id!==featured?.id).length?<View style={styles.section}><View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>FOR YOU</Text><Text style={styles.sectionTitle}>Based on your interests</Text></View></View>{interestMatches.filter((e)=>e.id!==featured?.id).slice(0,3).map((event)=><EventCard key={`interest-${event.id}`} compact event={event} people={people} friendIds={friendIds}/>)}</View>:null}
    {thisWeek.filter((e)=>e.id!==featured?.id).length?<View style={styles.section}><View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>THIS WEEK</Text><Text style={styles.sectionTitle}>Coming up</Text></View></View>{thisWeek.filter((e)=>e.id!==featured?.id).slice(0,3).map((event)=><EventCard key={`week-${event.id}`} compact event={event} people={people} friendIds={friendIds}/>)}</View>:null}
    <View style={styles.section}><View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>EXPLORE</Text><Text style={styles.sectionTitle}>Around campus</Text></View><Text style={styles.sectionCount}>{rest.length}</Text></View>{rest.length?rest.map((event)=><EventCard key={event.id} compact event={event} people={people} friendIds={friendIds}/>):<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="moon-outline" color={colors.accent2} size={22}/></View><Text style={styles.emptyTitle}>Quiet right now.</Text><Text style={styles.emptyBody}>Be the person who puts something on.</Text><Pressable onPress={()=>router.push('/(tabs)/create')} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Create something</Text><Ionicons name="arrow-forward" color={colors.white} size={14}/></Pressable></View>}</View>
  </ScrollView>;

  const feedHeader=<>
    <View style={styles.feedTop}><View><Text style={styles.feedEyebrow}>CAMPUS FEED</Text><Text style={styles.feedTitle}>People are out.</Text><Text style={styles.feedSub}>Photos, videos and moments tied to real events.</Text></View></View>
    <Pressable onPress={()=>setCreateKind('image')} style={({pressed})=>[styles.quickPost,pressed&&styles.pressed]}><Avatar person={currentUser} size={42}/><Text style={styles.quickPostText}>Share what’s happening…</Text><View style={styles.quickPostButton}><Ionicons name="camera" color={colors.white} size={17}/></View></Pressable>
    <View style={styles.feedDivider}/>
  </>;
  const feedPage=<FlatList
    style={{width}}
    showsVerticalScrollIndicator={false}
    contentOffset={{x:0,y:savedFeedY}}
    onScroll={(e)=>{savedFeedY=e.nativeEvent.contentOffset.y;}} scrollEventThrottle={32}
    contentContainerStyle={[styles.feed,{width}]}
    refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshFeed} tintColor={colors.accent2}/>}
    onScrollBeginDrag={()=>setVideoPauseToken((n)=>n+1)}
    data={rankedPosts}
    keyExtractor={(post)=>post.id}
    renderItem={({item:post})=><FeedPostCard post={post} people={people} events={events} currentUserId={currentUser.id} pauseToken={videoPauseToken} onReact={(reaction)=>onReaction(post,reaction)} onComments={()=>setCommentPostId(post.id)} onViewed={()=>markPostViewed(post.id)} onRemoveTag={()=>removeMyTag(post.id)} onDelete={()=>Alert.alert('Delete post?','This removes the post for everyone.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>removePost(post.id)}])} onReport={()=>showReportSheet({type:'post',id:post.id},report)}/>}
    ListHeaderComponent={feedHeader}
    ListEmptyComponent={<View style={styles.feedEmpty}><View style={styles.emptyIcon}><Ionicons name="images-outline" color={colors.accent2} size={24}/></View><Text style={styles.emptyTitle}>Nothing here yet.</Text><Text style={styles.emptyBody}>Be the first to show what’s happening.</Text><Pressable onPress={()=>setCreateKind('image')} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Post something</Text><Ionicons name="arrow-forward" color={colors.white} size={14}/></Pressable></View>}
    ListFooterComponent={hasMoreFeed?<Pressable onPress={()=>loadMoreFeed()} style={styles.loadMore}><Text style={styles.loadMoreText}>Load more</Text><Ionicons name="chevron-down" color={colors.muted} size={14}/></Pressable>:null}
    initialNumToRender={2}
    maxToRenderPerBatch={2}
    windowSize={3}
    removeClippedSubviews={false}
  />;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><View style={styles.brandLine}><BrandWordmark width={80}/><View style={styles.liveBadge}><View style={styles.liveDot}/><Text style={styles.liveText}>LIVE</Text></View></View><View style={styles.headerActions}><Pressable onPress={()=>router.push('/search')} style={({pressed})=>[styles.headerButton,pressed&&styles.pressed]}><Ionicons name="search" color={colors.text} size={19}/></Pressable><Pressable onPress={()=>router.push('/notifications')} style={({pressed})=>[styles.headerButton,pressed&&styles.pressed]}><Ionicons name={unreadNotificationCount?'notifications':'notifications-outline'} color={colors.text} size={20}/>{unreadNotificationCount?<View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{Math.min(unreadNotificationCount,9)}{unreadNotificationCount>9?'+':''}</Text></View>:null}</Pressable><Pressable onPress={()=>router.push('/(tabs)/friends')} style={({pressed})=>[styles.headerButton,pressed&&styles.pressed]}><Ionicons name="people-outline" color={colors.text} size={20}/></Pressable><Pressable onPress={()=>router.push('/(tabs)/profile')}><Avatar person={currentUser} size={40}/></Pressable></View></View>

    <View style={styles.modeShell}>
      <View style={styles.modeRow}>
        {(['Discover','Feed'] as const).map((item)=><Pressable key={item} onPress={()=>switchMode(item)} style={styles.modeItem}><Text style={[styles.modeText,mode===item&&styles.modeTextActive]}>{item}</Text></Pressable>)}
        <Animated.View style={[styles.modeRule,{transform:[{translateX:indicatorX}]}]}/>
      </View>
    </View>

    <Animated.ScrollView
      ref={pagerRef as any}
      horizontal pagingEnabled directionalLockEnabled nestedScrollEnabled bounces={false}
      showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
      onScroll={Animated.event([{nativeEvent:{contentOffset:{x:scrollX}}}],{useNativeDriver:true})}
      onMomentumScrollEnd={(e)=>setMode(e.nativeEvent.contentOffset.x>=width/2?'Feed':'Discover')}
      style={styles.pager}
    >{discoverPage}{feedPage}</Animated.ScrollView>

    <CreatePostModal visible={Boolean(createKind)} initialKind={createKind??'image'} events={events} people={people} currentUserId={currentUser.id} onClose={()=>setCreateKind(undefined)} onPost={createPost}/>
    <CommentsModal visible={Boolean(commentPostId)} post={commentPost} people={people} currentUserId={currentUser.id} onClose={()=>setCommentPostId(undefined)} onSend={async(body)=>{if(commentPost)await addComment(commentPost.id,body);}} onDelete={removeComment}/>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},pager:{flex:1},header:{height:58,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brandLine:{flexDirection:'row',alignItems:'center',gap:9},liveBadge:{height:22,borderRadius:11,backgroundColor:colors.surface2,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:5,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},liveDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.success},liveText:{color:colors.muted,fontSize:8,fontWeight:'900',letterSpacing:.8},headerActions:{flexDirection:'row',alignItems:'center',gap:10},headerButton:{width:40,height:40,borderRadius:20,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},notificationBadge:{position:'absolute',right:-1,top:-2,minWidth:16,height:16,borderRadius:8,backgroundColor:colors.accent2,alignItems:'center',justifyContent:'center',paddingHorizontal:3,borderWidth:2,borderColor:colors.bg},notificationBadgeText:{color:colors.white,fontSize:7.5,fontWeight:'900'},pressed:{opacity:.76,transform:[{scale:.98}]},
  modeShell:{alignItems:'center',paddingTop:2,paddingBottom:6,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},modeRow:{width:TAB_WIDTH*2,height:50,flexDirection:'row',position:'relative'},modeItem:{width:TAB_WIDTH,height:48,alignItems:'center',justifyContent:'center'},modeText:{color:colors.muted,fontSize:18,fontWeight:'800',letterSpacing:-.35},modeTextActive:{color:colors.text,fontWeight:'900'},modeRule:{position:'absolute',left:0,bottom:0,width:TAB_WIDTH,height:3,borderRadius:2,backgroundColor:colors.accent},
  discover:{paddingHorizontal:14,paddingTop:14,paddingBottom:120},error:{flexDirection:'row',alignItems:'center',gap:7,backgroundColor:colors.surface2,borderRadius:16,padding:12,marginBottom:12,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},errorText:{color:colors.warning,fontSize:10.5,flex:1},introCard:{borderRadius:29,backgroundColor:colors.surface,padding:19,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,overflow:'hidden'},introGlow:{position:'absolute',right:-42,top:-65,width:170,height:170,borderRadius:85,backgroundColor:colors.accentGlow},introCopy:{paddingRight:56},eyebrow:{color:colors.accent2,fontSize:9,fontWeight:'900',letterSpacing:1.1},hero:{color:colors.text,fontSize:31,lineHeight:34,fontWeight:'900',letterSpacing:-1.15,marginTop:5},heroSub:{color:colors.muted,fontSize:11.5,lineHeight:17,marginTop:7,maxWidth:300},quickCreate:{position:'absolute',right:16,top:16,width:44,height:44,borderRadius:22,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',shadowColor:colors.accent,shadowOpacity:.34,shadowRadius:13,shadowOffset:{width:0,height:4}},statsRow:{height:57,borderRadius:19,backgroundColor:colors.surface2,marginTop:18,flexDirection:'row',alignItems:'center',paddingHorizontal:8},statPill:{flex:1,alignItems:'center'},statValue:{color:colors.text,fontSize:15,fontWeight:'900'},statLabel:{color:colors.subtle,fontSize:8.5,fontWeight:'700',marginTop:2},statDivider:{width:StyleSheet.hairlineWidth,height:24,backgroundColor:colors.line},filters:{gap:8,paddingVertical:15,paddingRight:10},filter:{height:37,borderRadius:19,paddingHorizontal:12,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,flexDirection:'row',gap:6},filterActive:{backgroundColor:colors.accent,borderColor:colors.accent2},filterText:{color:colors.muted,fontSize:10.5,fontWeight:'800'},filterTextActive:{color:colors.white,fontWeight:'900'},section:{marginTop:12},sectionHead:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',paddingHorizontal:2,marginBottom:11},sectionKicker:{color:colors.accent2,fontSize:8,fontWeight:'900',letterSpacing:1.1,marginBottom:2},sectionTitle:{color:colors.text,fontSize:20,fontWeight:'900',letterSpacing:-.45},sectionLink:{color:colors.accent2,fontSize:10.5,fontWeight:'800',paddingBottom:2},sectionCount:{color:colors.subtle,fontSize:11,fontWeight:'800',paddingBottom:3},empty:{padding:24,borderRadius:24,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,alignItems:'flex-start'},emptyIcon:{width:48,height:48,borderRadius:24,backgroundColor:colors.accentSoft,alignItems:'center',justifyContent:'center',marginBottom:12},emptyTitle:{color:colors.text,fontSize:17,fontWeight:'900'},emptyBody:{color:colors.muted,fontSize:11.5,lineHeight:17,marginTop:5},emptyButton:{height:38,borderRadius:19,backgroundColor:colors.accent,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:7,marginTop:14},emptyButtonText:{color:colors.white,fontSize:10,fontWeight:'900'},
  feed:{paddingBottom:120},feedTop:{paddingHorizontal:16,paddingTop:18,paddingBottom:12},feedEyebrow:{color:colors.accent2,fontSize:8.5,fontWeight:'900',letterSpacing:1.2},feedTitle:{color:colors.text,fontSize:28,fontWeight:'900',letterSpacing:-.85,marginTop:3},feedSub:{color:colors.muted,fontSize:11,marginTop:3},quickPost:{marginHorizontal:14,marginBottom:14,minHeight:64,borderRadius:23,backgroundColor:colors.surface,paddingHorizontal:12,flexDirection:'row',alignItems:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},quickPostText:{flex:1,color:colors.muted,fontSize:11.5,marginLeft:10},quickPostButton:{width:39,height:39,borderRadius:20,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},feedDivider:{height:StyleSheet.hairlineWidth,backgroundColor:colors.line,marginHorizontal:16,marginBottom:1},feedEmpty:{alignItems:'center',paddingTop:78,paddingHorizontal:32},loadMore:{alignSelf:'center',height:38,borderRadius:19,backgroundColor:colors.surface2,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:6,marginTop:14},loadMoreText:{color:colors.muted,fontSize:9.5,fontWeight:'800'},
});
