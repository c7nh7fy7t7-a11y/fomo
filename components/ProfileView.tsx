import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { EventCard } from './EventCard';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { showReportSheet } from '@/utils/reporting';

const tabs=['POSTS','EVENTS','TAGGED'] as const;
type Stats={followers:number;following:number;friends:number;mutualFriends:number};

export function ProfileView({personId,isOwn=false}:{personId:string;isOwn?:boolean}){
  const router=useRouter(); const {width}=useWindowDimensions();
  const {
    currentUser,people,events,posts,organizers,followingIds,followerIds,friendIds,savedEventIds,profileViewCount,
    toggleFollow,updateAvatar,openChatWith,signOut,demoMode,getProfileSocialStats,blockUser,report,
  }=useApp();
  const person=people.find((p)=>p.id===personId)??(isOwn?currentUser:undefined);
  const organizer=organizers.find((item)=>item.profileId===personId);
  const [tab,setTab]=useState<(typeof tabs)[number]>('POSTS');
  const tabIndicator=useRef(new Animated.Value(0)).current; const tabWidth=(width-36)/3;
  const selectTab=(item:(typeof tabs)[number])=>{const index=tabs.indexOf(item);setTab(item);Haptics.selectionAsync().catch(()=>{});Animated.spring(tabIndicator,{toValue:index,useNativeDriver:true,friction:8,tension:220}).start();};
  const [stats,setStats]=useState<Stats>({followers:0,following:0,friends:0,mutualFriends:0});
  useEffect(()=>{if(person?.id)getProfileSocialStats(person.id).then(setStats).catch(()=>{});},[person?.id,followingIds.length,followerIds.length,friendIds.length]);
  if(!person)return <View style={styles.missing}><Text style={styles.missingTitle}>Profile not found.</Text></View>;

  const userPosts=posts.filter((post)=>post.authorId===person.id);
  const tagged=posts.filter((post)=>post.taggedUserIds.includes(person.id));
  const hosted=events.filter((event)=>event.hostId===person.id||(event.cohostIds??[]).includes(person.id));
  const saved=isOwn?events.filter((event)=>savedEventIds.includes(event.id)):[];
  const following=followingIds.includes(person.id); const followsMe=followerIds.includes(person.id); const isFriend=following&&followsMe;
  const relationshipLabel=isFriend?'Friends':following?'Following':followsMe?'Follow Back':'Follow';

  const pickAvatar=async()=>{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.82});if(!result.canceled&&result.assets[0]?.uri){try{await updateAvatar(result.assets[0].uri);}catch(error:any){Alert.alert('Photo upload failed',friendlyErrorMessage(error,'Try again.'));}}};
  const message=async()=>{try{const id=await openChatWith(person.id);router.push(`/chat/${id}?peer=${person.id}`);}catch(error:any){Alert.alert('Couldn’t open chat',friendlyErrorMessage(error,'Try again.'));}};
  const follow=async()=>{try{await toggleFollow(person.id);Haptics.selectionAsync().catch(()=>{});}catch(error:any){Alert.alert('Couldn’t update follow',friendlyErrorMessage(error,'Try again.'));}};
  const openList=(mode:'followers'|'following'|'friends')=>router.push({pathname:'/(tabs)/friends',params:{profileId:person.id,mode}} as any);
  const shareProfile=()=>Share.share({message:`${person.name} on FOMO\n${Linking.createURL(`/profile/${person.id}`)}`}).catch(()=>{});
  const options=()=>Alert.alert(person.name,undefined,[{text:'Share profile',onPress:shareProfile},{text:'Report',onPress:()=>showReportSheet({type:'user',id:person.id},report)},{text:'Block',style:'destructive',onPress:()=>Alert.alert(`Block ${person.name}?`,'You will no longer be able to follow, message, or easily find each other.',[{text:'Cancel',style:'cancel'},{text:'Block',style:'destructive',onPress:async()=>{try{await blockUser(person.id);router.back();}catch(e:any){Alert.alert('Couldn’t block user',friendlyErrorMessage(e,'Try again.'));}}}])},{text:'Cancel',style:'cancel'}]);

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.profileTop}>
      <Pressable disabled={!isOwn} onPress={pickAvatar} style={styles.avatarWrap}><Avatar person={person} size={94}/>{isOwn?<View style={styles.camera}><Ionicons name="camera" color={colors.black} size={14}/></View>:null}</Pressable>
      <View style={styles.identity}>
        <View style={styles.nameRow}><Text style={styles.name}>{organizer?.displayName??person.name}</Text><VerifiedBadge person={person} type={organizer?.verificationType} size={18}/>{!isOwn?<Pressable onPress={options} hitSlop={8} style={styles.more}><Ionicons name="ellipsis-horizontal" color={colors.muted} size={18}/></Pressable>:null}</View>
        <Text style={styles.username}>@{organizer?.handle??person.username}</Text>
        {organizer?<View style={styles.organizerPill}><Ionicons name="megaphone" color={colors.success} size={11}/><Text style={styles.organizerPillText}>ORGANIZER</Text></View>:null}
        {(organizer?.bio??person.bio)?<Text style={styles.bio}>{organizer?.bio??person.bio}</Text>:isOwn?<Text style={styles.bioMuted}>Add a bio so people know your vibe.</Text>:null}
        <Text style={styles.school}>University of Saskatchewan</Text>{!organizer?<Text style={styles.program}>{person.program} · {person.year}</Text>:null}
      </View>
    </View>

    <View style={styles.stats}><Stat value={userPosts.length} label="Posts"/><Stat value={stats.followers} label="Followers" onPress={()=>openList('followers')}/><Stat value={stats.following} label="Following" onPress={()=>openList('following')}/><Stat value={stats.friends} label="Friends" onPress={()=>openList('friends')}/></View>
    {!isOwn&&stats.mutualFriends>0?<Pressable onPress={()=>openList('friends')} style={styles.mutual}><Ionicons name="people" color={colors.accent2} size={15}/><Text style={styles.mutualText}>{stats.mutualFriends} mutual {stats.mutualFriends===1?'friend':'friends'}</Text><Ionicons name="chevron-forward" color={colors.subtle} size={15}/></Pressable>:null}

    <View style={styles.actions}>{isOwn?<><Pressable onPress={()=>router.push('/edit-profile')} style={styles.primaryAction}><Text style={styles.primaryActionText}>Edit profile</Text></Pressable><Pressable onPress={shareProfile} style={styles.iconAction}><Ionicons name="share-outline" color={colors.text} size={18}/></Pressable></>:<><Pressable onPress={follow} style={[styles.primaryAction,(following||isFriend)&&styles.secondaryAction]}><Text style={[styles.primaryActionText,(following||isFriend)&&styles.secondaryActionText]}>{relationshipLabel}</Text></Pressable><Pressable onPress={message} style={styles.secondaryAction}><Ionicons name="chatbubble-outline" color={colors.text} size={16}/><Text style={styles.secondaryActionText}>Message</Text></Pressable></>}</View>

    <View style={styles.tabs}><Animated.View pointerEvents="none" style={[styles.tabBubble,{width:tabWidth,transform:[{translateX:tabIndicator.interpolate({inputRange:[0,1,2],outputRange:[0,tabWidth,tabWidth*2]})}]}]}/>{tabs.map((item)=><Pressable key={item} onPress={()=>selectTab(item)} style={styles.tab}><Text style={[styles.tabText,tab===item&&styles.tabTextActive]}>{item}</Text><View style={[styles.rule,tab===item&&styles.ruleActive]}/></Pressable>)}</View>
    {tab==='POSTS'?<PostGrid posts={userPosts}/>:null}
    {tab==='TAGGED'?<PostGrid posts={tagged}/>:null}
    {tab==='EVENTS'?<View style={styles.events}>{hosted.length?<><Text style={styles.sectionLabel}>UPCOMING / HOSTING</Text>{hosted.map((event)=><EventCard key={event.id} event={event} people={people} friendIds={friendIds}/>)}</>:null}{isOwn&&saved.length?<><Text style={styles.sectionLabel}>SAVED</Text>{saved.map((event)=><EventCard key={`saved-${event.id}`} event={event} people={people} friendIds={friendIds}/>)}</>:null}{!hosted.length&&(!isOwn||!saved.length)?<Empty text="No events here yet."/>:null}</View>:null}

    {isOwn?<View style={styles.settings}>
      <View style={styles.settingsHead}><Text style={styles.settingsTitle}>Settings</Text><Text style={styles.views}>{profileViewCount} profile views</Text></View>
      <Setting icon="notifications-outline" text="Notification settings" onPress={()=>router.push('/notification-settings')}/>
      <Setting icon="sparkles-outline" text="Your interests" onPress={()=>router.push('/interests')}/>
      <Setting icon="ban-outline" text="Blocked users" onPress={()=>router.push('/blocked-users')}/>
      <Setting icon="shield-checkmark-outline" text="Privacy & safety"/>
      <Setting icon="help-circle-outline" text="Help & support"/>
      <Pressable onPress={async()=>{await signOut();router.replace('/');}} style={styles.logout}><Text style={styles.logoutText}>{demoMode?'Exit demo':'Log out'}</Text></Pressable>
    </View>:null}
  </ScrollView>;
}
function Setting({icon,text,onPress}:{icon:keyof typeof Ionicons.glyphMap;text:string;onPress?:()=>void}){return <Pressable onPress={onPress} disabled={!onPress} style={styles.setting}><View style={styles.settingLabel}><Ionicons name={icon} color={colors.muted} size={17}/><Text style={styles.settingText}>{text}</Text></View><Ionicons name="chevron-forward" color={colors.subtle} size={16}/></Pressable>}
function Stat({value,label,onPress}:{value:number|string;label:string;onPress?:()=>void}){return <Pressable disabled={!onPress} onPress={onPress} style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></Pressable>}
function PostGrid({posts}:{posts:any[]}){const router=useRouter();if(!posts.length)return <Empty text="Nothing here yet."/>;return <View style={styles.grid}>{posts.map((post)=><Pressable key={post.id} onPress={()=>router.push(`/post/${post.id}`)} style={styles.tile}>{post.mediaUrl&&post.mediaType!=='video'?<Image source={{uri:post.mediaUrl}} style={StyleSheet.absoluteFillObject}/>:<View style={styles.tileEmpty}><Ionicons name={post.mediaType==='video'?'play':'image-outline'} color={post.mediaType==='video'?colors.white:colors.subtle} size={post.mediaType==='video'?25:20}/></View>}{post.mediaType==='video'?<View style={styles.videoBadge}><Ionicons name="videocam" color={colors.white} size={11}/></View>:null}<View style={styles.tileMeta}><Ionicons name="heart" color={colors.white} size={11}/><Text style={styles.tileMetaText}>{post.reactions.length}</Text></View></Pressable>)}</View>}
function Empty({text}:{text:string}){return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>}
const styles=StyleSheet.create({content:{paddingHorizontal:14,paddingTop:8,paddingBottom:120},missing:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center'},missingTitle:{color:colors.text,fontSize:18,fontWeight:'800'},profileTop:{flexDirection:'row',alignItems:'center',padding:16,borderRadius:28,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},avatarWrap:{width:94,height:94,marginRight:16},camera:{position:'absolute',right:-1,bottom:-1,width:31,height:31,borderRadius:16,backgroundColor:colors.white,borderWidth:3,borderColor:colors.surface,alignItems:'center',justifyContent:'center'},identity:{flex:1},nameRow:{flexDirection:'row',alignItems:'center',gap:5},name:{color:colors.text,fontSize:25,lineHeight:28,fontWeight:'900',letterSpacing:-.7,flexShrink:1},more:{marginLeft:'auto',width:28,height:28,alignItems:'center',justifyContent:'center'},username:{color:colors.muted,fontSize:12,fontWeight:'700',marginTop:2},organizerPill:{alignSelf:'flex-start',height:23,borderRadius:12,backgroundColor:colors.surface2,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:4,marginTop:7},organizerPillText:{color:colors.success,fontSize:7.5,fontWeight:'900',letterSpacing:.6},bio:{color:colors.text,fontSize:11,lineHeight:15,marginTop:8},bioMuted:{color:colors.subtle,fontSize:10.5,lineHeight:15,marginTop:8},school:{color:colors.text,fontSize:10.5,fontWeight:'800',marginTop:8},program:{color:colors.muted,fontSize:10.5,marginTop:2},stats:{height:69,borderRadius:22,backgroundColor:colors.surface2,flexDirection:'row',alignItems:'center',marginTop:10,paddingHorizontal:4,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},stat:{flex:1,alignItems:'center',justifyContent:'center',height:'100%'},statValue:{color:colors.text,fontSize:16,fontWeight:'900'},statLabel:{color:colors.muted,fontSize:8.5,marginTop:2,fontWeight:'700'},mutual:{height:40,borderRadius:20,backgroundColor:colors.accentSoft,marginTop:8,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:7},mutualText:{flex:1,color:colors.text,fontSize:10.5,fontWeight:'800'},actions:{flexDirection:'row',gap:8,paddingVertical:12},primaryAction:{flex:1,height:42,borderRadius:21,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},primaryActionText:{color:colors.white,fontSize:11.5,fontWeight:'900'},secondaryAction:{flex:1,height:42,borderRadius:21,backgroundColor:colors.surface2,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},secondaryActionText:{color:colors.text,fontSize:11.5,fontWeight:'800'},iconAction:{width:42,height:42,borderRadius:21,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},tabs:{height:48,flexDirection:'row',borderRadius:22,backgroundColor:colors.surface,marginBottom:5,padding:4,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,position:'relative',overflow:'hidden'},tabBubble:{position:'absolute',left:4,top:4,bottom:4,borderRadius:18,backgroundColor:'rgba(255,255,255,.075)',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.10)'},tab:{flex:1,alignItems:'center',justifyContent:'center',borderRadius:18},tabText:{color:colors.muted,fontSize:9.5,fontWeight:'800',letterSpacing:.6},tabTextActive:{color:colors.text},rule:{height:2,width:22,backgroundColor:'transparent',position:'absolute',bottom:4,borderRadius:1},ruleActive:{backgroundColor:colors.accent},grid:{flexDirection:'row',flexWrap:'wrap',gap:4,paddingTop:4},tile:{width:'32.5%',aspectRatio:1,backgroundColor:colors.surface2,overflow:'hidden',borderRadius:11},tileEmpty:{flex:1,alignItems:'center',justifyContent:'center'},videoBadge:{position:'absolute',left:6,top:6,width:25,height:20,borderRadius:10,backgroundColor:'rgba(8,8,10,.72)',alignItems:'center',justifyContent:'center'},tileMeta:{position:'absolute',right:5,bottom:5,flexDirection:'row',alignItems:'center',gap:3,backgroundColor:'rgba(5,5,5,.66)',borderRadius:10,paddingHorizontal:6,paddingVertical:3},tileMetaText:{color:colors.white,fontSize:8,fontWeight:'800'},events:{paddingTop:15},sectionLabel:{color:colors.muted,fontSize:9,fontWeight:'900',letterSpacing:1,marginTop:6,marginBottom:8},empty:{height:140,alignItems:'center',justifyContent:'center'},emptyText:{color:colors.muted,fontSize:12},settings:{marginTop:30},settingsHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},settingsTitle:{color:colors.text,fontSize:20,fontWeight:'900'},views:{color:colors.subtle,fontSize:9.5,fontWeight:'700'},setting:{height:51,borderRadius:16,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,marginBottom:6,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},settingLabel:{flexDirection:'row',alignItems:'center',gap:10},settingText:{color:colors.text,fontSize:12,fontWeight:'700'},logout:{height:44,borderRadius:22,borderWidth:1,borderColor:colors.line,alignItems:'center',justifyContent:'center',marginTop:14},logoutText:{color:colors.danger,fontSize:11,fontWeight:'900'}});
