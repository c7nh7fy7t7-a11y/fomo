import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, AppState, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ViewToken } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { EventCard, FeaturedEvent } from '@/components/EventCard';
import { FeedPostCard } from '@/components/FeedPostCard';
import { BrandWordmark } from '@/components/BrandWordmark';
import { WeeklyRotationCard } from '@/components/WeeklyRotationCard';
import { FeedPost, FomoEvent, ReactionKind } from '@/data/seed';
import { friendlyErrorMessage } from '@/utils/errors';
import { showReportSheet } from '@/utils/reporting';
import { backendConfigured, supabase } from '@/lib/supabase';
import { selectNextWeeklyOccurrences } from '@/utils/weeklyRotation';

const filters = ['All','Social','Study','Clubs','Sports','Campus'] as const;
const homeModes=['Discover','Feed','Past'] as const;
type HomeMode=(typeof homeModes)[number];
const discoverModes=['Upcoming','Past Highlights'] as const;
type DiscoverMode=(typeof discoverModes)[number];
const feedModes=['All','Friends'] as const;
type FeedMode=(typeof feedModes)[number];
const TAB_WIDTH=88;
let savedDiscoverY=0;
let savedFeedY=0;
let savedPastY=0;

function eventDayEnd(event:FomoEvent){
  const parts=event.eventDate.split('-').map(Number);
  if(parts.length!==3||parts.some((part)=>!Number.isFinite(part)))return Number.POSITIVE_INFINITY;
  const [year,month,day]=parts;
  return new Date(year,month-1,day+1).getTime();
}
function pastArchiveTime(event:FomoEvent){
  const parts=event.eventDate.split('-').map(Number);
  if(parts.length!==3||parts.some((part)=>!Number.isFinite(part)))return Number.POSITIVE_INFINITY;
  const [year,month,day]=parts;
  return new Date(year,month-1,day+5).getTime();
}

export default function HomeScreen(){
  const router=useRouter(); const params=useLocalSearchParams<{view?:string;posted?:string}>();
  const {width}=useWindowDimensions();
  const pagerRef=useRef<ScrollView>(null);
  const feedListRef=useRef<FlatList<FeedPost>>(null);
  const feedRestoreTargetRef=useRef(Math.max(0,savedFeedY));
  const feedRestoreStartedRef=useRef(feedRestoreTargetRef.current===0);
  const feedRestoreCompleteRef=useRef(feedRestoreTargetRef.current===0);
  const feedViewportHeightRef=useRef(0);
  const feedContentHeightRef=useRef(0);
  const [feedRestoreMinHeight,setFeedRestoreMinHeight]=useState<number>();
  const scrollX=useRef(new Animated.Value(0)).current;
  const {
    currentUser,events,people,followingIds,friendIds,posts,interests,unreadNotificationCount,refreshAll,refreshFeed,syncing,syncError,demoMode,
    reactToPost,addComment,removeComment,markPostViewed,removeMyTag,removePost,report,loadMoreFeed,hasMoreFeed,
  }=useApp();
  const [mode,setMode]=useState<HomeMode>('Discover');
  const [discoverMode,setDiscoverMode]=useState<DiscoverMode>('Upcoming');
  const [feedMode,setFeedMode]=useState<FeedMode>('All');
  const [filter,setFilter]=useState<(typeof filters)[number]>('All');
  const [showAllExplore,setShowAllExplore]=useState(false);
  const [commentPostId,setCommentPostId]=useState<string>();
  const [activeVideoPostId,setActiveVideoPostId]=useState<string>();
  const [appActive,setAppActive]=useState(AppState.currentState==='active');
  const [screenFocused,setScreenFocused]=useState(false);
  const viewabilityConfig=useRef({viewAreaCoveragePercentThreshold:55,minimumViewTime:180}).current;
  const onViewableItemsChanged=useRef(({viewableItems}:{viewableItems:ViewToken<FeedPost>[]})=>{
    const visibleVideo=viewableItems.find(({isViewable,item})=>isViewable&&item.mediaType==='video');
    setActiveVideoPostId(visibleVideo?.item.id);
  }).current;
  const rankedPosts=useMemo(()=>[...posts].sort((a,b)=>{
    const social=(post:FeedPost)=>friendIds.includes(post.authorId)?2:followingIds.includes(post.authorId)?1:0;
    const ageHours=(post:FeedPost)=>Math.max(0,(Date.now()-new Date(post.createdAt).getTime())/3600000);
    return (social(b)-ageHours(b)/12)-(social(a)-ageHours(a)/12);
  }),[posts,friendIds,followingIds]);
  const visiblePosts=useMemo(()=>feedMode==='Friends'
    ? rankedPosts.filter((post)=>friendIds.includes(post.authorId))
    : rankedPosts,[feedMode,friendIds,rankedPosts]);

  useFocusEffect(useCallback(()=>{setScreenFocused(true);return()=>setScreenFocused(false);},[]));
  useEffect(()=>{const subscription=AppState.addEventListener('change',(state)=>setAppActive(state==='active'));return()=>subscription.remove();},[]);
  useEffect(()=>{if(activeVideoPostId&&!visiblePosts.some((post)=>post.id===activeVideoPostId))setActiveVideoPostId(undefined);},[activeVideoPostId,visiblePosts]);

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

  const {upcomingEvents,recentPastEvents,archivedEvents}=useMemo(()=>{
    const referenceTime=Date.now();
    const filtered=filter==='All'?events:filter==='Sports'?events.filter((event)=>event.category==='Sports & Rec'):filter==='Campus'?events.filter((event)=>event.category==='Campus Event'):events.filter((event)=>event.category===filter);
    const upcoming:FomoEvent[]=[]; const recent:FomoEvent[]=[]; const archived:FomoEvent[]=[];
    filtered.forEach((event)=>{
      if(referenceTime<eventDayEnd(event))upcoming.push(event);
      else if(referenceTime<pastArchiveTime(event))recent.push(event);
      else archived.push(event);
    });
    const newestFirst=(a:FomoEvent,b:FomoEvent)=>eventDayEnd(b)-eventDayEnd(a);
    return {upcomingEvents:upcoming,recentPastEvents:recent.sort(newestFirst),archivedEvents:archived.sort(newestFirst)};
  },[events,filter]);
  const weeklyEvents=selectNextWeeklyOccurrences(upcomingEvents);
  const oneTimeEvents=upcomingEvents.filter((event)=>!event.recurrence);
  const friendEvents=oneTimeEvents.filter((e)=>e.attendeeIds.some((id)=>friendIds.includes(id)));
  const interestMatches=oneTimeEvents.filter((e)=>{const c=e.category.toLowerCase();return interests.some((i)=>i==='parties'?/(social|party)/.test(c):i==='sports'?/sport/.test(c):i==='clubs'?/club/.test(c):i==='study'?/study/.test(c):i==='campus'?/campus/.test(c):i==='music'?/music/.test(c):i==='social'?/social/.test(c):i==='gaming'?/gaming|game/.test(c):false);});
  const now=new Date(); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  const thisWeek=oneTimeEvents.filter((e)=>{const d=new Date(`${e.eventDate}T12:00:00`).getTime();return d>=today&&d<=today+7*86400000;});
  const featured=friendEvents[0]??oneTimeEvents.find((e)=>e.trending)??oneTimeEvents[0];
  const rest=oneTimeEvents.filter((e)=>e.id!==featured?.id);
  const exploreEvents=[...friendEvents,...interestMatches,...thisWeek,...rest]
    .filter((event,index,all)=>event.id!==featured?.id&&all.findIndex((candidate)=>candidate.id===event.id)===index);
  const visibleExploreEvents=showAllExplore?exploreEvents:exploreEvents.slice(0,3);
  const hiddenExploreCount=Math.max(0,exploreEvents.length-visibleExploreEvents.length);
  const indicatorX=scrollX.interpolate({inputRange:[0,width,width*2],outputRange:[0,TAB_WIDTH,TAB_WIDTH*2],extrapolate:'clamp'});

  const switchMode=(next:HomeMode)=>{
    setMode(next); Haptics.selectionAsync().catch(()=>{});
    pagerRef.current?.scrollTo({x:homeModes.indexOf(next)*width,animated:true});
  };
  const onReaction=useCallback(async(post:FeedPost,reaction?:ReactionKind)=>{try{await reactToPost(post.id,reaction);}catch(error:any){Alert.alert('Couldn’t react',friendlyErrorMessage(error,'Try again.'));}},[reactToPost]);
  const onComment=useCallback(async(post:FeedPost,body:string)=>{try{await addComment(post.id,body);}catch(error:any){Alert.alert('Couldn’t comment',friendlyErrorMessage(error,'Try again.'));throw error;}},[addComment]);
  const onCommentDelete=useCallback(async(commentId:string)=>{try{await removeComment(commentId);}catch(error:any){Alert.alert('Couldn’t delete comment',friendlyErrorMessage(error,'Try again.'));throw error;}},[removeComment]);
  const keepCommentVisible=useCallback((target:number)=>{setTimeout(()=>{const responder=(feedListRef.current as any)?.getScrollResponder?.();responder?.scrollResponderScrollNativeHandleToKeyboard?.(target,112,true);},120);},[]);
  const tryRestoreFeed=()=>{
    const target=feedRestoreTargetRef.current;
    const viewport=feedViewportHeightRef.current;
    if(feedRestoreStartedRef.current||target<=0||viewport<=0||feedContentHeightRef.current<target+viewport)return;
    feedRestoreStartedRef.current=true;
    requestAnimationFrame(()=>feedListRef.current?.scrollToOffset({offset:target,animated:false}));
  };
  const onFeedLayout=(height:number)=>{
    feedViewportHeightRef.current=height;
    if(!feedRestoreCompleteRef.current)setFeedRestoreMinHeight(feedRestoreTargetRef.current+height);
    tryRestoreFeed();
  };
  const onFeedContentSizeChange=(height:number)=>{
    feedContentHeightRef.current=height;
    if(feedRestoreCompleteRef.current&&height>feedRestoreTargetRef.current+feedViewportHeightRef.current)setFeedRestoreMinHeight(undefined);
    tryRestoreFeed();
  };
  const onFeedScroll=(y:number)=>{
    if(!feedRestoreCompleteRef.current){
      if(feedRestoreStartedRef.current&&Math.abs(y-feedRestoreTargetRef.current)<=1){
        feedRestoreCompleteRef.current=true;
        savedFeedY=y;
        if(feedContentHeightRef.current>feedRestoreTargetRef.current+feedViewportHeightRef.current)setFeedRestoreMinHeight(undefined);
      }
      return;
    }
    savedFeedY=y;
  };
  const categoryFilters=<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
    {filters.map((item)=><Pressable key={item} onPress={()=>{setFilter(item);setShowAllExplore(false);Haptics.selectionAsync().catch(()=>{});}} style={({pressed})=>[styles.filter,filter===item&&styles.filterActive,pressed&&styles.pressed]}><Text style={[styles.filterText,filter===item&&styles.filterTextActive]}>{item}</Text></Pressable>)}
  </ScrollView>;

  const discoverPage=<ScrollView
    style={{width}}
    showsVerticalScrollIndicator={false}
    contentOffset={{x:0,y:savedDiscoverY}}
    onScroll={(e)=>{savedDiscoverY=e.nativeEvent.contentOffset.y;}} scrollEventThrottle={32}
    contentContainerStyle={[styles.discover,{width}]}
    refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshAll} tintColor={colors.accent2}/>}
  >
    {syncError?<View style={styles.error}><Ionicons name="cloud-offline-outline" color={colors.warning} size={16}/><Text style={styles.errorText}>{syncError}</Text></View>:null}
    {discoverMode==='Upcoming'?<>
      <View style={styles.filterBlock}>{categoryFilters}</View>

      <View style={styles.featuredSection}>
        <View style={styles.sectionHead}>
          <View><Text style={styles.sectionKicker}>PICKED FOR YOU</Text><Text style={styles.sectionTitle}>Up next</Text></View>
          <View style={styles.sectionActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Open event map" onPress={()=>router.push('/(tabs)/map')} style={({pressed})=>[styles.iconAction,pressed&&styles.pressed]}><Ionicons name="map-outline" color={colors.text} size={18}/></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Show recent event highlights" onPress={()=>{setDiscoverMode('Past Highlights');Haptics.selectionAsync().catch(()=>{});}} style={({pressed})=>[styles.recentAction,pressed&&styles.pressed]}><Ionicons name="time-outline" color={colors.accent2} size={16}/><Text style={styles.recentActionText}>Highlights</Text>{recentPastEvents.length?<View style={styles.recentCount}><Text style={styles.recentCountText}>{recentPastEvents.length}</Text></View>:null}</Pressable>
          </View>
        </View>
        {featured?<FeaturedEvent event={featured} people={people} friendIds={friendIds}/>:<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="moon-outline" color={colors.accent2} size={22}/></View><Text style={styles.emptyTitle}>Quiet right now.</Text><Text style={styles.emptyBody}>Be the person who puts something on.</Text><Pressable onPress={()=>router.push('/(tabs)/create')} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Create something</Text><Ionicons name="arrow-forward" color={colors.white} size={14}/></Pressable></View>}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>HAPPENS EVERY WEEK</Text><Text style={styles.sectionTitle}>Weekly Rotation</Text></View><Pressable accessibilityRole="button" accessibilityLabel="See all weekly events" onPress={()=>router.push('/weekly-rotation')} style={({pressed})=>[styles.sectionAction,pressed&&styles.pressed]}><Text style={styles.sectionActionText}>See All</Text><Ionicons name="arrow-forward" color={colors.muted} size={14}/></Pressable></View>
        {weeklyEvents.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeklyRail}>{weeklyEvents.slice(0,6).map((event)=><WeeklyRotationCard key={event.recurrence?.seriesId??event.id} event={event}/>)}</ScrollView>:<Pressable accessibilityRole="button" onPress={()=>router.push('/weekly-rotation')} style={({pressed})=>[styles.weeklyEmpty,pressed&&styles.pressed]}><View style={styles.weeklyEmptyIcon}><Ionicons name="repeat" color={colors.accent2} size={20}/></View><View style={styles.weeklyEmptyCopy}><Text style={styles.weeklyEmptyTitle}>The rotation is warming up.</Text><Text style={styles.weeklyEmptyBody}>Verified weekly staples will collect here.</Text></View><Ionicons name="chevron-forward" color={colors.subtle} size={17}/></Pressable>}
      </View>
      {exploreEvents.length?<View style={styles.section}>
        <View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>AROUND CAMPUS</Text><Text style={styles.sectionTitle}>Keep exploring</Text></View>{exploreEvents.length>3?<Pressable accessibilityRole="button" accessibilityLabel={showAllExplore?'Show fewer events':`Show all ${exploreEvents.length} events`} onPress={()=>{setShowAllExplore((current)=>!current);Haptics.selectionAsync().catch(()=>{});}} style={({pressed})=>[styles.sectionAction,pressed&&styles.pressed]}><Text style={styles.sectionActionText}>{showAllExplore?'Show Less':'See All'}</Text><Ionicons name={showAllExplore?'chevron-up':'chevron-down'} color={colors.muted} size={14}/></Pressable>:null}</View>
        {visibleExploreEvents.map((event)=><EventCard key={event.id} compact event={event} people={people} friendIds={friendIds}/>)}
        {hiddenExploreCount?<Text style={styles.moreHint}>{hiddenExploreCount} more waiting when you’re ready.</Text>:null}
      </View>:null}
    </>:<View style={styles.highlights}>
      <View style={styles.sectionHead}><View><Text style={styles.sectionKicker}>LAST FOUR DAYS</Text><Text style={styles.sectionTitle}>Past highlights</Text></View><Pressable accessibilityRole="button" onPress={()=>{setDiscoverMode('Upcoming');Haptics.selectionAsync().catch(()=>{});}} style={({pressed})=>[styles.sectionAction,pressed&&styles.pressed]}><Ionicons name="arrow-back" color={colors.muted} size={14}/><Text style={styles.sectionActionText}>Upcoming</Text></Pressable></View>
      <Text style={styles.sectionIntro}>Catch the photos and moments while they’re still fresh.</Text>
      <View style={styles.highlightFilters}>{categoryFilters}</View>
      {recentPastEvents.length?recentPastEvents.map((event)=><EventCard key={`recent-${event.id}`} compact event={event} people={people} friendIds={friendIds}/>):<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="sparkles-outline" color={colors.accent2} size={22}/></View><Text style={styles.emptyTitle}>No recent highlights.</Text><Text style={styles.emptyBody}>Events that ended in the last four days will appear here.</Text></View>}
    </View>}
  </ScrollView>;

  const pastPage=<ScrollView
    style={{width}}
    showsVerticalScrollIndicator={false}
    contentOffset={{x:0,y:savedPastY}}
    onScroll={(e)=>{savedPastY=e.nativeEvent.contentOffset.y;}} scrollEventThrottle={32}
    contentContainerStyle={[styles.past,{width}]}
    refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshAll} tintColor={colors.accent2}/>}
  >
    {syncError?<View style={styles.error}><Ionicons name="cloud-offline-outline" color={colors.warning} size={16}/><Text style={styles.errorText}>{syncError}</Text></View>:null}
    {categoryFilters}
    <View style={styles.archiveHead}>
      <View style={styles.archiveIcon}><Ionicons name="archive-outline" color={colors.accent2} size={23}/></View>
      <Text style={styles.sectionKicker}>EVENT ARCHIVE</Text>
      <Text style={styles.archiveTitle}>Past events</Text>
      <Text style={styles.archiveBody}>Events move here four days after they end. Open one anytime to revisit its details and moments.</Text>
    </View>
    {archivedEvents.length?<View style={styles.archiveList}>{archivedEvents.map((event)=><EventCard key={`archived-${event.id}`} compact event={event} people={people} friendIds={friendIds}/>)}</View>:<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="time-outline" color={colors.accent2} size={22}/></View><Text style={styles.emptyTitle}>No past events yet.</Text><Text style={styles.emptyBody}>{filter==='All'?'Older events will collect here automatically.':'No archived events match this category.'}</Text></View>}
  </ScrollView>;

  const feedHeader=<>
    <View style={styles.feedTop}><View style={styles.feedTopline}><View style={styles.feedPulse}/><Text style={styles.feedEyebrow}>CAMPUS FEED</Text></View><Text style={styles.feedHint} numberOfLines={1}>Recent moments from your people and events</Text></View>
    <View style={styles.feedModes} accessibilityRole="tablist">
      {feedModes.map((item)=><Pressable key={item} accessibilityRole="tab" accessibilityState={{selected:feedMode===item}} onPress={()=>{setFeedMode(item);setCommentPostId(undefined);setActiveVideoPostId(undefined);Haptics.selectionAsync().catch(()=>{});}} style={({pressed})=>[styles.feedMode,feedMode===item&&styles.feedModeActive,pressed&&styles.pressed]}><Text style={[styles.feedModeText,feedMode===item&&styles.feedModeTextActive]}>{item}</Text></Pressable>)}
    </View>
    <View style={styles.feedDivider}/>
  </>;
  const renderFeedPost=useCallback(({item:post}:{item:FeedPost})=><FeedPostCard post={post} people={people} events={events} currentUserId={currentUser.id} videoActive={appActive&&screenFocused&&mode==='Feed'&&activeVideoPostId===post.id} commentsExpanded={commentPostId===post.id} onReact={(reaction)=>onReaction(post,reaction)} onToggleComments={()=>setCommentPostId((current)=>current===post.id?undefined:post.id)} onAddComment={(body)=>onComment(post,body)} onDeleteComment={onCommentDelete} onCommentInputFocus={keepCommentVisible} onViewed={()=>markPostViewed(post.id)} onRemoveTag={()=>removeMyTag(post.id)} onDelete={()=>Alert.alert('Delete post?','This removes the post for everyone.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>removePost(post.id)}])} onReport={()=>showReportSheet({type:'post',id:post.id},report)}/>,[activeVideoPostId,appActive,commentPostId,currentUser.id,events,keepCommentVisible,markPostViewed,mode,onComment,onCommentDelete,onReaction,people,removeMyTag,removePost,report,screenFocused]);
  const feedPage=<FlatList
    ref={feedListRef}
    style={{width}}
    showsVerticalScrollIndicator={false}
    onLayout={(e)=>onFeedLayout(e.nativeEvent.layout.height)}
    onContentSizeChange={(_,height)=>onFeedContentSizeChange(height)}
    onScroll={(e)=>onFeedScroll(e.nativeEvent.contentOffset.y)} scrollEventThrottle={32}
    contentContainerStyle={[styles.feed,{width},feedRestoreMinHeight?{minHeight:feedRestoreMinHeight}:null]}
    refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshFeed} tintColor={colors.accent2}/>}
    viewabilityConfig={viewabilityConfig}
    onViewableItemsChanged={onViewableItemsChanged}
    data={visiblePosts}
    extraData={`${commentPostId??''}:${activeVideoPostId??''}:${mode}:${appActive}:${screenFocused}`}
    keyExtractor={(post)=>post.id}
    renderItem={renderFeedPost}
    automaticallyAdjustKeyboardInsets={Platform.OS==='ios'}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'}
    ListHeaderComponent={feedHeader}
    ListEmptyComponent={<View style={styles.feedEmpty}><View style={styles.emptyIcon}><Ionicons name={feedMode==='Friends'?'people-outline':'images-outline'} color={colors.accent2} size={24}/></View><Text style={styles.emptyTitle}>{feedMode==='Friends'?'No friend posts yet.':'Nothing here yet.'}</Text><Text style={styles.emptyBody}>{feedMode==='Friends'?'Posts from your confirmed friends will appear here.':'Be the first to show what’s happening.'}</Text><Pressable onPress={()=>router.push('/(tabs)/create')} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Create something</Text><Ionicons name="arrow-forward" color={colors.white} size={14}/></Pressable></View>}
    ListFooterComponent={hasMoreFeed?<Pressable onPress={()=>loadMoreFeed()} style={styles.loadMore}><Text style={styles.loadMoreText}>Load more</Text><Ionicons name="chevron-down" color={colors.muted} size={14}/></Pressable>:null}
    initialNumToRender={3}
    maxToRenderPerBatch={3}
    updateCellsBatchingPeriod={50}
    windowSize={5}
    removeClippedSubviews={Platform.OS==='android'}
  />;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><BrandWordmark width={78}/><View style={styles.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={()=>router.push('/search')} style={({pressed})=>[styles.headerButton,pressed&&styles.pressed]}><Ionicons name="search" color={colors.text} size={19}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={()=>router.push('/notifications')} style={({pressed})=>[styles.headerButton,pressed&&styles.pressed]}><Ionicons name={unreadNotificationCount?'notifications':'notifications-outline'} color={colors.text} size={19}/>{unreadNotificationCount?<View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{Math.min(unreadNotificationCount,9)}{unreadNotificationCount>9?'+':''}</Text></View>:null}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="Find people" onPress={()=>router.push('/(tabs)/friends')} style={({pressed})=>[styles.headerButton,pressed&&styles.pressed]}><Ionicons name="people-outline" color={colors.text} size={19}/></Pressable></View></View>

    <View style={styles.modeShell}>
      <View style={styles.modeRow}>
        {homeModes.map((item)=><Pressable key={item} onPress={()=>switchMode(item)} style={styles.modeItem}><Text style={[styles.modeText,mode===item&&styles.modeTextActive]}>{item}</Text></Pressable>)}
        <Animated.View style={[styles.modeRule,{transform:[{translateX:indicatorX}]}]}/>
      </View>
    </View>

    <Animated.ScrollView
      ref={pagerRef as any}
      horizontal pagingEnabled directionalLockEnabled nestedScrollEnabled bounces={false}
      showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
      onScroll={Animated.event([{nativeEvent:{contentOffset:{x:scrollX}}}],{useNativeDriver:true})}
      onMomentumScrollEnd={(e)=>setMode(homeModes[Math.max(0,Math.min(homeModes.length-1,Math.round(e.nativeEvent.contentOffset.x/width)))])}
      style={styles.pager}
    >{discoverPage}{feedPage}{pastPage}</Animated.ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},pager:{flex:1},header:{height:54,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},headerActions:{height:42,flexDirection:'row',alignItems:'center',paddingHorizontal:1,borderRadius:21,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},headerButton:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},notificationBadge:{position:'absolute',right:2,top:2,minWidth:15,height:15,borderRadius:8,backgroundColor:colors.accent2,alignItems:'center',justifyContent:'center',paddingHorizontal:3,borderWidth:2,borderColor:colors.surface},notificationBadgeText:{color:colors.white,fontSize:7,fontWeight:'900'},pressed:{opacity:.72,transform:[{scale:.97}]},
  modeShell:{alignItems:'center',paddingTop:1,paddingBottom:10},modeRow:{width:TAB_WIDTH*3+4,height:42,flexDirection:'row',position:'relative',padding:2,borderRadius:21,backgroundColor:colors.glassSoft,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},modeItem:{width:TAB_WIDTH,height:38,alignItems:'center',justifyContent:'center',zIndex:1},modeText:{color:colors.muted,fontSize:12,fontWeight:'800',letterSpacing:.1},modeTextActive:{color:colors.text,fontWeight:'900'},modeRule:{position:'absolute',left:2,bottom:2,width:TAB_WIDTH,height:38,borderRadius:19,backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.10)'},
  discover:{paddingHorizontal:16,paddingTop:0,paddingBottom:120},past:{paddingHorizontal:16,paddingTop:0,paddingBottom:120},error:{flexDirection:'row',alignItems:'center',gap:7,backgroundColor:colors.surface2,borderRadius:16,padding:12,marginTop:8,marginBottom:2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},errorText:{color:colors.warning,fontSize:10.5,flex:1},filterBlock:{marginTop:8},highlightFilters:{marginTop:-3,marginBottom:11},filters:{gap:7,paddingVertical:12,paddingRight:10},filter:{height:34,borderRadius:17,paddingHorizontal:13,alignItems:'center',justifyContent:'center',backgroundColor:colors.glassSoft,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},filterActive:{backgroundColor:colors.accentSoft,borderColor:'rgba(139,150,255,.42)'},filterText:{color:colors.muted,fontSize:10.5,fontWeight:'800'},filterTextActive:{color:colors.text,fontWeight:'900'},featuredSection:{marginTop:2},highlights:{marginTop:13},section:{marginTop:38},sectionHead:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:2,marginBottom:14},sectionActions:{flexDirection:'row',alignItems:'center',gap:7},sectionKicker:{color:colors.accent2,fontSize:9,fontWeight:'900',letterSpacing:1.15,marginBottom:3},sectionTitle:{color:colors.text,fontSize:21,fontWeight:'900',letterSpacing:-.45},sectionIntro:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:-7,marginBottom:2,paddingHorizontal:3},iconAction:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},recentAction:{minHeight:44,borderRadius:22,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},recentActionText:{color:colors.text,fontSize:10.5,fontWeight:'900'},recentCount:{minWidth:19,height:19,borderRadius:10,paddingHorizontal:5,alignItems:'center',justifyContent:'center',backgroundColor:colors.accentSoft},recentCountText:{color:colors.accent2,fontSize:8.5,fontWeight:'900'},sectionAction:{minHeight:44,borderRadius:22,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},sectionActionText:{color:colors.muted,fontSize:10.5,fontWeight:'800'},moreHint:{color:colors.subtle,fontSize:10.5,fontWeight:'700',textAlign:'center',marginTop:2},weeklyRail:{gap:11,paddingRight:4},weeklyEmpty:{minHeight:82,borderRadius:22,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,flexDirection:'row',alignItems:'center',padding:12},weeklyEmptyIcon:{width:44,height:44,borderRadius:19,backgroundColor:colors.accentSoft,alignItems:'center',justifyContent:'center'},weeklyEmptyCopy:{flex:1,minWidth:0,marginLeft:11},weeklyEmptyTitle:{color:colors.text,fontSize:13.5,fontWeight:'900'},weeklyEmptyBody:{color:colors.muted,fontSize:10.5,marginTop:3},archiveHead:{padding:18,borderRadius:26,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,marginTop:4},archiveIcon:{width:46,height:46,borderRadius:20,backgroundColor:colors.accentSoft,alignItems:'center',justifyContent:'center',marginBottom:15},archiveTitle:{color:colors.text,fontSize:25,lineHeight:29,fontWeight:'900',letterSpacing:-.6,marginTop:5},archiveBody:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:7},archiveList:{marginTop:14},empty:{padding:24,borderRadius:27,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,alignItems:'flex-start'},emptyIcon:{width:48,height:48,borderRadius:24,backgroundColor:colors.accentSoft,alignItems:'center',justifyContent:'center',marginBottom:12},emptyTitle:{color:colors.text,fontSize:17,fontWeight:'900'},emptyBody:{color:colors.muted,fontSize:11.5,lineHeight:17,marginTop:5},emptyButton:{height:38,borderRadius:19,backgroundColor:colors.accent,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:7,marginTop:14},emptyButtonText:{color:colors.white,fontSize:10,fontWeight:'900'},
  feed:{paddingBottom:120},feedTop:{paddingHorizontal:16,paddingTop:12,paddingBottom:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},feedTopline:{flexDirection:'row',alignItems:'center',gap:6},feedPulse:{width:6,height:6,borderRadius:3,backgroundColor:colors.accent2},feedEyebrow:{color:colors.text,fontSize:10.5,fontWeight:'900',letterSpacing:.9},feedHint:{flex:1,color:colors.subtle,fontSize:10,fontWeight:'700',textAlign:'right',marginLeft:10},feedModes:{height:52,flexDirection:'row',padding:4,borderRadius:24,backgroundColor:colors.surface,marginHorizontal:14,marginBottom:12,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},feedMode:{flex:1,minHeight:44,borderRadius:20,alignItems:'center',justifyContent:'center'},feedModeActive:{backgroundColor:colors.surface3,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.10)'},feedModeText:{color:colors.muted,fontSize:12,fontWeight:'800'},feedModeTextActive:{color:colors.text,fontWeight:'900'},feedDivider:{height:StyleSheet.hairlineWidth,backgroundColor:colors.line,marginHorizontal:16,marginBottom:1},feedEmpty:{alignItems:'center',paddingTop:78,paddingHorizontal:32},loadMore:{alignSelf:'center',height:38,borderRadius:19,backgroundColor:colors.surface2,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:6,marginTop:14},loadMoreText:{color:colors.muted,fontSize:9.5,fontWeight:'800'},
});
