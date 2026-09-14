import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, FlatList, Pressable, RefreshControl, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { FeedPostCard } from '@/components/FeedPostCard';
import { useApp } from '@/context/AppContext';
import type { FeedPost, ReactionKind } from '@/data/seed';
import { backendConfigured, supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { showReportSheet } from '@/utils/reporting';

const feedModes=['All','Friends'] as const;
type FeedMode=(typeof feedModes)[number];

export default function WebFeedScreen(){
  const router=useRouter();
  const {
    currentUser,events,people,followingIds,friendIds,posts,syncing,syncError,demoMode,
    refreshFeed,reactToPost,addComment,removeComment,markPostViewed,removeMyTag,removePost,
    report,loadMoreFeed,hasMoreFeed,
  }=useApp();
  const [feedMode,setFeedMode]=useState<FeedMode>('All');
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
  }),[friendIds,followingIds,posts]);
  const visiblePosts=useMemo(()=>feedMode==='Friends'
    ? rankedPosts.filter((post)=>friendIds.includes(post.authorId))
    : rankedPosts,[feedMode,friendIds,rankedPosts]);

  useFocusEffect(useCallback(()=>{setScreenFocused(true);return()=>setScreenFocused(false);},[]));
  useEffect(()=>{const subscription=AppState.addEventListener('change',(state)=>setAppActive(state==='active'));return()=>subscription.remove();},[]);
  useEffect(()=>{if(activeVideoPostId&&!visiblePosts.some((post)=>post.id===activeVideoPostId))setActiveVideoPostId(undefined);},[activeVideoPostId,visiblePosts]);
  useEffect(()=>{
    if(!commentPostId||demoMode||!backendConfigured||!supabase)return;
    const client=supabase;
    const channel=client.channel(`feed-comments-${commentPostId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'feed_comments',filter:`post_id=eq.${commentPostId}`},()=>refreshFeed())
      .subscribe();
    return()=>{client.removeChannel(channel);};
  },[commentPostId,demoMode,refreshFeed]);

  const onReaction=useCallback(async(post:FeedPost,reaction?:ReactionKind)=>{
    try{await reactToPost(post.id,reaction);}catch(error:any){Alert.alert('Couldn’t react',friendlyErrorMessage(error,'Try again.'));}
  },[reactToPost]);
  const onComment=useCallback(async(post:FeedPost,body:string)=>{
    try{await addComment(post.id,body);}catch(error:any){Alert.alert('Couldn’t comment',friendlyErrorMessage(error,'Try again.'));throw error;}
  },[addComment]);
  const onCommentDelete=useCallback(async(commentId:string)=>{
    try{await removeComment(commentId);}catch(error:any){Alert.alert('Couldn’t delete comment',friendlyErrorMessage(error,'Try again.'));throw error;}
  },[removeComment]);
  const confirmDelete=useCallback((postId:string)=>{
    if(typeof window!=='undefined'&&!window.confirm('Delete this post for everyone?'))return;
    removePost(postId).catch((error:any)=>Alert.alert('Couldn’t delete post',friendlyErrorMessage(error,'Try again.')));
  },[removePost]);

  const header=<View style={styles.header}>
    <View style={styles.headingRow}>
      <View style={styles.headingCopy}><Text style={styles.kicker}>YOUR CAMPUS</Text><Text style={styles.title}>Home</Text><Text style={styles.subtitle}>The latest from people and events around you.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Search FOMO" onPress={()=>router.push('/search')} style={({pressed,hovered}:any)=>[styles.searchButton,hovered&&styles.searchButtonHover,pressed&&styles.pressed]}><Ionicons name="search" color={colors.text} size={20}/><Text style={styles.searchText}>Search</Text></Pressable>
    </View>
    {syncError?<View style={styles.error}><Ionicons name="cloud-offline-outline" color={colors.warning} size={17}/><Text style={styles.errorText}>{syncError}</Text></View>:null}
    <View style={styles.modeRow} accessibilityRole="tablist">
      {feedModes.map((item)=><Pressable key={item} accessibilityRole="tab" accessibilityState={{selected:feedMode===item}} onPress={()=>{setFeedMode(item);setCommentPostId(undefined);setActiveVideoPostId(undefined);}} style={({pressed,hovered}:any)=>[styles.mode,feedMode===item&&styles.modeActive,hovered&&feedMode!==item&&styles.modeHover,pressed&&styles.pressed]}><Text style={[styles.modeText,feedMode===item&&styles.modeTextActive]}>{item}</Text></Pressable>)}
    </View>
  </View>;

  const renderPost=useCallback(({item:post}:{item:FeedPost})=><FeedPostCard
    post={post} people={people} events={events} currentUserId={currentUser.id}
    videoActive={appActive&&screenFocused&&activeVideoPostId===post.id}
    commentsExpanded={commentPostId===post.id}
    onReact={(reaction)=>onReaction(post,reaction)}
    onToggleComments={()=>setCommentPostId((current)=>current===post.id?undefined:post.id)}
    onAddComment={(body)=>onComment(post,body)} onDeleteComment={onCommentDelete}
    onViewed={()=>markPostViewed(post.id)} onRemoveTag={()=>removeMyTag(post.id)}
    onDelete={()=>confirmDelete(post.id)} onReport={()=>showReportSheet({type:'post',id:post.id},report)}
  />,[activeVideoPostId,appActive,commentPostId,confirmDelete,currentUser.id,events,markPostViewed,onComment,onCommentDelete,onReaction,people,removeMyTag,report,screenFocused]);

  return <SafeAreaView style={styles.safe} edges={[]}>
    <FlatList
      data={visiblePosts} keyExtractor={(post)=>post.id} renderItem={renderPost}
      contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshFeed} tintColor={colors.accent2}/>}
      viewabilityConfig={viewabilityConfig} onViewableItemsChanged={onViewableItemsChanged}
      extraData={`${commentPostId??''}:${activeVideoPostId??''}:${appActive}:${screenFocused}:${feedMode}`}
      keyboardShouldPersistTaps="handled" ListHeaderComponent={header}
      ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={feedMode==='Friends'?'people-outline':'images-outline'} color={colors.accent2} size={27}/></View><Text style={styles.emptyTitle}>{feedMode==='Friends'?'No friend posts yet':'Nothing here yet'}</Text><Text style={styles.emptyBody}>{feedMode==='Friends'?'Posts from your confirmed friends will appear here.':'Be the first to show what’s happening on campus.'}</Text><Pressable onPress={()=>router.push('/(tabs)/create')} style={({pressed})=>[styles.emptyButton,pressed&&styles.pressed]}><Ionicons name="add" color={colors.white} size={18}/><Text style={styles.emptyButtonText}>Create a post</Text></Pressable></View>}
      ListFooterComponent={hasMoreFeed?<Pressable accessibilityRole="button" onPress={()=>loadMoreFeed()} style={({pressed,hovered}:any)=>[styles.loadMore,hovered&&styles.loadMoreHover,pressed&&styles.pressed]}><Text style={styles.loadMoreText}>Load more</Text><Ionicons name="chevron-down" color={colors.muted} size={15}/></Pressable>:<View style={styles.footerSpace}/>}
      initialNumToRender={4} maxToRenderPerBatch={4} windowSize={7}
    />
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},list:{paddingHorizontal:10,paddingBottom:44},
  header:{paddingHorizontal:8,paddingTop:34,paddingBottom:12},headingRow:{flexDirection:'row',alignItems:'center',gap:16},headingCopy:{flex:1,minWidth:0},kicker:{color:colors.accent2,fontSize:12,fontWeight:'900',letterSpacing:1.25},title:{color:colors.text,fontSize:34,lineHeight:39,fontWeight:'900',letterSpacing:-1.1,marginTop:4},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginTop:5},
  searchButton:{minHeight:44,borderRadius:18,paddingHorizontal:15,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},searchButtonHover:{backgroundColor:colors.surface2},searchText:{color:colors.text,fontSize:14,fontWeight:'800'},
  error:{minHeight:48,marginTop:18,borderRadius:18,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:9,backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},errorText:{flex:1,color:colors.warning,fontSize:13,lineHeight:19},
  modeRow:{alignSelf:'flex-start',flexDirection:'row',gap:7,marginTop:24,padding:4,borderRadius:22,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},mode:{minWidth:94,minHeight:42,borderRadius:18,alignItems:'center',justifyContent:'center',paddingHorizontal:18},modeActive:{backgroundColor:colors.accentSoft,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(139,150,255,.3)'},modeHover:{backgroundColor:colors.glassSoft},modeText:{color:colors.muted,fontSize:14,fontWeight:'700'},modeTextActive:{color:colors.accent2,fontWeight:'900'},
  empty:{marginTop:56,marginHorizontal:8,padding:32,borderRadius:28,alignItems:'center',backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},emptyIcon:{width:58,height:58,borderRadius:23,alignItems:'center',justifyContent:'center',backgroundColor:colors.accentSoft},emptyTitle:{color:colors.text,fontSize:21,fontWeight:'900',marginTop:16},emptyBody:{maxWidth:390,color:colors.muted,fontSize:14,lineHeight:21,textAlign:'center',marginTop:7},emptyButton:{minHeight:46,borderRadius:20,paddingHorizontal:17,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:colors.accent,marginTop:18},emptyButtonText:{color:colors.white,fontSize:14,fontWeight:'900'},
  loadMore:{alignSelf:'center',minHeight:46,borderRadius:20,paddingHorizontal:18,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,marginTop:18},loadMoreHover:{backgroundColor:colors.surface3},loadMoreText:{color:colors.muted,fontSize:14,fontWeight:'800'},footerSpace:{height:24},pressed:{opacity:.72,transform:[{scale:.985}]},
});
