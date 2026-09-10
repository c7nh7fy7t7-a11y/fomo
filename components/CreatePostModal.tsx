import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { FeedMediaType, FomoEvent, Person } from '@/data/seed';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';

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
  const taggable=useMemo(()=>people.filter((person)=>person.id!==currentUserId && `${person.name} ${person.username}`.toLowerCase().includes(peopleSearch.toLowerCase())).slice(0,8),[people,currentUserId,peopleSearch]);

  useEffect(()=>{ if(!visible) setDraft(undefined); },[visible]);
  const reset=()=>{setDraft(undefined);setCaption('');setEventId(undefined);setTags([]);setPeopleSearch('');};
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
          {draft?.mediaType==='video'?<Text style={styles.videoNote}>Videos stay in the normal campus Feed — tap to play, and they stop when you scroll away.</Text>:null}
          <TextInput value={caption} onChangeText={setCaption} placeholder="What happened?" placeholderTextColor={colors.subtle} multiline style={styles.caption} maxLength={500}/>

          <Text style={styles.sectionLabel}>WHERE WAS THIS?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Pressable onPress={()=>setEventId(undefined)} style={[styles.chip,!eventId&&styles.chipActive]}><Text style={[styles.chipText,!eventId&&styles.chipTextActive]}>No event</Text></Pressable>
            {events.slice(0,12).map((event)=><Pressable key={event.id} onPress={()=>setEventId(event.id)} style={[styles.chip,eventId===event.id&&styles.chipActive]}><Text style={[styles.chipText,eventId===event.id&&styles.chipTextActive]} numberOfLines={1}>{event.title}</Text></Pressable>)}
          </ScrollView>

          <Text style={styles.sectionLabel}>WHO’S IN THIS?</Text>
          <TextInput value={peopleSearch} onChangeText={setPeopleSearch} placeholder="Search people" placeholderTextColor={colors.subtle} style={styles.search}/>
          <View style={styles.people}>
            {taggable.map((person)=>{const selected=tags.includes(person.id);return <Pressable key={person.id} onPress={()=>{Haptics.selectionAsync().catch(()=>{});setTags((cur)=>selected?cur.filter((id)=>id!==person.id):[...cur,person.id]);}} style={styles.personRow}>
              <View style={styles.personInitial}><Text style={styles.personInitialText}>{person.initials}</Text></View>
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
  chips:{paddingHorizontal:18,gap:8},chip:{maxWidth:190,height:36,borderRadius:18,backgroundColor:colors.surface2,paddingHorizontal:13,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  chipActive:{backgroundColor:colors.accent,borderColor:colors.accent2},chipText:{color:colors.muted,fontSize:11,fontWeight:'700'},chipTextActive:{color:colors.white},
  search:{marginHorizontal:18,height:44,borderRadius:22,backgroundColor:colors.surface2,color:colors.text,paddingHorizontal:15,fontSize:13,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  people:{paddingHorizontal:18,marginTop:7},personRow:{height:58,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},
  personInitial:{width:38,height:38,borderRadius:19,backgroundColor:colors.surface3,alignItems:'center',justifyContent:'center',marginRight:10},personInitialText:{color:colors.text,fontSize:11,fontWeight:'900'},
  personName:{color:colors.text,fontSize:12.5,fontWeight:'800'},personUser:{color:colors.muted,fontSize:10,marginTop:1},check:{width:24,height:24,borderRadius:12,borderWidth:1,borderColor:colors.line,alignItems:'center',justifyContent:'center'},checkActive:{backgroundColor:colors.accent,borderColor:colors.accent2},
});
