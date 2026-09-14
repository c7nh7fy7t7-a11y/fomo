import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FeedPost, FomoEvent, Person, ReactionKind } from '@/data/seed';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { colors } from '@/theme/colors';
import { timeAgo } from '@/utils/time';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const REACTIONS:{kind:ReactionKind;emoji:string}[]=[
  {kind:'heart',emoji:'❤️'}, {kind:'fire',emoji:'🔥'}, {kind:'laugh',emoji:'😂'}, {kind:'wow',emoji:'😮'}, {kind:'clap',emoji:'👏'},
];

function formatDuration(ms?:number){
  if(!ms)return undefined; const total=Math.max(0,Math.round(ms/1000)); const m=Math.floor(total/60); const s=total%60; return `${m}:${String(s).padStart(2,'0')}`;
}

function reactionHapticStutter(){
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});
  setTimeout(()=>Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{}),65);
  setTimeout(()=>Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{}),135);
  setTimeout(()=>Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{}),215);
  setTimeout(()=>Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{}),305);
  setTimeout(()=>Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{}),405);
  setTimeout(()=>Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{}),520);
}

function InlineVideo({uri,toggleToken,shouldPlay}:{uri:string;toggleToken:number;shouldPlay:boolean}){
  const player=useVideoPlayer(uri,(p)=>{p.loop=true;p.muted=true;});
  const {isPlaying}=useEvent(player,'playingChange',{isPlaying:player.playing});
  useEffect(()=>{if(!toggleToken)return;if(player.playing)player.pause();else player.play();},[toggleToken]);
  useEffect(()=>{try{if(shouldPlay)player.play();else player.pause();}catch{}},[player,shouldPlay]);
  useEffect(()=>()=>{try{player.pause();}catch{}},[player]);
  return <>
    <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" surfaceType="textureView" nativeControls={false} fullscreenOptions={{enable:true}} pointerEvents="none"/>
    {!isPlaying?<View pointerEvents="none" style={styles.playButton}><Ionicons name="play" color={colors.white} size={26}/></View>:null}
  </>;
}

export function FeedPostCard({
  post, people, events, currentUserId, videoActive=false, commentsExpanded=false, onReact, onToggleComments, onAddComment, onDeleteComment, onCommentInputFocus, onViewed, onRemoveTag, onDelete, onReport,
}: {
  post: FeedPost; people: Person[]; events: FomoEvent[]; currentUserId: string; videoActive?: boolean;
  commentsExpanded?: boolean; onReact: (reaction?: ReactionKind) => void; onToggleComments: () => void;
  onAddComment: (body:string) => Promise<void>; onDeleteComment: (commentId:string) => Promise<void>;
  onCommentInputFocus?: (target:number) => void;
  onViewed: () => void; onRemoveTag: () => void; onDelete: () => void; onReport?: () => void;
}) {
  const router = useRouter();
  const {width}=useWindowDimensions();
  const [cardWidth,setCardWidth]=useState<number>();
  const reduceMotion=useReducedMotion();
  const [imageAspect,setImageAspect]=useState<number|undefined>();
  const [videoToggleToken,setVideoToggleToken]=useState(0);
  const [mediaLoading,setMediaLoading]=useState(Platform.OS!=='web'&&post.mediaType!=='video'&&Boolean(post.mediaUrl));
  const [mediaFailed,setMediaFailed]=useState(false);
  const [commentBody,setCommentBody]=useState('');
  const [commentSending,setCommentSending]=useState(false);
  const commentInputRef=useRef<TextInput>(null);
  const lastMediaTap = useRef(0);
  const singleTapTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const heartBurst = useRef(new Animated.Value(0)).current;
  const rainParticles=useRef(Array.from({length:14},()=>new Animated.Value(0))).current;
  const [rainEmoji,setRainEmoji]=useState('❤️');
  const author = people.find((p) => p.id === post.authorId);
  const event = events.find((e) => e.id === post.eventId);
  const tagged = post.taggedUserIds.map((id) => people.find((p) => p.id === id)).filter(Boolean) as Person[];
  const mine = post.reactions.find((r) => r.userId === currentUserId)?.reaction;
  const reactionCounts = useMemo(() => {
    const counts: Partial<Record<ReactionKind, number>> = {};
    post.reactions.forEach((r) => counts[r.reaction] = (counts[r.reaction] ?? 0) + 1);
    return counts;
  }, [post.reactions]);
  const firstComment = post.comments[post.comments.length - 1];
  const firstCommentAuthor = firstComment ? people.find((p) => p.id === firstComment.authorId) : undefined;
  const mediaType=post.mediaType==='video'?'video':'image';
  const imageSource=useMemo(()=>post.mediaUrl?{uri:post.mediaUrl}:undefined,[post.mediaUrl]);
  const metadataAspect=post.mediaWidth&&post.mediaHeight?post.mediaWidth/post.mediaHeight:undefined;
  const rawAspect=metadataAspect??imageAspect??1.05;
  const boundedAspect=Math.max(.62,Math.min(1.85,rawAspect));
  const mediaWidth=Math.max(260,cardWidth??(Platform.OS==='web'?Math.min(width-20,760):width-20));
  const mediaHeight=Math.max(220,Math.min(560,mediaWidth/boundedAspect));

  useEffect(() => { onViewed(); }, [post.id]);
  useEffect(()=>{setMediaFailed(false);setMediaLoading(Platform.OS!=='web'&&post.mediaType!=='video'&&Boolean(post.mediaUrl));},[post.mediaUrl,post.mediaType]);
  useEffect(()=>()=>{if(singleTapTimer.current)clearTimeout(singleTapTimer.current);rainParticles.forEach((particle)=>particle.stopAnimation());},[]);
  const handleImageLoadStart=useCallback(()=>{if(Platform.OS!=='web')setMediaLoading(true);},[]);
  const handleImageLoad=useCallback((event:any)=>{
    setMediaLoading(false);
    const source=event.nativeEvent.source;
    if(source?.width&&source?.height){
      const nextAspect=source.width/source.height;
      setImageAspect((current)=>current===nextAspect?current:nextAspect);
    }
  },[]);
  const handleImageError=useCallback(()=>{setMediaLoading(false);setMediaFailed(true);},[]);

  const showHeartBurst = () => {
    heartBurst.stopAnimation(); heartBurst.setValue(0);
    Animated.sequence([
      Animated.spring(heartBurst, { toValue: 1, friction: 4.5, tension: 130, useNativeDriver: true }),
      Animated.delay(260), Animated.timing(heartBurst, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start();
  };
  const doubleLike=()=>{if(mine!=='heart')onReact('heart');Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});showHeartBurst();};
  const rainReaction=(emoji:string)=>{
    if(reduceMotion){Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});return;}
    setRainEmoji(emoji);
    rainParticles.forEach((particle)=>{particle.stopAnimation();particle.setValue(0);});
    Animated.parallel(rainParticles.map((particle,index)=>Animated.timing(particle,{toValue:1,duration:680+(index%4)*85,delay:(index%5)*34,useNativeDriver:true}))).start();
    reactionHapticStutter();
  };
  const selectReaction=(reaction:ReactionKind,emoji:string)=>{const removing=mine===reaction;onReact(removing?undefined:reaction);if(removing)Haptics.selectionAsync().catch(()=>{});else rainReaction(emoji);};
  const toggleComments=()=>{const opening=!commentsExpanded;onToggleComments();Haptics.selectionAsync().catch(()=>{});if(opening&&!post.comments.length)requestAnimationFrame(()=>requestAnimationFrame(()=>commentInputRef.current?.focus()));};
  const submitComment=async()=>{const body=commentBody.trim();if(!body||commentSending)return;setCommentSending(true);try{await onAddComment(body);setCommentBody('');}catch{}finally{setCommentSending(false);}};
  const handleMediaPress=()=>{const now=Date.now(),gap=now-lastMediaTap.current;if(gap>=70&&gap<=285){if(singleTapTimer.current){clearTimeout(singleTapTimer.current);singleTapTimer.current=null;}lastMediaTap.current=0;doubleLike();return;}lastMediaTap.current=now;if(mediaType==='video'){if(singleTapTimer.current)clearTimeout(singleTapTimer.current);singleTapTimer.current=setTimeout(()=>{setVideoToggleToken(n=>n+1);lastMediaTap.current=0;},300);}};
  if (!author) return null;

  return <View style={styles.post} onLayout={(event)=>{const next=Math.round(event.nativeEvent.layout.width);if(next>0&&next!==cardWidth)setCardWidth(next);}}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${author.name}'s profile`} onPress={()=>{Haptics.selectionAsync().catch(()=>{});router.push(`/profile/${author.id}`);}} style={({pressed})=>[styles.authorTap,pressed&&styles.avatarPressed]}>
        <Avatar person={author} size={48} circular/>
        <View style={styles.headerCopy}>
          <View style={styles.nameLine}><Text style={styles.name} numberOfLines={1}>{author.name}</Text><VerifiedBadge person={author} size={14}/></View>
          <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
        </View>
      </Pressable>
      {post.authorId===currentUserId?<Pressable accessibilityRole="button" accessibilityLabel="Delete post" onPress={onDelete} style={styles.more}><Ionicons name="ellipsis-horizontal" color={colors.muted} size={22}/></Pressable>:post.taggedUserIds.includes(currentUserId)?<Pressable accessibilityRole="button" onPress={onRemoveTag} style={styles.untagButton}><Text style={styles.untag}>Remove tag</Text></Pressable>:onReport?<Pressable accessibilityRole="button" accessibilityLabel="Report post" onPress={onReport} style={styles.more}><Ionicons name="ellipsis-horizontal" color={colors.muted} size={22}/></Pressable>:null}
    </View>

    <Pressable onPress={handleMediaPress} pressRetentionOffset={{top:5,left:5,right:5,bottom:5}} style={[styles.mediaWrap,{height:mediaHeight}]}>
      {post.mediaUrl&&!mediaFailed?mediaType==='video'?<><View style={[StyleSheet.absoluteFill,styles.mediaMissing]}><Ionicons name="videocam-outline" color={colors.subtle} size={30}/></View><InlineVideo uri={post.mediaUrl} toggleToken={videoToggleToken} shouldPlay={videoActive&&!commentsExpanded}/></>:<Image source={imageSource!} style={StyleSheet.absoluteFill} resizeMode="cover" onLoadStart={handleImageLoadStart} onLoad={handleImageLoad} onError={handleImageError}/>:<View style={[StyleSheet.absoluteFill,styles.mediaMissing]}><Ionicons name={mediaType==='video'?'videocam-outline':'image-outline'} color={colors.subtle} size={34}/><Text style={styles.mediaMissingText}>Media unavailable</Text></View>}
      {Platform.OS!=='web'&&mediaLoading?<View pointerEvents="none" style={[StyleSheet.absoluteFill,styles.mediaLoading]}><Animated.View style={styles.loadingShimmer}/></View>:null}
      <View pointerEvents="none" style={styles.mediaEdge}/>
      {mediaType==='video'&&post.mediaDurationMs?<View pointerEvents="none" style={styles.duration}><Text style={styles.durationText}>{formatDuration(post.mediaDurationMs)}</Text></View>:null}
      <Animated.View pointerEvents="none" style={[styles.heartBurst,{opacity:heartBurst,transform:[{scale:heartBurst.interpolate({inputRange:[0,1],outputRange:[.55,1]})},{rotate:'-7deg'}]}]}><Ionicons name="heart" color="#FFFFFF" size={88} style={styles.heartShadow}/></Animated.View>
    </Pressable>

    <View style={styles.body}>
      {event?<Pressable accessibilityRole="button" accessibilityLabel={`View event: ${event.title}`} onPress={()=>router.push(`/event/${event.id}`)} style={({pressed})=>[styles.eventContext,pressed&&styles.actionPressed]}><Ionicons name="calendar-outline" color={colors.accent2} size={16}/><Text style={styles.context} numberOfLines={1}>{event.title}</Text><Ionicons name="chevron-forward" color={colors.muted} size={14}/></Pressable>:null}
      {post.caption?<Text style={styles.caption}><Text style={styles.captionName}>@{author.username}</Text>  {post.caption}</Text>:null}
      {tagged.length?<View style={styles.tagLine}><Text style={styles.tags}>with</Text>{tagged.slice(0,2).map((person,index)=><Pressable accessibilityRole="button" accessibilityLabel={`View ${person.name}'s profile`} key={person.id} onPress={()=>router.push(`/profile/${person.id}`)} style={styles.tagTap}><Text style={styles.tagName} numberOfLines={1}>{person.name.split(' ')[0]}{index<tagged.slice(0,2).length-1?',':''}</Text></Pressable>)}{tagged.length>2?<Text style={styles.tags}>+{tagged.length-2}</Text>:null}</View>:null}
      <View style={styles.reactions}>
        <View pointerEvents="none" style={styles.reactionRain}>{rainParticles.map((particle,index)=><Animated.Text key={index} style={[styles.rainEmoji,{left:`${4+(index*19)%91}%`,opacity:particle.interpolate({inputRange:[0,.08,.82,1],outputRange:[0,1,1,0]}),transform:[{translateY:particle.interpolate({inputRange:[0,1],outputRange:[-175,12]})},{translateX:particle.interpolate({inputRange:[0,.5,1],outputRange:[0,index%2?8:-8,0]})},{rotate:particle.interpolate({inputRange:[0,1],outputRange:['0deg',`${index%2?180:-180}deg`]})},{scale:particle.interpolate({inputRange:[0,.15,1],outputRange:[.65,1,.9]})}]}]}>{rainEmoji}</Animated.Text>)}</View>
        <View style={styles.reactionRow}>{REACTIONS.map(({kind,emoji})=>{const count=reactionCounts[kind]??0;const selected=mine===kind;return <Pressable key={kind} accessibilityRole="button" accessibilityLabel={`${kind} reaction, ${count}`} accessibilityHint={selected?'Tap to remove your reaction':'Tap to react'} accessibilityState={{selected}} onPress={()=>selectReaction(kind,emoji)} style={({pressed})=>[styles.reactionOption,selected&&styles.reactionOptionSelected,pressed&&styles.actionPressed]}><Text style={styles.reactionOptionEmoji}>{emoji}</Text><Text numberOfLines={1} style={[styles.reactionOptionCount,selected&&styles.reactionOptionCountSelected]}>{count||' '}</Text></Pressable>;})}</View>
      </View>
      <View style={styles.footerLine}><Pressable accessibilityRole="button" accessibilityState={{expanded:commentsExpanded}} onPress={toggleComments} style={styles.commentToggle}><Ionicons name="chatbubble-outline" color={commentsExpanded?colors.accent2:colors.muted} size={18}/><Text style={styles.comments}>{commentsExpanded?'Hide comments':post.comments.length===1?'View comment':post.comments.length?`View all ${post.comments.length} comments`:'Add a comment'}</Text><Ionicons name={commentsExpanded?'chevron-up':'chevron-down'} color={colors.muted} size={14}/></Pressable><Text numberOfLines={1} style={styles.views}>{post.viewCount} {post.viewCount===1?'view':'views'}</Text></View>
      {!commentsExpanded&&firstComment&&firstCommentAuthor?<Pressable accessibilityRole="button" accessibilityLabel="View comments" onPress={toggleComments} style={styles.commentPreview}><Text style={styles.commentPreviewText} numberOfLines={2}><Text style={styles.commentPreviewName}>@{firstCommentAuthor.username}</Text>  {firstComment.body}</Text></Pressable>:null}
      {commentsExpanded?<View style={styles.commentsThread}>{post.comments.length?post.comments.map((comment)=>{const commentAuthor=people.find((person)=>person.id===comment.authorId);if(!commentAuthor)return null;return <View key={comment.id} style={styles.inlineComment}><Avatar person={commentAuthor} size={32}/><View style={styles.inlineCommentCopy}><View style={styles.inlineCommentMeta}><Text style={styles.inlineCommentName}>@{commentAuthor.username}</Text><VerifiedBadge person={commentAuthor} size={11}/><Text style={styles.inlineCommentTime}>{timeAgo(comment.createdAt)}</Text></View><Text style={styles.inlineCommentBody}>{comment.body}</Text></View>{comment.authorId===currentUserId?<Pressable accessibilityRole="button" accessibilityLabel="Delete comment" hitSlop={8} onPress={()=>onDeleteComment(comment.id).catch(()=>{})} style={({pressed})=>[styles.inlineDelete,pressed&&styles.actionPressed]}><Ionicons name="trash-outline" color={colors.subtle} size={14}/></Pressable>:null}</View>}):<Text style={styles.inlineEmpty}>Be the first to comment.</Text>}<View style={styles.inlineComposer}><TextInput ref={commentInputRef} value={commentBody} onChangeText={setCommentBody} onFocus={(event)=>onCommentInputFocus?.(event.nativeEvent.target)} editable={!commentSending} placeholder="Add a comment…" placeholderTextColor={colors.subtle} maxLength={600} returnKeyType="send" onSubmitEditing={submitComment} style={styles.inlineInput}/><Pressable accessibilityRole="button" accessibilityLabel="Send comment" disabled={!commentBody.trim()||commentSending} onPress={submitComment} style={({pressed})=>[styles.inlineSend,(!commentBody.trim()||commentSending)&&styles.inlineSendDisabled,pressed&&commentBody.trim()&&!commentSending?styles.actionPressed:null]}><Ionicons name="arrow-up" color={commentBody.trim()&&!commentSending?colors.white:colors.subtle} size={17}/></Pressable></View></View>:null}
    </View>
    <View style={styles.divider}/>
  </View>;
}

const styles=StyleSheet.create({
  post:{marginBottom:12},
  header:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingTop:18,paddingBottom:14,gap:8},
  authorTap:{flex:1,minWidth:0,minHeight:48,flexDirection:'row',alignItems:'center'},
  avatarPressed:{opacity:.75},
  headerCopy:{flex:1,marginLeft:12,minWidth:0},
  nameLine:{flexDirection:'row',alignItems:'center',gap:6},
  name:{flexShrink:1,color:colors.text,fontSize:16,fontWeight:'800',letterSpacing:-.25},
  time:{color:colors.muted,fontSize:12,fontWeight:'500',marginTop:4},
  more:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},
  untagButton:{minHeight:44,paddingHorizontal:10,borderRadius:16,backgroundColor:colors.surface,justifyContent:'center'},
  untag:{color:colors.muted,fontSize:11,fontWeight:'700'},
  mediaWrap:{marginHorizontal:10,borderRadius:24,overflow:'hidden',backgroundColor:colors.surface2},
  mediaLoading:{backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},
  loadingShimmer:{width:64,height:6,borderRadius:3,backgroundColor:colors.surface3},
  mediaMissingText:{color:colors.muted,fontSize:13,marginTop:8,fontWeight:'600'},
  mediaMissing:{alignItems:'center',justifyContent:'center'},
  mediaEdge:{...StyleSheet.absoluteFill,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.11)',borderRadius:24},
  duration:{position:'absolute',right:12,bottom:12,backgroundColor:'rgba(9,10,11,.76)',paddingHorizontal:9,paddingVertical:5,borderRadius:10},
  durationText:{color:colors.white,fontSize:12,fontWeight:'700'},
  playButton:{position:'absolute',left:'50%',top:'50%',marginLeft:-28,marginTop:-28,width:56,height:56,borderRadius:22,backgroundColor:'rgba(10,12,14,.70)',alignItems:'center',justifyContent:'center',paddingLeft:3,borderWidth:1,borderColor:'rgba(255,255,255,.22)'},
  heartBurst:{position:'absolute',left:'50%',top:'50%',marginLeft:-44,marginTop:-44},
  heartShadow:{textShadowColor:'rgba(0,0,0,.35)',textShadowRadius:16,textShadowOffset:{width:0,height:5}},
  body:{paddingHorizontal:16,paddingTop:12},
  eventContext:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,marginTop:-6,marginBottom:4},
  context:{flexShrink:1,color:colors.accent2,fontSize:13,fontWeight:'700'},
  caption:{color:colors.text,fontSize:15,lineHeight:23,letterSpacing:-.08},
  captionName:{fontWeight:'800'},
  tagLine:{flexDirection:'row',alignItems:'center',gap:5,marginTop:3},
  tags:{color:colors.muted,fontSize:12},
  tagTap:{minWidth:44,minHeight:44,maxWidth:'34%',justifyContent:'center'},
  tagName:{color:colors.text,fontSize:13,fontWeight:'700'},
  actionPressed:{opacity:.65},
  reactions:{marginTop:14},
  reactionRow:{flexDirection:'row',alignItems:'stretch',gap:2,padding:4,borderRadius:22,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  reactionOption:{flex:1,minWidth:44,minHeight:62,borderRadius:17,alignItems:'center',justifyContent:'center',paddingHorizontal:2,paddingVertical:6,borderWidth:StyleSheet.hairlineWidth,borderColor:'transparent'},
  reactionOptionSelected:{backgroundColor:colors.accentSoft,borderColor:'rgba(139,150,255,.28)'},
  reactionOptionEmoji:{fontSize:25,lineHeight:31},
  reactionOptionCount:{color:colors.muted,fontSize:12,lineHeight:16,fontWeight:'700',fontVariant:['tabular-nums'],maxWidth:'100%'},
  reactionOptionCountSelected:{color:colors.accent2,fontWeight:'900'},
  reactionRain:{position:'absolute',left:0,right:0,bottom:50,height:190,zIndex:20},
  rainEmoji:{position:'absolute',bottom:0,fontSize:21,textShadowColor:'rgba(0,0,0,.28)',textShadowRadius:5},
  footerLine:{flexDirection:'row',alignItems:'center',gap:12,marginTop:6},
  commentToggle:{flex:1,minHeight:44,flexDirection:'row',alignItems:'center',gap:7,paddingVertical:6},
  comments:{flexShrink:1,color:colors.muted,fontSize:13,lineHeight:19,fontWeight:'600'},
  views:{maxWidth:'28%',color:colors.muted,fontSize:12,fontVariant:['tabular-nums']},
  commentPreview:{minHeight:44,justifyContent:'center',marginTop:2,paddingLeft:12,paddingVertical:8,borderLeftWidth:2,borderLeftColor:colors.surface3},
  commentPreviewText:{color:colors.muted,fontSize:13,lineHeight:20},
  commentPreviewName:{color:colors.text,fontWeight:'700'},
  commentsThread:{marginTop:6,paddingTop:16,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.line},
  inlineComment:{flexDirection:'row',alignItems:'flex-start',marginBottom:16},
  inlineCommentCopy:{flex:1,minWidth:0,marginLeft:10,paddingTop:1},
  inlineCommentMeta:{flexDirection:'row',alignItems:'center',gap:5,flexWrap:'wrap'},
  inlineCommentName:{flexShrink:1,color:colors.text,fontSize:13,fontWeight:'800'},
  inlineCommentTime:{color:colors.muted,fontSize:11,fontWeight:'500'},
  inlineCommentBody:{color:colors.text,fontSize:14,lineHeight:21,marginTop:4},
  inlineDelete:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',marginLeft:4},
  inlineEmpty:{color:colors.muted,fontSize:14,textAlign:'center',paddingVertical:12},
  inlineComposer:{minHeight:54,borderRadius:27,backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,flexDirection:'row',alignItems:'center',paddingLeft:16,paddingRight:4,marginTop:2},
  inlineInput:{flex:1,minHeight:48,color:colors.text,fontSize:15,paddingVertical:12},
  inlineSend:{width:44,height:44,borderRadius:22,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},
  inlineSendDisabled:{backgroundColor:colors.surface3},
  divider:{height:StyleSheet.hairlineWidth,backgroundColor:colors.line,marginHorizontal:16,marginTop:22},
});
