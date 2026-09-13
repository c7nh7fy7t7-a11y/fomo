import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { FeedMediaType, FomoEvent, Person } from '@/data/seed';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { Avatar } from '@/components/Avatar';

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  useEffect(() => () => { try { player.pause(); } catch {} }, [player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls fullscreenOptions={{enable:true}} />;
}

type MediaDraft = {
  uri: string;
  mediaType: FeedMediaType;
  width?: number;
  height?: number;
  durationMs?: number;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
};

function eventTime(event:FomoEvent){
  const time=new Date(`${event.eventDate}T12:00:00`).getTime();
  return Number.isFinite(time)?time:0;
}

export function CreatePostModal({ visible, initialKind='image', events, people, currentUserId, onClose, onPost }: {
  visible: boolean; initialKind?: FeedMediaType; events: FomoEvent[]; people: Person[]; currentUserId: string; onClose: () => void;
  onPost: (input: { uri: string; caption: string; eventId?: string; taggedUserIds: string[]; mediaType?: FeedMediaType; mediaWidth?: number; mediaHeight?: number; mediaDurationMs?: number; mimeType?: string; fileName?: string }) => Promise<void>;
}) {
  const [draft,setDraft]=useState<MediaDraft>();
  const [caption,setCaption]=useState('');
  const [eventId,setEventId]=useState<string>();
  const [tags,setTags]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [peopleSearch,setPeopleSearch]=useState('');
  const [eventSearch,setEventSearch]=useState('');
  const taggable=useMemo(()=>people.filter((person)=>person.id!==currentUserId && `${person.name} ${person.username}`.toLowerCase().includes(peopleSearch.toLowerCase())).slice(0,8),[people,currentUserId,peopleSearch]);
  const recentEvents=useMemo(()=>{
    const now=Date.now(); const earliest=now-45*86400000; const latest=now+7*86400000;
    return events
      .filter((event)=>eventTime(event)>=earliest&&eventTime(event)<=latest&&(event.hostId===currentUserId||(event.cohostIds??[]).includes(currentUserId)||event.attendeeIds.includes(currentUserId)))
      .sort((a,b)=>Math.abs(eventTime(a)-now)-Math.abs(eventTime(b)-now))
      .slice(0,4);
  },[currentUserId,events]);
  const eventResults=useMemo(()=>{
    const query=eventSearch.trim().toLowerCase(); if(!query)return [];
    const now=Date.now();
    return events.filter((event)=>event.title.toLowerCase().includes(query)).sort((a,b)=>Math.abs(eventTime(a)-now)-Math.abs(eventTime(b)-now)).slice(0,8);
  },[eventSearch,events]);
  const eventChoices=eventSearch.trim()?eventResults:recentEvents;

  useEffect(()=>{ if(!visible) setDraft(undefined); },[visible]);
  const reset=()=>{setDraft(undefined);setCaption('');setEventId(undefined);setTags([]);setPeopleSearch('');setEventSearch('');};
  const close=()=>{if(!busy){reset();onClose();}};

  const applyAsset=(asset:ImagePicker.ImagePickerAsset, mediaType:FeedMediaType)=>{
    if(mediaType==='video' && (asset.duration??0)>60000){Alert.alert('Keep it under a minute','Video posts are limited to 60 seconds for now.');return;}
    if((asset.fileSize??0)>100*1024*1024){Alert.alert('That file is too large','Choose a photo or video under 100 MB.');return;}
    setDraft({
      uri:asset.uri,mediaType,width:asset.width,height:asset.height,durationMs:asset.duration==null?undefined:Math.round(asset.duration),
      mimeType:asset.mimeType??undefined,fileName:asset.fileName??undefined,fileSize:asset.fileSize??undefined,
    });
    Haptics.selectionAsync().catch(()=>{});
  };

  const chooseLibrary=async()=>{
    const mediaType:FeedMediaType=initialKind==='video'?'video':'image';
    if(mediaType==='video'){
      const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted){Alert.alert('Photos permission needed','Allow FOMO to access your library so you can choose a video.');return;}
    }
    const result=await ImagePicker.launchImageLibraryAsync({
      mediaTypes:[mediaType==='video'?'videos':'images'],allowsEditing:false,quality:mediaType==='image'?0.86:1,videoMaxDuration:60,
    });
    const asset=result.canceled?undefined:result.assets[0]; if(asset?.uri)applyAsset(asset,mediaType);
  };

  const takePhoto=async()=>{
    const permission=await ImagePicker.requestCameraPermissionsAsync();
    if(!permission.granted){Alert.alert('Camera permission needed','Allow FOMO to use your camera so you can take a photo.');return;}
    const result=await ImagePicker.launchCameraAsync({mediaTypes:['images'],allowsEditing:false,quality:.86,cameraType:ImagePicker.CameraType.back});
    const asset=result.canceled?undefined:result.assets[0]; if(asset?.uri)applyAsset(asset,'image');
  };

  const changeMedia=()=>{
    if(initialKind==='video'){chooseLibrary().catch(()=>{});return;}
    Alert.alert('Add a photo','Take one now or choose one you already have.',[
      {text:'Cancel',style:'cancel'},
      {text:'Choose from library',onPress:()=>chooseLibrary().catch(()=>{})},
      {text:'Take photo',onPress:()=>takePhoto().catch(()=>{})},
    ]);
  };

  const submit=async()=>{
    if(!draft){Alert.alert(initialKind==='video'?'Add a video':'Add a photo',`${initialKind==='video'?'Choose a video':'Take or choose a photo'} first.`);return;}
    setBusy(true);
    try{
      await onPost({uri:draft.uri,caption,eventId,taggedUserIds:tags,mediaType:draft.mediaType,mediaWidth:draft.width,mediaHeight:draft.height,mediaDurationMs:draft.durationMs,mimeType:draft.mimeType,fileName:draft.fileName});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});reset();onClose();
    } catch(error:any){Alert.alert('Couldn’t post that',friendlyErrorMessage(error,'Try again in a moment.'));}
    finally{setBusy(false);}
  };

  const ratio=draft?.width&&draft?.height?Math.max(.62,Math.min(1.75,draft.width/draft.height)):1;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={styles.handle}/>
        <View style={styles.head}>
          <Pressable onPress={close}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <View style={styles.headTitle}><Ionicons name={initialKind==='video'?'videocam':'camera'} color={colors.accent2} size={15}/><Text style={styles.title}>{initialKind==='video'?'New video':'New photo'}</Text></View>
          <Pressable onPress={submit} disabled={busy||!draft}><Text style={[styles.post,(busy||!draft)&&styles.disabled]}>{busy?'Posting…':'Post'}</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={draft?changeMedia:undefined} style={[styles.media,{aspectRatio:ratio}]}>
            {draft?.mediaType==='video'?<VideoPreview uri={draft.uri}/>:draft?<Image source={{uri:draft.uri}} style={StyleSheet.absoluteFill} resizeMode="cover"/>:
              <View style={styles.mediaEmpty}>
                <Ionicons name={initialKind==='video'?'videocam-outline':'camera-outline'} color={colors.muted} size={38}/>
                <Text style={styles.mediaText}>{initialKind==='video'?'Choose a video':'Share a moment'}</Text>
                {initialKind==='image'?<View style={styles.sourceRow}>
                  <Pressable onPress={takePhoto} style={styles.sourcePrimary}><Ionicons name="camera" color={colors.black} size={17}/><Text style={styles.sourcePrimaryText}>Take photo</Text></Pressable>
                  <Pressable onPress={chooseLibrary} style={styles.sourceSecondary}><Ionicons name="images-outline" color={colors.text} size={17}/><Text style={styles.sourceSecondaryText}>Upload</Text></Pressable>
                </View>:<Pressable onPress={chooseLibrary} style={styles.sourcePrimary}><Ionicons name="film-outline" color={colors.black} size={17}/><Text style={styles.sourcePrimaryText}>Choose video</Text></Pressable>}
              </View>}
            {draft?<View style={styles.change}><Ionicons name="swap-horizontal" color={colors.white} size={16}/><Text style={styles.changeText}>Change</Text></View>:null}
          </Pressable>
          {draft?.mediaType==='video'?<Text style={styles.videoNote}>Videos autoplay muted in Feed and pause when you scroll away.</Text>:null}
          <TextInput value={caption} onChangeText={setCaption} placeholder="What happened?" placeholderTextColor={colors.subtle} multiline style={styles.caption} maxLength={500}/>

          <Text style={styles.sectionLabel}>WHERE WAS THIS?</Text>
          <View style={styles.eventPicker}>
            <View style={styles.eventSearchWrap}><Ionicons name="search" color={colors.subtle} size={17}/><TextInput value={eventSearch} onChangeText={setEventSearch} placeholder="Search events" placeholderTextColor={colors.subtle} autoCapitalize="none" returnKeyType="search" style={styles.eventSearch}/>{eventSearch?<Pressable accessibilityRole="button" accessibilityLabel="Clear event search" onPress={()=>setEventSearch('')} style={styles.clearSearch}><Ionicons name="close-circle" color={colors.muted} size={18}/></Pressable>:null}</View>
            <Pressable accessibilityRole="button" accessibilityState={{selected:!eventId}} onPress={()=>setEventId(undefined)} style={({pressed})=>[styles.noEvent,!eventId&&styles.eventRowActive,pressed&&styles.pressed]}><View style={styles.eventIcon}><Ionicons name="remove" color={colors.muted} size={18}/></View><View style={styles.eventCopy}><Text style={styles.eventName}>No event</Text><Text style={styles.eventMeta}>Post without linking an event</Text></View><View style={[styles.check,!eventId&&styles.checkActive]}>{!eventId?<Ionicons name="checkmark" color={colors.white} size={15}/>:null}</View></Pressable>
            <Text style={styles.pickerLabel}>{eventSearch.trim()?'SEARCH RESULTS':'RECENT'}</Text>
            {eventChoices.length?eventChoices.map((event)=>{const selected=event.id===eventId;return <Pressable key={event.id} accessibilityRole="button" accessibilityState={{selected}} onPress={()=>{setEventId(event.id);Haptics.selectionAsync().catch(()=>{});}} style={({pressed})=>[styles.eventRow,selected&&styles.eventRowActive,pressed&&styles.pressed]}><View style={styles.eventIcon}><Ionicons name="calendar-outline" color={selected?colors.accent2:colors.muted} size={18}/></View><View style={styles.eventCopy}><Text style={styles.eventName} numberOfLines={1}>{event.title}</Text><Text style={styles.eventMeta} numberOfLines={1}>{event.dateLabel} · {event.time}</Text></View><View style={[styles.check,selected&&styles.checkActive]}>{selected?<Ionicons name="checkmark" color={colors.white} size={15}/>:null}</View></Pressable>}):<View style={styles.eventEmpty}><Ionicons name={eventSearch.trim()?'search-outline':'time-outline'} color={colors.subtle} size={19}/><Text style={styles.eventEmptyText}>{eventSearch.trim()?'No matching events.':'No recent events yet. Search to find an older one.'}</Text></View>}
          </View>

          <Text style={styles.sectionLabel}>WHO’S IN THIS?</Text>
          <TextInput value={peopleSearch} onChangeText={setPeopleSearch} placeholder="Search people" placeholderTextColor={colors.subtle} style={styles.search}/>
          <View style={styles.people}>
            {taggable.map((person)=>{const selected=tags.includes(person.id);return <Pressable key={person.id} onPress={()=>{Haptics.selectionAsync().catch(()=>{});setTags((cur)=>selected?cur.filter((id)=>id!==person.id):[...cur,person.id]);}} style={styles.personRow}>
              <View style={styles.personAvatar}><Avatar person={person} size={40} circular/></View>
              <View style={{flex:1}}><Text style={styles.personName}>{person.name}</Text><Text style={styles.personUser}>@{person.username}</Text></View>
              <View style={[styles.check,selected&&styles.checkActive]}>{selected?<Ionicons name="checkmark" color={colors.white} size={15}/>:null}</View>
            </Pressable>;})}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg,paddingTop:9},handle:{width:42,height:4,borderRadius:2,backgroundColor:colors.line,alignSelf:'center',marginBottom:8},
  head:{height:52,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},
  headTitle:{flexDirection:'row',alignItems:'center',gap:6},cancel:{color:colors.muted,fontSize:13},title:{color:colors.text,fontSize:15,fontWeight:'900'},post:{color:colors.accent2,fontSize:13,fontWeight:'900'},disabled:{opacity:.35},
  content:{paddingBottom:44},media:{margin:16,marginBottom:8,minHeight:220,maxHeight:520,borderRadius:25,overflow:'hidden',backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  mediaEmpty:{minHeight:290,alignItems:'center',justifyContent:'center',gap:9,paddingHorizontal:18},mediaText:{color:colors.muted,fontSize:12,fontWeight:'700'},sourceRow:{flexDirection:'row',gap:8,marginTop:8},sourcePrimary:{height:42,borderRadius:21,backgroundColor:colors.accent,paddingHorizontal:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},sourcePrimaryText:{color:colors.white,fontSize:10.5,fontWeight:'900'},sourceSecondary:{height:42,borderRadius:21,backgroundColor:colors.surface3,paddingHorizontal:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},sourceSecondaryText:{color:colors.text,fontSize:10.5,fontWeight:'900'},change:{position:'absolute',right:12,bottom:12,height:36,borderRadius:18,backgroundColor:'rgba(15,16,19,.86)',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:5,paddingHorizontal:11,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.12)'},changeText:{color:colors.white,fontSize:10,fontWeight:'800'},
  videoNote:{color:colors.subtle,fontSize:10.5,lineHeight:15,paddingHorizontal:18,marginBottom:5},caption:{minHeight:90,color:colors.text,fontSize:16,lineHeight:23,paddingHorizontal:18,paddingVertical:12,textAlignVertical:'top'},
  sectionLabel:{color:colors.muted,fontSize:9,fontWeight:'900',letterSpacing:1.1,paddingHorizontal:18,marginTop:16,marginBottom:9},
  eventPicker:{marginHorizontal:18,borderRadius:22,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,overflow:'hidden'},eventSearchWrap:{height:48,margin:8,marginBottom:4,borderRadius:18,backgroundColor:colors.surface2,flexDirection:'row',alignItems:'center',paddingLeft:13,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},eventSearch:{flex:1,height:46,color:colors.text,fontSize:12.5,paddingHorizontal:9},clearSearch:{width:42,height:42,alignItems:'center',justifyContent:'center'},pickerLabel:{color:colors.accent2,fontSize:8.5,fontWeight:'900',letterSpacing:1,paddingHorizontal:13,paddingTop:12,paddingBottom:6},noEvent:{minHeight:58,marginHorizontal:8,paddingHorizontal:7,borderRadius:17,flexDirection:'row',alignItems:'center'},eventRow:{minHeight:64,marginHorizontal:8,paddingHorizontal:7,borderRadius:17,flexDirection:'row',alignItems:'center'},eventRowActive:{backgroundColor:colors.accentSoft},eventIcon:{width:40,height:40,borderRadius:16,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center',marginRight:10},eventCopy:{flex:1,minWidth:0},eventName:{color:colors.text,fontSize:12.5,fontWeight:'800'},eventMeta:{color:colors.muted,fontSize:9.5,fontWeight:'600',marginTop:3},eventEmpty:{minHeight:70,paddingHorizontal:15,paddingBottom:12,flexDirection:'row',alignItems:'center',gap:9},eventEmptyText:{flex:1,color:colors.muted,fontSize:10.5,lineHeight:15},
  search:{marginHorizontal:18,height:44,borderRadius:22,backgroundColor:colors.surface2,color:colors.text,paddingHorizontal:15,fontSize:13,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  people:{paddingHorizontal:18,marginTop:7},personRow:{height:58,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},
  personAvatar:{width:40,height:40,borderRadius:20,marginRight:10},personName:{color:colors.text,fontSize:12.5,fontWeight:'800'},personUser:{color:colors.muted,fontSize:10,marginTop:1},check:{width:24,height:24,borderRadius:12,borderWidth:1,borderColor:colors.line,alignItems:'center',justifyContent:'center'},checkActive:{backgroundColor:colors.accent,borderColor:colors.accent2},pressed:{opacity:.76,transform:[{scale:.99}]},
});
