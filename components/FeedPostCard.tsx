import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
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
  const reduceMotion=useReducedMotion();
  const [imageAspect,setImageAspect]=useState<number|undefined>();
  const [videoToggleToken,setVideoToggleToken]=useState(0);
  const [mediaLoading,setMediaLoading]=useState(post.mediaType!=='video'&&Boolean(post.mediaUrl));
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
  const metadataAspect=post.mediaWidth&&post.mediaHeight?post.mediaWidth/post.mediaHeight:undefined;
  const rawAspect=metadataAspect??imageAspect??1.05;
  const boundedAspect=Math.max(.62,Math.min(1.85,rawAspect));
  const mediaWidth=Math.max(260,width-20);
  const mediaHeight=Math.max(220,Math.min(560,mediaWidth/boundedAspect));

  useEffect(() => { onViewed(); }, [post.id]);
  useEffect(()=>{setMediaFailed(false);setMediaLoading(post.mediaType!=='video'&&Boolean(post.mediaUrl));},[post.mediaUrl,post.mediaType]);
  useEffect(()=>()=>{if(singleTapTimer.current)clearTimeout(singleTapTimer.current);rainParticles.forEach((particle)=>particle.stopAnimation());},[]);

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

  return <View style={styles.post}>
    <View style={styles.header}>
      <Pressable onPress={()=>{Haptics.selectionAsync().catch(()=>{});router.push(`/profile/${author.id}`);}} style={({pressed})=>pressed&&styles.avatarPressed}><Avatar person={author} size={45}/></Pressable>
      <View style={styles.headerCopy}><View style={styles.nameLine}><Pressable onPress={()=>router.push(`/profile/${author.id}`)} style={styles.authorTap}><Text style={styles.name}>{author.name}</Text><VerifiedBadge person={author} size={13}/></Pressable><Text style={styles.dot}>•</Text><Text style={styles.time}>{timeAgo(post.createdAt)}</Text></View>
        <View style={styles.contextLine}>{event?<Pressable onPress={()=>router.push(`/event/${event.id}`)} style={styles.eventContext}><Ionicons name="location" color={colors.accent2} size={11}/><Text style={styles.context} numberOfLines={1}>{event.title}</Text></Pressable>:<Text style={styles.context}>Around campus</Text>}</View>
        {tagged.length?<View style={styles.tagLine}><Text style={styles.tags}>with </Text>{tagged.slice(0,2).map((person,index)=><Pressable key={person.id} onPress={()=>router.push(`/profile/${person.id}`)}><Text style={styles.tagName}>{person.name.split(' ')[0]}{index<tagged.slice(0,2).length-1?', ':''}</Text></Pressable>)}{tagged.length>2?<Text style={styles.tags}> +{tagged.length-2}</Text>:null}</View>:null}
      </View>
      {post.authorId===currentUserId?<Pressable onPress={onDelete} hitSlop={12} style={styles.more}><Ionicons name="ellipsis-horizontal" color={colors.muted} size={19}/></Pressable>:post.taggedUserIds.includes(currentUserId)?<Pressable onPress={onRemoveTag} hitSlop={12} style={styles.untagButton}><Text style={styles.untag}>Remove tag</Text></Pressable>:onReport?<Pressable onPress={onReport} hitSlop={12} style={styles.more}><Ionicons name="ellipsis-horizontal" color={colors.muted} size={19}/></Pressable>:null}
    </View>

    <Pressable onPress={handleMediaPress} pressRetentionOffset={{top:5,left:5,right:5,bottom:5}} style={[styles.mediaWrap,{height:mediaHeight}]}>
      {post.mediaUrl&&!mediaFailed?mediaType==='video'?<><View style={[StyleSheet.absoluteFill,styles.mediaMissing]}><Ionicons name="videocam-outline" color={colors.subtle} size={30}/></View><InlineVideo uri={post.mediaUrl} toggleToken={videoToggleToken} shouldPlay={videoActive&&!commentsExpanded}/></>:<Image source={{uri:post.mediaUrl}} style={StyleSheet.absoluteFill} resizeMode="cover" onLoadStart={()=>setMediaLoading(true)} onLoad={(e)=>{setMediaLoading(false);const src=e.nativeEvent.source;if(src?.width&&src?.height)setImageAspect(src.width/src.height);}} onError={()=>{setMediaLoading(false);setMediaFailed(true);}}/>:<View style={[StyleSheet.absoluteFill,styles.mediaMissing]}><Ionicons name={mediaType==='video'?'videocam-outline':'image-outline'} color={colors.subtle} size={34}/><Text style={styles.mediaMissingText}>Media unavailable</Text></View>}
      {mediaLoading?<View pointerEvents="none" style={[StyleSheet.absoluteFill,styles.mediaLoading]}><Animated.View style={styles.loadingShimmer}/></View>:null}
      <View pointerEvents="none" style={styles.mediaEdge}/>
      {event?<BlurView pointerEvents="none" intensity={50} tint="systemUltraThinMaterialDark" style={styles.eventPill}><View style={styles.eventPillDot}/><Text style={styles.eventPillText} numberOfLines={1}>{event.title}</Text></BlurView>:null}
      {mediaType==='video'&&post.mediaDurationMs?<View pointerEvents="none" style={styles.duration}><Text style={styles.durationText}>{formatDuration(post.mediaDurationMs)}</Text></View>:null}
      <Animated.View pointerEvents="none" style={[styles.heartBurst,{opacity:heartBurst,transform:[{scale:heartBurst.interpolate({inputRange:[0,1],outputRange:[.55,1]})},{rotate:'-7deg'}]}]}><Ionicons name="heart" color="#FFFFFF" size={88} style={styles.heartShadow}/></Animated.View>
    </Pressable>

    <View style={styles.body}>
      {post.caption?<Text style={styles.caption}><Text style={styles.captionName}>@{author.username}</Text>  {post.caption}</Text>:null}
      {!commentsExpanded&&firstComment&&firstCommentAuthor?<Pressable onPress={toggleComments} style={styles.commentPreview}><Text style={styles.commentPreviewText} numberOfLines={1}><Text style={styles.commentPreviewName}>@{firstCommentAuthor.username}</Text>  {firstComment.body}</Text><Text style={styles.commentPreviewTime}>{timeAgo(firstComment.createdAt)}</Text></Pressable>:null}
      <View style={styles.footerLine}><Pressable accessibilityRole="button" accessibilityState={{expanded:commentsExpanded}} onPress={toggleComments} style={styles.commentToggle}><Text style={styles.comments}>{commentsExpanded?'Hide comments':post.comments.length===1?'View comment':post.comments.length?`View all ${post.comments.length} comments`:'Add a comment'}</Text><Ionicons name={commentsExpanded?'chevron-up':'chevron-down'} color={colors.muted} size={13}/></Pressable><Text style={styles.views}>{post.viewCount} {post.viewCount===1?'view':'views'}</Text></View>
      {commentsExpanded?<View style={styles.commentsThread}>{post.comments.length?post.comments.map((comment)=>{const commentAuthor=people.find((person)=>person.id===comment.authorId);if(!commentAuthor)return null;return <View key={comment.id} style={styles.inlineComment}><Avatar person={commentAuthor} size={32}/><View style={styles.inlineCommentCopy}><View style={styles.inlineCommentMeta}><Text style={styles.inlineCommentName}>@{commentAuthor.username}</Text><VerifiedBadge person={commentAuthor} size={11}/><Text style={styles.inlineCommentTime}>{timeAgo(comment.createdAt)}</Text></View><Text style={styles.inlineCommentBody}>{comment.body}</Text></View>{comment.authorId===currentUserId?<Pressable accessibilityRole="button" accessibilityLabel="Delete comment" hitSlop={8} onPress={()=>onDeleteComment(comment.id).catch(()=>{})} style={({pressed})=>[styles.inlineDelete,pressed&&styles.actionPressed]}><Ionicons name="trash-outline" color={colors.subtle} size={14}/></Pressable>:null}</View>}):<Text style={styles.inlineEmpty}>Be the first to comment.</Text>}<View style={styles.inlineComposer}><TextInput ref={commentInputRef} value={commentBody} onChangeText={setCommentBody} onFocus={(event)=>onCommentInputFocus?.(event.nativeEvent.target)} editable={!commentSending} placeholder="Add a comment…" placeholderTextColor={colors.subtle} maxLength={600} returnKeyType="send" onSubmitEditing={submitComment} style={styles.inlineInput}/><Pressable accessibilityRole="button" accessibilityLabel="Send comment" disabled={!commentBody.trim()||commentSending} onPress={submitComment} style={({pressed})=>[styles.inlineSend,(!commentBody.trim()||commentSending)&&styles.inlineSendDisabled,pressed&&commentBody.trim()&&!commentSending?styles.actionPressed:null]}><Ionicons name="arrow-up" color={commentBody.trim()&&!commentSending?colors.white:colors.subtle} size={17}/></Pressable></View></View>:null}
      <View pointerEvents="none" style={styles.reactionRain}>{rainParticles.map((particle,index)=><Animated.Text key={index} style={[styles.rainEmoji,{left:`${4+(index*19)%91}%`,opacity:particle.interpolate({inputRange:[0,.08,.82,1],outputRange:[0,1,1,0]}),transform:[{translateY:particle.interpolate({inputRange:[0,1],outputRange:[-175,12]})},{translateX:particle.interpolate({inputRange:[0,.5,1],outputRange:[0,index%2?8:-8,0]})},{rotate:particle.interpolate({inputRange:[0,1],outputRange:['0deg',`${index%2?180:-180}deg`]})},{scale:particle.interpolate({inputRange:[0,.15,1],outputRange:[.65,1,.9]})}]}]}>{rainEmoji}</Animated.Text>)}</View>
      <View style={styles.reactionRow}>{REACTIONS.map(({kind,emoji})=>{const count=reactionCounts[kind]??0;const selected=mine===kind;return <Pressable key={kind} accessibilityRole="button" accessibilityLabel={`${kind} reaction${count?`, ${count}`:''}`} accessibilityState={{selected}} onPress={()=>selectReaction(kind,emoji)} style={({pressed})=>[styles.reactionOption,selected&&styles.reactionOptionSelected,pressed&&styles.actionPressed]}><Text style={styles.reactionOptionEmoji}>{emoji}</Text>{count?<Text style={[styles.reactionOptionCount,selected&&styles.reactionOptionCountSelected]}>{count}</Text>:null}</Pressable>;})}</View>
    </View>
    <View style={styles.divider}/>
  </View>;
}

const styles=StyleSheet.create({
  post:{marginBottom:5},header:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingTop:16,paddingBottom:11},avatarPressed:{transform:[{scale:.96}],opacity:.85},headerCopy:{flex:1,marginLeft:10,minWidth:0},nameLine:{flexDirection:'row',alignItems:'center'},authorTap:{flexDirection:'row',alignItems:'center',gap:5},name:{color:colors.text,fontSize:14.5,fontWeight:'800',letterSpacing:-.25},dot:{color:colors.subtle,fontSize:9,marginHorizontal:6},time:{color:colors.subtle,fontSize:10.5,fontWeight:'600'},contextLine:{marginTop:2,flexDirection:'row',alignItems:'center'},eventContext:{flexDirection:'row',alignItems:'center',gap:4,maxWidth:'95%'},context:{color:colors.muted,fontSize:10.5,fontWeight:'600'},tagLine:{flexDirection:'row',alignItems:'center',marginTop:2},tags:{color:colors.muted,fontSize:10},tagName:{color:colors.text,fontSize:10,fontWeight:'800'},more:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},untagButton:{paddingHorizontal:9,paddingVertical:7,borderRadius:13,backgroundColor:colors.surface2},untag:{color:colors.muted,fontSize:9,fontWeight:'800'},
  mediaWrap:{marginHorizontal:10,borderRadius:26,overflow:'hidden',backgroundColor:colors.surface2},mediaLoading:{backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},loadingShimmer:{width:64,height:6,borderRadius:3,backgroundColor:colors.surface3},mediaMissingText:{color:colors.subtle,fontSize:9,marginTop:7,fontWeight:'700'},mediaMissing:{alignItems:'center',justifyContent:'center'},mediaEdge:{...StyleSheet.absoluteFill,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.11)',borderRadius:26},eventPill:{position:'absolute',left:12,bottom:12,maxWidth:'72%',paddingHorizontal:10,paddingVertical:7,borderRadius:16,overflow:'hidden',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.14)',flexDirection:'row',alignItems:'center',gap:6},eventPillDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.accent2},eventPillText:{color:colors.white,fontSize:9.5,fontWeight:'800'},duration:{position:'absolute',right:11,bottom:11,backgroundColor:'rgba(9,10,11,.76)',paddingHorizontal:7,paddingVertical:5,borderRadius:10},durationText:{color:colors.white,fontSize:9,fontWeight:'900'},playButton:{position:'absolute',left:'50%',top:'50%',marginLeft:-28,marginTop:-28,width:56,height:56,borderRadius:22,backgroundColor:'rgba(10,12,14,.70)',alignItems:'center',justifyContent:'center',paddingLeft:3,borderWidth:1,borderColor:'rgba(255,255,255,.22)'},heartBurst:{position:'absolute',left:'50%',top:'50%',marginLeft:-44,marginTop:-44},heartShadow:{textShadowColor:'rgba(0,0,0,.35)',textShadowRadius:16,textShadowOffset:{width:0,height:5}},
  body:{paddingHorizontal:16,paddingTop:10},actionPressed:{transform:[{scale:.94}],opacity:.78},views:{marginLeft:'auto',color:colors.subtle,fontSize:10.5,fontWeight:'700'},caption:{color:colors.text,fontSize:13.5,lineHeight:20.5,marginTop:2,letterSpacing:-.08},captionName:{fontWeight:'800'},commentPreview:{marginTop:8,flexDirection:'row',alignItems:'center',gap:8},commentPreviewText:{flex:1,color:colors.muted,fontSize:11.5,lineHeight:16},commentPreviewName:{color:colors.text,fontWeight:'800'},commentPreviewTime:{color:colors.subtle,fontSize:9.5,fontWeight:'600'},footerLine:{flexDirection:'row',alignItems:'center',marginTop:9},commentToggle:{minHeight:32,flexDirection:'row',alignItems:'center',gap:5,paddingRight:8},comments:{color:colors.muted,fontSize:11,fontWeight:'700'},commentsThread:{marginTop:8,paddingTop:14,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.line},inlineComment:{flexDirection:'row',alignItems:'flex-start',marginBottom:14},inlineCommentCopy:{flex:1,minWidth:0,marginLeft:9,paddingTop:1},inlineCommentMeta:{flexDirection:'row',alignItems:'center',gap:5},inlineCommentName:{color:colors.text,fontSize:11.5,fontWeight:'900'},inlineCommentTime:{color:colors.subtle,fontSize:9.5,fontWeight:'600'},inlineCommentBody:{color:colors.text,fontSize:12.5,lineHeight:18,marginTop:3},inlineDelete:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center',marginLeft:4},inlineEmpty:{color:colors.muted,fontSize:11.5,textAlign:'center',paddingVertical:10},inlineComposer:{minHeight:46,borderRadius:23,backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,flexDirection:'row',alignItems:'center',paddingLeft:13,paddingRight:4,marginTop:2},inlineInput:{flex:1,minHeight:42,color:colors.text,fontSize:12.5,paddingVertical:9},inlineSend:{width:38,height:38,borderRadius:19,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},inlineSendDisabled:{backgroundColor:colors.surface3},reactionRain:{position:'absolute',left:0,right:0,bottom:44,height:190,zIndex:20},rainEmoji:{position:'absolute',bottom:0,fontSize:21,textShadowColor:'rgba(0,0,0,.28)',textShadowRadius:5},reactionRow:{height:48,flexDirection:'row',alignItems:'center',gap:6,marginTop:12},reactionOption:{flex:1,minWidth:44,height:44,borderRadius:17,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},reactionOptionSelected:{backgroundColor:colors.accentSoft,borderColor:'rgba(139,150,255,.42)'},reactionOptionEmoji:{fontSize:20},reactionOptionCount:{color:colors.muted,fontSize:9.5,fontWeight:'800'},reactionOptionCountSelected:{color:colors.text},divider:{height:StyleSheet.hairlineWidth,backgroundColor:colors.line,marginHorizontal:16,marginTop:14},
});
