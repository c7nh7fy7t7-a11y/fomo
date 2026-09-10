import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/Avatar';
import { AvatarStack } from '@/components/AvatarStack';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { categoryColor, colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { showReportSheet } from '@/utils/reporting';
import { backendConfigured, supabase } from '@/lib/supabase';

export default function EventDetail(){
  const router=useRouter();const {id}=useLocalSearchParams<{id:string}>();
  const {
    currentUser,events,people,followingIds,friendIds,savedEventIds,requestedEventIds,eventRequestIdsByEvent,posts,
    toggleGoing,toggleEventRequest,approveEventRequest,declineEventRequest,removeEventAttendee,cancelEvent,addEventPhoto,
    toggleSavedEvent,shareEventWithPerson,addCohost,removeCohost,invitePeople,report,refreshAll,demoMode,
  }=useApp();
  const event=events.find((e)=>e.id===id); const [shareOpen,setShareOpen]=useState(false); const [inviteOpen,setInviteOpen]=useState(false); const [selectedInvitees,setSelectedInvitees]=useState<string[]>([]); const [inviteBusy,setInviteBusy]=useState(false); const [cohostBusy,setCohostBusy]=useState<string>();
  useEffect(()=>{
    if(!id||demoMode||!backendConfigured||!supabase)return;
    const channel=supabase.channel(`event-live-${id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'events',filter:`id=eq.${id}`},()=>refreshAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'event_attendees',filter:`event_id=eq.${id}`},()=>refreshAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'event_cohosts',filter:`event_id=eq.${id}`},()=>refreshAll())
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[id,demoMode,refreshAll]);
  if(!event)return <SafeAreaView style={styles.safe}><View style={styles.missing}><Text style={styles.missingTitle}>This event isn’t here.</Text><Pressable onPress={()=>router.back()}><Text style={styles.backLink}>Go back</Text></Pressable></View></SafeAreaView>;

  const host=people.find((p)=>p.id===event.hostId);const isHost=event.hostId===currentUser.id;const isCohost=(event.cohostIds??[]).includes(currentUser.id);const isManager=isHost||isCohost;const going=event.attendeeIds.includes(currentUser.id);const saved=savedEventIds.includes(event.id);
  const requested=requestedEventIds.includes(event.id);const hasExactCoords=event.exactLatitude!==undefined&&event.exactLongitude!==undefined;const canSeeExact=isHost||going||hasExactCoords;
  const attendees=event.attendeeIds.map((aid)=>people.find((p)=>p.id===aid)).filter(Boolean) as typeof people;
  const sortedAttendees=[...attendees].sort((a,b)=>{const rank=(pid:string)=>friendIds.includes(pid)?0:followingIds.includes(pid)?1:2;return rank(a.id)-rank(b.id);});
  const friends=sortedAttendees.filter((p)=>friendIds.includes(p.id)); const followedGoing=sortedAttendees.filter((p)=>!friendIds.includes(p.id)&&followingIds.includes(p.id));const requests=(eventRequestIdsByEvent[event.id]??[]).map((rid)=>people.find((p)=>p.id===rid)).filter(Boolean) as typeof people;
  const socialProof=friends.length?`${friends[0].name.split(' ')[0]}${friends.length>1?` + ${friends.length-1} friend${friends.length>2?'s':''}`:''} ${friends.length===1?'is':'are'} going`:followedGoing.length?`${followedGoing.length} ${followedGoing.length===1?'person':'people'} you follow ${followedGoing.length===1?'is':'are'} going`:'Be the friend who starts it.';
  const eventPosts=posts.filter((post)=>post.eventId===event.id); const cohosts=(event.cohostIds??[]).map((cid)=>people.find((p)=>p.id===cid)).filter(Boolean) as typeof people; const cohostCandidates=people.filter((p)=>p.id!==currentUser.id&&p.id!==event.hostId).slice(0,8);
  const displayLat=event.exactLatitude??event.latitude;const displayLng=event.exactLongitude??event.longitude;

  const act=async()=>{
    try{
      if(isManager)return;
      if(event.privacy==='Public'||going)await toggleGoing(event.id);
      else if(event.privacy==='Request')await toggleEventRequest(event.id);
      else Alert.alert('Invite only','The host has to invite you to this one.');
    }catch(error:any){Alert.alert('Couldn’t update RSVP',friendlyErrorMessage(error,'Try again.'));}
  };
  const buttonLabel=isHost?'Hosting':isCohost?'Co-hosting':going?'You’re going':event.privacy==='Public'?'I’m going':event.privacy==='Request'?(requested?'Request sent':'Request to join'):'Invite only';

  const addPhoto=async()=>{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.82});if(!result.canceled&&result.assets[0]?.uri){try{await addEventPhoto(event.id,result.assets[0].uri);}catch(error:any){Alert.alert('Couldn’t add photo',friendlyErrorMessage(error,'Try again.'));}}};
  const nativeShare=()=>Share.share({message:`${event.title} · ${event.dateLabel} · ${event.time}\n${event.location}\n${Linking.createURL(`/event/${event.id}`)}`}).catch(()=>{});
  const inviteCandidates=[...people.filter(p=>p.id!==currentUser.id)].sort((a,b)=>{const rank=(pid:string)=>friendIds.includes(pid)?0:followingIds.includes(pid)?1:2;return rank(a.id)-rank(b.id);});
  const sendInvites=async()=>{if(!selectedInvitees.length)return;setInviteBusy(true);try{await invitePeople(event.id,selectedInvitees);setInviteOpen(false);setSelectedInvitees([]);Alert.alert('Invites sent',`Sent to ${selectedInvitees.length} ${selectedInvitees.length===1?'person':'people'}.`);}catch(error:any){Alert.alert('Couldn’t send invites',friendlyErrorMessage(error,'Try again.'));}finally{setInviteBusy(false);}};

  return(
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}><Pressable onPress={()=>router.back()} style={styles.circle}><Ionicons name="arrow-back" color={colors.white} size={21}/></Pressable><View style={styles.topActions}><Pressable onPress={()=>toggleSavedEvent(event.id).catch(()=>{})} style={styles.circle}><Ionicons name={saved?'bookmark':'bookmark-outline'} color={saved?colors.accent2:colors.white} size={19}/></Pressable><Pressable onPress={nativeShare} style={styles.circle}><Ionicons name="share-outline" color={colors.white} size={19}/></Pressable>{event.privacy!=='Private'||isManager?<Pressable onPress={()=>setInviteOpen(true)} style={styles.circle}><Ionicons name="person-add-outline" color={colors.white} size={18}/></Pressable>:null}<Pressable onPress={()=>setShareOpen(true)} style={styles.circle}><Ionicons name="chatbubble-outline" color={colors.white} size={18}/></Pressable>{!isHost?<Pressable onPress={()=>showReportSheet({type:'event',id:event.id},report)} style={styles.circle}><Ionicons name="ellipsis-horizontal" color={colors.white} size={18}/></Pressable>:null}</View></View>

        <View style={styles.hero}>
          {event.cover?<Image source={{uri:event.cover}} style={StyleSheet.absoluteFill}/>:<View style={[StyleSheet.absoluteFill,{backgroundColor:colors.surface2}]}/>}
          <View style={styles.heroShade}/>
          <View style={styles.category}><Text style={styles.categoryText}>{event.category}</Text></View>
          <View style={styles.heroCopy}><Text style={styles.date}>{event.dateLabel} · {event.time}</Text><Text style={styles.title}>{event.title}</Text><Text style={styles.place}>{event.location}</Text></View>
        </View>

        <View style={styles.body}>
          <Pressable disabled={!host} onPress={()=>host&&router.push(`/profile/${host.id}`)} style={styles.hostRow}>
            {host?<Avatar person={host} size={42}/>:null}
            <View style={{flex:1,marginLeft:10}}><Text style={styles.hostLabel}>Hosted by</Text><View style={styles.hostNameRow}><Text style={styles.hostName}>{host?.name??'FOMO host'} <Text style={styles.hostUser}>@{host?.username}</Text></Text>{host?<VerifiedBadge person={host} size={13}/>:null}</View></View>
            <Ionicons name="chevron-forward" color={colors.subtle} size={16}/>
          </Pressable>

          <BlurView intensity={54} tint="systemUltraThinMaterialDark" style={styles.actionRow}>
            <View style={{flex:1}}><Text style={styles.actionCount}>{event.attendeeIds.length} going</Text><Text style={styles.actionSub}>{socialProof}</Text></View>
            <Pressable onPress={act} disabled={isManager||event.privacy==='Private'} style={[styles.rsvp,(isManager||going||requested)&&styles.rsvpSecondary]}><Text style={[styles.rsvpText,(isManager||going||requested)&&styles.rsvpTextSecondary]}>{buttonLabel}</Text></Pressable>
          </BlurView>

          {friends.length?<View style={styles.friendProof}><AvatarStack people={friends} size={30} max={5}/><Text style={styles.friendText}>{friends.slice(0,2).map((p)=>p.name.split(' ')[0]).join(', ')}{friends.length>2?` + ${friends.length-2}`:''}</Text></View>:null}

          <View style={styles.infoCard}>
            <Info icon="time-outline" label="When" value={`${event.dateLabel} · ${event.time}`}/>
            <Info icon="location-outline" label="Area" value={event.location}/>
            <Info icon={canSeeExact?'lock-open-outline':'lock-closed-outline'} label="Exact location" value={canSeeExact?(event.exactLocation??'Pinned on map'):'Unlocks when you’re approved / going'} last/>
          </View>

          <View style={styles.map}>
            <MapView style={StyleSheet.absoluteFill} initialRegion={{latitude:displayLat,longitude:displayLng,latitudeDelta:.009,longitudeDelta:.009}} userInterfaceStyle="dark" scrollEnabled zoomEnabled>
              <Marker coordinate={{latitude:displayLat,longitude:displayLng}}>
                <View style={[styles.mapPin,{borderColor:categoryColor(event.category)}]}><View style={styles.mapPinCore}/></View>
              </Marker>
            </MapView>
            {!canSeeExact?<View style={styles.mapLock}><Ionicons name="lock-closed" color={colors.white} size={15}/><Text style={styles.mapLockText}>Approximate area</Text></View>:null}
          </View>

          {event.description?<View style={styles.section}><Text style={styles.sectionTitle}>About</Text><Text style={styles.description}>{event.description}</Text></View>:null}

          <View style={styles.section}>
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>People</Text><Text style={styles.sectionMeta}>{event.attendeeIds.length} going</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>{sortedAttendees.map((person)=><Pressable key={person.id} onPress={()=>router.push(`/profile/${person.id}`)} style={styles.person}><Avatar person={person} size={48}/><Text style={styles.personName} numberOfLines={1}>{person.name.split(' ')[0]}</Text></Pressable>)}</ScrollView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>From this event</Text><Pressable onPress={addPhoto}><Text style={styles.addPhoto}>Add photo</Text></Pressable></View>
            {eventPosts.length||event.photos.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
              {eventPosts.map((post)=><Pressable key={post.id} onPress={()=>router.push(`/post/${post.id}`)} style={styles.photo}>{post.mediaUrl&&post.mediaType!=='video'?<Image source={{uri:post.mediaUrl}} style={StyleSheet.absoluteFill}/>:<View style={styles.videoTile}><Ionicons name="play" color={colors.white} size={24}/></View>}</Pressable>)}
              {event.photos.map((uri,index)=><Image key={`${uri}-${index}`} source={{uri}} style={styles.photo}/>)}
            </ScrollView>:<Text style={styles.emptyPhotos}>Nothing from this one yet.</Text>}
          </View>

          {isManager?(
            <View style={styles.hostTools}>
              <Text style={styles.hostToolsTitle}>Host controls</Text>
              <Text style={styles.hostToolsSub}>{requests.length} pending · {event.attendeeIds.length} going</Text>
              {requests.length?<View style={styles.requestList}>{requests.map((person)=><View key={person.id} style={styles.requestRow}><Avatar person={person} size={39}/><View style={{flex:1,marginLeft:10}}><Text style={styles.requestName}>{person.name}</Text><Text style={styles.requestUser}>@{person.username}</Text></View><Pressable onPress={()=>declineEventRequest(event.id,person.id)} style={styles.smallAction}><Text style={styles.decline}>Decline</Text></Pressable><Pressable onPress={()=>approveEventRequest(event.id,person.id)} style={styles.approve}><Text style={styles.approveText}>Approve</Text></Pressable></View>)}</View>:<Text style={styles.noRequests}>No join requests right now.</Text>}
              {isHost?<><Text style={styles.guestLabel}>Co-hosts</Text>{cohosts.map((person)=><View key={person.id} style={styles.guest}><Avatar person={person} size={34}/><View style={styles.guestNameLine}><Text style={styles.guestName}>{person.name}</Text><VerifiedBadge person={person} size={12}/></View><Pressable onPress={async()=>{setCohostBusy(person.id);try{await removeCohost(event.id,person.id);}finally{setCohostBusy(undefined);}}}><Text style={styles.remove}>{cohostBusy===person.id?'…':'Remove'}</Text></Pressable></View>)}{cohostCandidates.filter((p)=>!(event.cohostIds??[]).includes(p.id)).slice(0,4).map((person)=><View key={person.id} style={styles.guest}><Avatar person={person} size={34}/><View style={styles.guestNameLine}><Text style={styles.guestName}>{person.name}</Text><VerifiedBadge person={person} size={12}/></View><Pressable onPress={async()=>{setCohostBusy(person.id);try{await addCohost(event.id,person.id);}finally{setCohostBusy(undefined);}}}><Text style={styles.addHost}>{cohostBusy===person.id?'…':'Add'}</Text></Pressable></View>)}</>:null}
              {attendees.filter((p)=>p.id!==currentUser.id).length?<><Text style={styles.guestLabel}>Guest list</Text>{attendees.filter((p)=>p.id!==currentUser.id).map((person)=><View key={person.id} style={styles.guest}><Avatar person={person} size={34}/><View style={styles.guestNameLine}><Text style={styles.guestName}>{person.name}</Text><VerifiedBadge person={person} size={12}/></View><Pressable onPress={()=>removeEventAttendee(event.id,person.id)}><Text style={styles.remove}>Remove</Text></Pressable></View>)}</>:null}
              {isHost?<Pressable onPress={()=>Alert.alert('Cancel event?','This removes it from the active campus feed.',[{text:'Keep it',style:'cancel'},{text:'Cancel event',style:'destructive',onPress:async()=>{await cancelEvent(event.id);router.back();}}])} style={styles.cancel}><Text style={styles.cancelText}>Cancel event</Text></Pressable>:null}
            </View>
          ):null}
        </View>
      </ScrollView>
      <Modal visible={inviteOpen} transparent animationType="slide" onRequestClose={()=>setInviteOpen(false)}><Pressable style={styles.sheetBackdrop} onPress={()=>setInviteOpen(false)}/><View style={styles.shareSheet}><View style={styles.sheetHandle}/><View style={styles.inviteHead}><View><Text style={styles.shareTitle}>Invite people</Text><Text style={styles.shareSub}>{event.privacy==='Private'?'Host invites grant access to this private event.':'Friends first, then people you follow.'}</Text></View><Pressable onPress={sendInvites} disabled={!selectedInvitees.length||inviteBusy} style={[styles.inviteSend,(!selectedInvitees.length||inviteBusy)&&styles.inviteSendDisabled]}><Text style={styles.inviteSendText}>{inviteBusy?'…':`Send${selectedInvitees.length?` ${selectedInvitees.length}`:''}`}</Text></Pressable></View><ScrollView showsVerticalScrollIndicator={false}>{inviteCandidates.map((person)=>{const active=selectedInvitees.includes(person.id);return <Pressable key={person.id} onPress={()=>setSelectedInvitees(cur=>cur.includes(person.id)?cur.filter(x=>x!==person.id):[...cur,person.id])} style={styles.shareRow}><Avatar person={person} size={44}/><View style={{flex:1,marginLeft:10}}><View style={styles.hostNameRow}><Text style={styles.shareName}>{person.name}</Text><VerifiedBadge person={person} size={12}/></View><Text style={styles.shareUser}>@{person.username}{friendIds.includes(person.id)?' · Friend':followingIds.includes(person.id)?' · Following':''}</Text></View><Ionicons name={active?'checkmark-circle':'ellipse-outline'} color={active?colors.accent2:colors.subtle} size={21}/></Pressable>})}</ScrollView></View></Modal>
      <Modal visible={shareOpen} transparent animationType="slide" onRequestClose={()=>setShareOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={()=>setShareOpen(false)}/><View style={styles.shareSheet}><View style={styles.sheetHandle}/><Text style={styles.shareTitle}>Send this event</Text><Text style={styles.shareSub}>Drop it straight into a FOMO chat.</Text><ScrollView showsVerticalScrollIndicator={false}>{people.filter((p)=>p.id!==currentUser.id).map((person)=><Pressable key={person.id} onPress={async()=>{try{const chat=await shareEventWithPerson(event.id,person.id);setShareOpen(false);router.push(`/chat/${chat}?peer=${person.id}`);}catch(error:any){Alert.alert('Couldn’t send event',friendlyErrorMessage(error,'Try again.'));}}} style={styles.shareRow}><Avatar person={person} size={44}/><View style={{flex:1,marginLeft:10}}><Text style={styles.shareName}>{person.name}</Text><Text style={styles.shareUser}>@{person.username}</Text></View><Ionicons name="send" color={colors.accent2} size={17}/></Pressable>)}</ScrollView></View>
      </Modal>
    </SafeAreaView>
  );
}

function Info({icon,label,value,last=false}:{icon:keyof typeof Ionicons.glyphMap;label:string;value:string;last?:boolean}){return <View style={[styles.info,!last&&styles.infoBorder]}><View style={styles.infoIcon}><Ionicons name={icon} color={colors.text} size={17}/></View><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} numberOfLines={2}>{value}</Text></View>;}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},content:{paddingBottom:44},topbar:{height:52,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},topActions:{flexDirection:'row',gap:8},circle:{width:38,height:38,borderRadius:19,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},
  hero:{height:390,marginHorizontal:10,borderRadius:30,overflow:'hidden',backgroundColor:colors.surface2},heroShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(0,0,0,.28)'},category:{position:'absolute',left:16,top:16,borderRadius:16,backgroundColor:'rgba(5,5,5,.75)',paddingHorizontal:11,paddingVertical:7},categoryText:{color:colors.white,fontSize:9.5,fontWeight:'900'},heroCopy:{position:'absolute',left:18,right:18,bottom:20},date:{color:colors.white,fontSize:10,fontWeight:'900',letterSpacing:.8},title:{color:colors.white,fontSize:34,lineHeight:36,fontWeight:'900',letterSpacing:-1.3,marginTop:5},place:{color:'#ECECEE',fontSize:12.5,fontWeight:'700',marginTop:8},
  body:{paddingHorizontal:16},hostRow:{height:68,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},hostLabel:{color:colors.muted,fontSize:9},hostNameRow:{flexDirection:'row',alignItems:'center',gap:4},hostName:{color:colors.text,fontSize:12.5,fontWeight:'800',marginTop:2},hostUser:{color:colors.muted,fontWeight:'600'},
  actionRow:{marginTop:12,marginBottom:8,paddingHorizontal:13,paddingVertical:12,borderRadius:22,overflow:'hidden',flexDirection:'row',alignItems:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.12)'},actionCount:{color:colors.text,fontSize:18,fontWeight:'900'},actionSub:{color:colors.muted,fontSize:10.5,marginTop:3},rsvp:{height:42,borderRadius:18,backgroundColor:colors.accent,paddingHorizontal:16,alignItems:'center',justifyContent:'center'},rsvpSecondary:{backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},rsvpText:{color:colors.white,fontSize:11,fontWeight:'900'},rsvpTextSecondary:{color:colors.text},
  friendProof:{flexDirection:'row',alignItems:'center',paddingBottom:16},friendText:{color:colors.muted,fontSize:11,marginLeft:9,fontWeight:'700'},
  infoCard:{backgroundColor:colors.surface,borderRadius:22,paddingHorizontal:13,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},info:{minHeight:58,flexDirection:'row',alignItems:'center'},infoBorder:{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},infoIcon:{width:34,height:34,borderRadius:17,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},infoLabel:{color:colors.muted,fontSize:10,fontWeight:'700',marginLeft:10,width:86},infoValue:{flex:1,color:colors.text,fontSize:11.5,fontWeight:'700',textAlign:'right'},
  map:{height:230,borderRadius:24,overflow:'hidden',marginTop:14,backgroundColor:colors.surface2},mapPin:{width:34,height:34,borderRadius:17,backgroundColor:colors.white,borderWidth:3,alignItems:'center',justifyContent:'center'},mapPinCore:{width:8,height:8,borderRadius:4,backgroundColor:colors.black},mapLock:{position:'absolute',left:11,bottom:11,borderRadius:16,backgroundColor:'rgba(5,5,5,.82)',paddingHorizontal:10,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:6},mapLockText:{color:colors.white,fontSize:9.5,fontWeight:'800'},
  section:{marginTop:27},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sectionTitle:{color:colors.text,fontSize:19,fontWeight:'900',letterSpacing:-.4},sectionMeta:{color:colors.muted,fontSize:10},description:{color:colors.muted,fontSize:13,lineHeight:20,marginTop:9},
  peopleRow:{gap:13,paddingTop:12,paddingRight:16},person:{width:52,alignItems:'center'},personName:{color:colors.muted,fontSize:9,marginTop:5,maxWidth:52},
  addPhoto:{color:colors.text,fontSize:10.5,fontWeight:'800'},photos:{gap:7,paddingTop:11,paddingRight:16},photo:{width:155,height:155,borderRadius:18,backgroundColor:colors.surface2,overflow:'hidden'},videoTile:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface3},emptyPhotos:{color:colors.muted,fontSize:11.5,marginTop:10},
  hostTools:{marginTop:32,padding:16,borderRadius:24,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},hostToolsTitle:{color:colors.text,fontSize:21,fontWeight:'900'},hostToolsSub:{color:colors.muted,fontSize:10,marginTop:3},requestList:{marginTop:12},requestRow:{minHeight:62,flexDirection:'row',alignItems:'center',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.line},requestName:{color:colors.text,fontSize:12,fontWeight:'800'},requestUser:{color:colors.muted,fontSize:9.5,marginTop:2},smallAction:{padding:8},decline:{color:colors.muted,fontSize:9.5,fontWeight:'700'},approve:{backgroundColor:colors.accent,borderRadius:15,paddingHorizontal:10,paddingVertical:7},approveText:{color:colors.white,fontSize:9,fontWeight:'900'},noRequests:{color:colors.muted,fontSize:11,marginTop:12},
  guestLabel:{color:colors.muted,fontSize:9,fontWeight:'900',letterSpacing:.8,marginTop:20,marginBottom:3},guest:{height:50,flexDirection:'row',alignItems:'center',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.line},guestNameLine:{flex:1,marginLeft:9,flexDirection:'row',alignItems:'center',gap:4},guestName:{color:colors.text,fontSize:11.5,fontWeight:'700',marginLeft:9},remove:{color:colors.danger,fontSize:9.5,fontWeight:'700'},addHost:{color:colors.accent2,fontSize:9.5,fontWeight:'900'},cancel:{height:42,borderRadius:21,borderWidth:1,borderColor:colors.line,alignItems:'center',justifyContent:'center',marginTop:17},cancelText:{color:colors.danger,fontSize:10.5,fontWeight:'800'},
  sheetBackdrop:{...StyleSheet.absoluteFill,backgroundColor:'rgba(0,0,0,.58)'},shareSheet:{position:'absolute',left:0,right:0,bottom:0,maxHeight:'67%',backgroundColor:colors.surface,borderTopLeftRadius:30,borderTopRightRadius:30,paddingHorizontal:16,paddingTop:10,paddingBottom:30,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},sheetHandle:{width:42,height:4,borderRadius:2,backgroundColor:colors.line,alignSelf:'center',marginBottom:15},inviteHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},inviteSend:{height:34,borderRadius:17,backgroundColor:colors.accent,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},inviteSendDisabled:{opacity:.3},inviteSendText:{color:colors.white,fontSize:9,fontWeight:'900'},shareTitle:{color:colors.text,fontSize:22,fontWeight:'900',letterSpacing:-.6},shareSub:{color:colors.muted,fontSize:10.5,marginTop:3,marginBottom:10},shareRow:{height:62,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},shareName:{color:colors.text,fontSize:12,fontWeight:'800'},shareUser:{color:colors.muted,fontSize:9.5,marginTop:2},missing:{flex:1,alignItems:'center',justifyContent:'center'},missingTitle:{color:colors.text,fontSize:20,fontWeight:'900'},backLink:{color:colors.muted,marginTop:10},
});
