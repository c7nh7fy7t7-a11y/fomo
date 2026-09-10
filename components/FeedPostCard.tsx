import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
const reactionEmoji=Object.fromEntries(REACTIONS.map(r=>[r.kind,r.emoji])) as Record<ReactionKind,string>;

function formatDuration(ms?:number){
  if(!ms)return undefined; const total=Math.max(0,Math.round(ms/1000)); const m=Math.floor(total/60); const s=total%60; return `${m}:${String(s).padStart(2,'0')}`;
}

function InlineVideo({uri,toggleToken,pauseToken}:{uri:string;toggleToken:number;pauseToken:number}){
  const player=useVideoPlayer(uri,(p)=>{p.loop=false;});
  const {isPlaying}=useEvent(player,'playingChange',{isPlaying:player.playing});
  useEffect(()=>{if(!toggleToken)return;if(player.playing)player.pause();else player.play();},[toggleToken]);
  useEffect(()=>{if(pauseToken)player.pause();},[pauseToken]);
  useEffect(()=>()=>{try{player.pause();}catch{}},[player]);
  return <>
    <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" surfaceType="textureView" nativeControls={false} fullscreenOptions={{enable:true}} pointerEvents="none"/>
    {!isPlaying?<View pointerEvents="none" style={styles.playButton}><Ionicons name="play" color={colors.white} size={26}/></View>:null}
  </>;
}

function reactionHapticBurst(){
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});
  setTimeout(()=>Haptics.selectionAsync().catch(()=>{}),65);
  setTimeout(()=>Haptics.selectionAsync().catch(()=>{}),125);
  setTimeout(()=>Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{}),205);
}

function ReactionGesture({mine,onReact}:{mine?:ReactionKind;onReact:(reaction?:ReactionKind)=>void}){
  const reduceMotion=useReducedMotion();
  const holdTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const startX=useRef(0); const startY=useRef(0);
  const activatedRef=useRef(false);
  const hoverRef=useRef(0);
  const [active,setActive]=useState(false);
  const [hover,setHover]=useState(0);
  const [burstEmoji,setBurstEmoji]=useState('❤️');
  const tray=useRef(new Animated.Value(0)).current;
  const press=useRef(new Animated.Value(1)).current;
  const particles=useRef(Array.from({length:12},()=>new Animated.Value(0))).current;

  useEffect(()=>()=>{if(holdTimer.current)clearTimeout(holdTimer.current);},[]);

  const setHovered=(index:number)=>{
    const clamped=Math.max(0,Math.min(REACTIONS.length-1,index));
    if(clamped===hoverRef.current)return;
    hoverRef.current=clamped; setHover(clamped);
    Haptics.selectionAsync().catch(()=>{});
  };
  const open=()=>{
    activatedRef.current=true;
    const mineIndex=mine?REACTIONS.findIndex(r=>r.kind===mine):0;
    const initial=mineIndex>=0?mineIndex:0; hoverRef.current=initial;setHover(initial);setActive(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
    tray.setValue(0);Animated.spring(tray,{toValue:1,useNativeDriver:true,friction:7,tension:210}).start();
  };
  const runParticles=(emoji:string)=>{
    if(reduceMotion)return;
    setBurstEmoji(emoji);
    particles.forEach((v)=>v.setValue(0));
    Animated.parallel(particles.map((v,i)=>Animated.timing(v,{toValue:1,duration:650+(i%4)*70,delay:(i%3)*22,useNativeDriver:true}))).start();
  };
  const selectCurrent=()=>{
    const choice=REACTIONS[hoverRef.current]??REACTIONS[0];
    onReact(mine===choice.kind?undefined:choice.kind);
    runParticles(choice.emoji); if(reduceMotion)Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});else reactionHapticBurst();
    Animated.timing(tray,{toValue:0,duration:110,useNativeDriver:true}).start(()=>setActive(false));
  };
  const onPressIn=(e:any)=>{
    startX.current=e.nativeEvent.pageX; startY.current=e.nativeEvent.pageY;
    Animated.spring(press,{toValue:.94,useNativeDriver:true,friction:8,tension:230}).start();
    if(holdTimer.current)clearTimeout(holdTimer.current);
    holdTimer.current=setTimeout(open,255);
  };
  const onPressOut=()=>{
    if(holdTimer.current){clearTimeout(holdTimer.current);holdTimer.current=null;}
    Animated.spring(press,{toValue:1,useNativeDriver:true,friction:7,tension:220}).start();
    if(activatedRef.current){selectCurrent();setTimeout(()=>{activatedRef.current=false;},120);}
  };
  const onPress=()=>{
    if(activatedRef.current){activatedRef.current=false;return;}
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
    onReact(mine==='heart'?undefined:'heart');
  };
  const onMove=(e:any)=>{
    const dx=e.nativeEvent.pageX-startX.current; const dy=e.nativeEvent.pageY-startY.current;
    if(!active){if(Math.abs(dy)>11||Math.abs(dx)>15){if(holdTimer.current){clearTimeout(holdTimer.current);holdTimer.current=null;}}return;}
    setHovered(Math.round(dx/46));
  };

  return <View style={reactionStyles.host}>
    {active?<Animated.View pointerEvents="none" style={[reactionStyles.trayWrap,{opacity:tray,transform:[{translateY:tray.interpolate({inputRange:[0,1],outputRange:[7,0]})},{scale:tray.interpolate({inputRange:[0,1],outputRange:[.91,1]})}]}]}>
      <BlurView intensity={72} tint="systemUltraThinMaterialDark" style={reactionStyles.tray}>
        <View style={reactionStyles.trayTint}/>
        {REACTIONS.map((r,i)=><Animated.View key={r.kind} style={[reactionStyles.choice,i===hover&&reactionStyles.choiceActive,{transform:[{translateY:i===hover?-7:0},{scale:i===hover?1.27:1}]}]}><Text style={reactionStyles.emoji}>{r.emoji}</Text></Animated.View>)}
      </BlurView>
    </Animated.View>:null}
    <View pointerEvents="none" style={reactionStyles.particleLayer}>{particles.map((v,i)=>{
      const angle=((i%6)-2.5)*18; const x=(i%2?1:-1)*(18+(i%5)*12);
      return <Animated.Text key={i} style={[reactionStyles.particle,{opacity:v.interpolate({inputRange:[0,.72,1],outputRange:[0,1,0]}),transform:[{translateX:v.interpolate({inputRange:[0,1],outputRange:[0,x]})},{translateY:v.interpolate({inputRange:[0,1],outputRange:[0,-48-(i%4)*20]})},{scale:v.interpolate({inputRange:[0,.2,1],outputRange:[.45,1.12,.8]})},{rotate:v.interpolate({inputRange:[0,1],outputRange:['0deg',`${angle}deg`]})}]}]}>{burstEmoji}</Animated.Text>;
    })}</View>
    <Animated.View style={{transform:[{scale:press}]}}><Pressable accessibilityRole="button" accessibilityLabel="React to post. Hold and slide for more reactions." onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress} onTouchMove={onMove} pressRetentionOffset={{left:14,right:250,top:110,bottom:70}} style={[reactionStyles.button,mine&&reactionStyles.buttonSelected]}>
      <Text style={reactionStyles.buttonEmoji}>{mine?reactionEmoji[mine]:'☺️'}</Text>
    </Pressable></Animated.View>
  </View>;
}

export function FeedPostCard({
  post, people, events, currentUserId, pauseToken=0, onReact, onComments, onViewed, onRemoveTag, onDelete, onReport,
}: {
  post: FeedPost; people: Person[]; events: FomoEvent[]; currentUserId: string; pauseToken?: number;
  onReact: (reaction?: ReactionKind) => void; onComments: () => void; onViewed: () => void; onRemoveTag: () => void; onDelete: () => void; onReport?: () => void;
}) {
  const router = useRouter();
  const {width}=useWindowDimensions();
  const [imageAspect,setImageAspect]=useState<number|undefined>();
  const [videoToggleToken,setVideoToggleToken]=useState(0);
  const [mediaLoading,setMediaLoading]=useState(post.mediaType!=='video'&&Boolean(post.mediaUrl));
  const [mediaFailed,setMediaFailed]=useState(false);
  const lastMediaTap = useRef(0);
  const singleTapTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const heartBurst = useRef(new Animated.Value(0)).current;
  const countPulse=useRef(new Animated.Value(1)).current;
  const lastCount=useRef(post.reactions.length);
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
  useEffect(()=>()=>{if(singleTapTimer.current)clearTimeout(singleTapTimer.current);},[]);
  useEffect(()=>{if(lastCount.current===post.reactions.length)return;lastCount.current=post.reactions.length;countPulse.setValue(.82);Animated.spring(countPulse,{toValue:1,useNativeDriver:true,friction:5,tension:210}).start();},[post.reactions.length]);

  const showHeartBurst = () => {
    heartBurst.stopAnimation(); heartBurst.setValue(0);
    Animated.sequence([
      Animated.spring(heartBurst, { toValue: 1, friction: 4.5, tension: 130, useNativeDriver: true }),
      Animated.delay(260), Animated.timing(heartBurst, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start();
  };
  const doubleLike=()=>{if(mine!=='heart')onReact('heart');Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});showHeartBurst();};
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
      {post.mediaUrl&&!mediaFailed?mediaType==='video'?<><View style={[StyleSheet.absoluteFill,styles.mediaMissing]}><Ionicons name="videocam-outline" color={colors.subtle} size={30}/></View><InlineVideo uri={post.mediaUrl} toggleToken={videoToggleToken} pauseToken={pauseToken}/></>:<Image source={{uri:post.mediaUrl}} style={StyleSheet.absoluteFill} resizeMode="cover" onLoadStart={()=>setMediaLoading(true)} onLoad={(e)=>{setMediaLoading(false);const src=e.nativeEvent.source;if(src?.width&&src?.height)setImageAspect(src.width/src.height);}} onError={()=>{setMediaLoading(false);setMediaFailed(true);}}/>:<View style={[StyleSheet.absoluteFill,styles.mediaMissing]}><Ionicons name={mediaType==='video'?'videocam-outline':'image-outline'} color={colors.subtle} size={34}/><Text style={styles.mediaMissingText}>Media unavailable</Text></View>}
      {mediaLoading?<View pointerEvents="none" style={[StyleSheet.absoluteFill,styles.mediaLoading]}><Animated.View style={styles.loadingShimmer}/></View>:null}
      <View pointerEvents="none" style={styles.mediaEdge}/>
      {event?<BlurView pointerEvents="none" intensity={50} tint="systemUltraThinMaterialDark" style={styles.eventPill}><View style={styles.eventPillDot}/><Text style={styles.eventPillText} numberOfLines={1}>{event.title}</Text></BlurView>:null}
      {mediaType==='video'&&post.mediaDurationMs?<View pointerEvents="none" style={styles.duration}><Text style={styles.durationText}>{formatDuration(post.mediaDurationMs)}</Text></View>:null}
      <Animated.View pointerEvents="none" style={[styles.heartBurst,{opacity:heartBurst,transform:[{scale:heartBurst.interpolate({inputRange:[0,1],outputRange:[.55,1]})},{rotate:'-7deg'}]}]}><Ionicons name="heart" color="#FFFFFF" size={88} style={styles.heartShadow}/></Animated.View>
    </Pressable>

    <View style={styles.body}>
      <View style={styles.actions}>
        <ReactionGesture mine={mine} onReact={onReact}/>
        <Pressable onPress={onComments} style={({pressed})=>[styles.actionButton,pressed&&styles.actionPressed]}><Ionicons name="chatbubble-ellipses-outline" color={colors.text} size={20}/></Pressable>
        <View style={{flex:1}}/><Text style={styles.views}>{post.viewCount} {post.viewCount===1?'view':'views'}</Text>
      </View>
      {post.reactions.length?<Animated.View style={[styles.reactionSummary,{transform:[{scale:countPulse}]}]}><View style={styles.reactionFaces}>{REACTIONS.filter(({kind})=>reactionCounts[kind]).slice(0,3).map(({kind,emoji},i)=><View key={kind} style={[styles.reactionBubble,i>0&&styles.reactionOverlap]}><Text style={styles.reactionBubbleText}>{emoji}</Text></View>)}</View><Text style={styles.reactionTotal}>{post.reactions.length} {post.reactions.length===1?'reaction':'reactions'}</Text></Animated.View>:null}
      {post.caption?<Text style={styles.caption}><Text style={styles.captionName}>@{author.username}</Text>  {post.caption}</Text>:null}
      {firstComment&&firstCommentAuthor?<Pressable onPress={onComments} style={styles.commentPreview}><Text style={styles.commentPreviewText} numberOfLines={1}><Text style={styles.commentPreviewName}>@{firstCommentAuthor.username}</Text>  {firstComment.body}</Text><Text style={styles.commentPreviewTime}>{timeAgo(firstComment.createdAt)}</Text></Pressable>:null}
      <View style={styles.footerLine}>{post.comments.length?<Pressable onPress={onComments}><Text style={styles.comments}>{post.comments.length===1?'View comment':`View all ${post.comments.length} comments`}</Text></Pressable>:<Pressable onPress={onComments}><Text style={styles.comments}>Add a comment</Text></Pressable>}<Text style={styles.doubleTapHint}>Hold ☺️ to react</Text></View>
    </View>
    <View style={styles.divider}/>
  </View>;
}

const reactionStyles=StyleSheet.create({
  host:{width:42,height:42,position:'relative',zIndex:20},button:{width:42,height:42,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},buttonSelected:{backgroundColor:colors.accentSoft,borderColor:'rgba(255,107,87,.24)'},buttonEmoji:{fontSize:19},
  trayWrap:{position:'absolute',left:-5,bottom:49,width:240,height:62,zIndex:40},tray:{flex:1,borderRadius:27,overflow:'hidden',paddingHorizontal:7,flexDirection:'row',alignItems:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.15)'},trayTint:{...StyleSheet.absoluteFill,backgroundColor:'rgba(13,15,18,.44)'},choice:{width:44,height:48,borderRadius:22,alignItems:'center',justifyContent:'center'},choiceActive:{backgroundColor:'rgba(255,255,255,.10)'},emoji:{fontSize:24},
  particleLayer:{position:'absolute',left:12,bottom:22,width:20,height:20,zIndex:60},particle:{position:'absolute',fontSize:17},
});
const styles=StyleSheet.create({
  post:{marginBottom:5},header:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingTop:16,paddingBottom:11},avatarPressed:{transform:[{scale:.96}],opacity:.85},headerCopy:{flex:1,marginLeft:10,minWidth:0},nameLine:{flexDirection:'row',alignItems:'center'},authorTap:{flexDirection:'row',alignItems:'center',gap:5},name:{color:colors.text,fontSize:14.5,fontWeight:'800',letterSpacing:-.25},dot:{color:colors.subtle,fontSize:9,marginHorizontal:6},time:{color:colors.subtle,fontSize:10.5,fontWeight:'600'},contextLine:{marginTop:2,flexDirection:'row',alignItems:'center'},eventContext:{flexDirection:'row',alignItems:'center',gap:4,maxWidth:'95%'},context:{color:colors.muted,fontSize:10.5,fontWeight:'600'},tagLine:{flexDirection:'row',alignItems:'center',marginTop:2},tags:{color:colors.muted,fontSize:10},tagName:{color:colors.text,fontSize:10,fontWeight:'800'},more:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},untagButton:{paddingHorizontal:9,paddingVertical:7,borderRadius:13,backgroundColor:colors.surface2},untag:{color:colors.muted,fontSize:9,fontWeight:'800'},
  mediaWrap:{marginHorizontal:10,borderRadius:26,overflow:'hidden',backgroundColor:colors.surface2},mediaLoading:{backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},loadingShimmer:{width:64,height:6,borderRadius:3,backgroundColor:colors.surface3},mediaMissingText:{color:colors.subtle,fontSize:9,marginTop:7,fontWeight:'700'},mediaMissing:{alignItems:'center',justifyContent:'center'},mediaEdge:{...StyleSheet.absoluteFill,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.11)',borderRadius:26},eventPill:{position:'absolute',left:12,bottom:12,maxWidth:'72%',paddingHorizontal:10,paddingVertical:7,borderRadius:16,overflow:'hidden',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.14)',flexDirection:'row',alignItems:'center',gap:6},eventPillDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.accent2},eventPillText:{color:colors.white,fontSize:9.5,fontWeight:'800'},duration:{position:'absolute',right:11,bottom:11,backgroundColor:'rgba(9,10,11,.76)',paddingHorizontal:7,paddingVertical:5,borderRadius:10},durationText:{color:colors.white,fontSize:9,fontWeight:'900'},playButton:{position:'absolute',left:'50%',top:'50%',marginLeft:-28,marginTop:-28,width:56,height:56,borderRadius:22,backgroundColor:'rgba(10,12,14,.70)',alignItems:'center',justifyContent:'center',paddingLeft:3,borderWidth:1,borderColor:'rgba(255,255,255,.22)'},heartBurst:{position:'absolute',left:'50%',top:'50%',marginLeft:-44,marginTop:-44},heartShadow:{textShadowColor:'rgba(0,0,0,.35)',textShadowRadius:16,textShadowOffset:{width:0,height:5}},
  body:{paddingHorizontal:16,paddingTop:10},actions:{flexDirection:'row',alignItems:'center',gap:8,zIndex:10},actionButton:{width:42,height:42,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},actionPressed:{transform:[{scale:.94}],opacity:.78},views:{color:colors.subtle,fontSize:10.5,fontWeight:'700'},reactionSummary:{flexDirection:'row',alignItems:'center',marginTop:9,alignSelf:'flex-start'},reactionFaces:{flexDirection:'row',alignItems:'center'},reactionBubble:{width:23,height:23,borderRadius:11.5,backgroundColor:colors.surface3,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:colors.bg},reactionOverlap:{marginLeft:-5},reactionBubbleText:{fontSize:11.5},reactionTotal:{color:colors.muted,fontSize:10.5,fontWeight:'700',marginLeft:6},caption:{color:colors.text,fontSize:13.5,lineHeight:20.5,marginTop:10,letterSpacing:-.08},captionName:{fontWeight:'800'},commentPreview:{marginTop:8,flexDirection:'row',alignItems:'center',gap:8},commentPreviewText:{flex:1,color:colors.muted,fontSize:11.5,lineHeight:16},commentPreviewName:{color:colors.text,fontWeight:'800'},commentPreviewTime:{color:colors.subtle,fontSize:9.5,fontWeight:'600'},footerLine:{flexDirection:'row',alignItems:'center',marginTop:8},comments:{color:colors.muted,fontSize:11,fontWeight:'600'},doubleTapHint:{marginLeft:'auto',color:colors.subtle,fontSize:8.5,fontWeight:'600'},divider:{height:StyleSheet.hairlineWidth,backgroundColor:colors.line,marginHorizontal:16,marginTop:18},
});
