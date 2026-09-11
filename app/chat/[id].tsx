import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ChatMessage } from '@/data/seed';
import { useApp } from '@/context/AppContext';
import { backendConfigured, supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';

export default function ChatScreen(){
  const router=useRouter();const insets=useSafeAreaInsets();const {id,peer}=useLocalSearchParams<{id:string;peer?:string}>();
  const {currentUser,people,events,getChatMessages,sendChat,demoMode}=useApp();
  const peerPerson=people.find((p)=>p.id===peer);
  const [messages,setMessages]=useState<ChatMessage[]>([]);const [body,setBody]=useState('');const [sending,setSending]=useState(false);const [keyboardOpen,setKeyboardOpen]=useState(false);
  const listRef=useRef<FlatList<ChatMessage>>(null);
  const inputRef=useRef<TextInput>(null);

  const load=useCallback(async()=>{if(!id)return;try{setMessages(await getChatMessages(id));setTimeout(()=>listRef.current?.scrollToEnd({animated:false}),50);}catch(error:any){Alert.alert('Couldn’t load messages',friendlyErrorMessage(error,'Try again.'));}},[id,getChatMessages]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const client=supabase;
    if(!id||demoMode||!backendConfigured||!client)return;
    const channel=client.channel(`chat-${id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${id}`},()=>load())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'message_event_shares'},()=>load())
      .subscribe();
    return()=>{client.removeChannel(channel);};
  },[id,demoMode,load]);
  useEffect(()=>{
    const show=Keyboard.addListener(Platform.OS==='ios'?'keyboardWillShow':'keyboardDidShow',()=>{setKeyboardOpen(true);setTimeout(()=>listRef.current?.scrollToEnd({animated:false}),50);});
    const hide=Keyboard.addListener(Platform.OS==='ios'?'keyboardWillHide':'keyboardDidHide',()=>setKeyboardOpen(false));
    const focusTimer=setTimeout(()=>inputRef.current?.focus(),Platform.OS==='ios'?320:120);
    return()=>{show.remove();hide.remove();clearTimeout(focusTimer);};
  },[id]);

  const send=async()=>{if(!body.trim()||!id||sending)return;const text=body.trim();const tempId=`local-${Date.now()}`;setBody('');setSending(true);setMessages(cur=>[...cur,{id:tempId,conversationId:id,senderId:currentUser.id,body:text,createdAt:new Date().toISOString()}]);
    try{await sendChat(id,text);if(!demoMode)await load();setTimeout(()=>listRef.current?.scrollToEnd({animated:true}),80);}
    catch(error:any){setMessages(cur=>cur.filter(m=>m.id!==tempId));setBody(text);Alert.alert('Couldn’t send',friendlyErrorMessage(error,'Try again.'));}finally{setSending(false);}
  };

  return(
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={styles.head}>
          <Pressable onPress={()=>router.back()} style={({pressed})=>[styles.back,pressed&&styles.pressed]}><Ionicons name="chevron-back" color={colors.text} size={23}/></Pressable>
          {peerPerson?<Pressable onPress={()=>router.push(`/profile/${peerPerson.id}`)}><Avatar person={peerPerson} size={40}/></Pressable>:null}
          <Pressable disabled={!peerPerson} onPress={()=>peerPerson&&router.push(`/profile/${peerPerson.id}`)} style={styles.headCopy}>
            <View style={styles.chatNameLine}><Text style={styles.name}>{peerPerson?.name??'Message'}</Text>{peerPerson?<VerifiedBadge person={peerPerson} size={13}/>:null}</View>
            <View style={styles.statusLine}><View style={styles.statusDot}/><Text style={styles.user}>{peerPerson?`@${peerPerson.username}`:'FOMO chat'}</Text></View>
          </Pressable>
          <View style={styles.privatePill}><Ionicons name="lock-closed" color={colors.subtle} size={11}/><Text style={styles.privateText}>PRIVATE</Text></View>
        </View>

        <FlatList
          ref={listRef} data={messages} keyExtractor={(m)=>m.id} contentContainerStyle={styles.messages}
          onContentSizeChange={()=>listRef.current?.scrollToEnd({animated:false})}
          keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'}
          keyboardShouldPersistTaps="handled"
          renderItem={({item,index})=>{
            const mine=item.senderId===currentUser.id;
            const prev=messages[index-1];
            const sameSender=prev?.senderId===item.senderId && Math.abs(new Date(item.createdAt).getTime()-new Date(prev.createdAt).getTime())<5*60*1000;
            const sharedEvent=item.sharedEventId?events.find((e)=>e.id===item.sharedEventId):undefined;
            return <View style={[styles.bubbleRow,mine&&styles.bubbleRowMine,sameSender&&styles.bubbleRowTight]}>
              <View style={[styles.bubble,mine&&styles.bubbleMine,sameSender&&(mine?styles.bubbleMineGrouped:styles.bubbleGrouped),sharedEvent&&styles.eventBubble]}>
                {sharedEvent?<Pressable onPress={()=>router.push(`/event/${sharedEvent.id}`)} style={styles.eventShare}>{sharedEvent.cover?<Image source={{uri:sharedEvent.cover}} style={styles.eventCover}/>:<View style={styles.eventCoverFallback}><Ionicons name="calendar" color={colors.accent2} size={22}/></View>}<View style={styles.eventShareCopy}><Text style={[styles.eventKicker,mine&&styles.eventKickerMine]}>SHARED EVENT</Text><Text style={[styles.eventTitle,mine&&styles.eventTitleMine]} numberOfLines={2}>{sharedEvent.title}</Text><Text style={[styles.eventMeta,mine&&styles.eventMetaMine]} numberOfLines={1}>{sharedEvent.dateLabel} · {sharedEvent.time}</Text><Text style={[styles.eventMeta,mine&&styles.eventMetaMine]} numberOfLines={1}>{sharedEvent.location}</Text></View><Ionicons name="chevron-forward" color={mine?'#66666D':colors.subtle} size={17}/></Pressable>:<Text style={[styles.body,mine&&styles.bodyMine]}>{item.body}</Text>}
                <Text style={[styles.timestamp,mine&&styles.timestampMine]}>{new Date(item.createdAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</Text>
              </View>
            </View>;
          }}
          ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyAvatar}>{peerPerson?<Avatar person={peerPerson} size={64}/>:<Ionicons name="chatbubble-outline" color={colors.muted} size={28}/>}</View><Text style={styles.emptyTitle}>Say hey.</Text><Text style={styles.emptyBody}>This is a private one-to-one conversation{peerPerson?` with ${peerPerson.name.split(' ')[0]}`:''}.</Text></View>}
        />

        <View style={[styles.composerOuter,{paddingBottom:keyboardOpen?8:Math.max(insets.bottom,12)}]}>
          <BlurView intensity={60} tint="systemUltraThinMaterialDark" style={styles.composer}>
            <TextInput ref={inputRef} autoFocus value={body} onChangeText={setBody} placeholder="Message…" placeholderTextColor={colors.subtle} style={styles.input} multiline maxLength={2000} keyboardAppearance="dark"/>
            <Pressable onPress={send} disabled={!body.trim()||sending} style={({pressed})=>[styles.send,(!body.trim()||sending)&&styles.sendDisabled,pressed&&body.trim()?styles.pressed:null]}><Ionicons name="arrow-up" color={body.trim()?colors.white:colors.subtle} size={19}/></Pressable>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},head:{height:62,paddingHorizontal:10,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line,backgroundColor:'rgba(7,7,8,.98)'},back:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',marginRight:2},pressed:{opacity:.72,transform:[{scale:.97}]},headCopy:{marginLeft:9,flex:1},chatNameLine:{flexDirection:'row',alignItems:'center',gap:4},name:{color:colors.text,fontSize:13.5,fontWeight:'900'},statusLine:{flexDirection:'row',alignItems:'center',gap:5,marginTop:2},statusDot:{width:5,height:5,borderRadius:3,backgroundColor:colors.success},user:{color:colors.muted,fontSize:9.5},privatePill:{height:26,borderRadius:13,backgroundColor:colors.surface2,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:8,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},privateText:{color:colors.subtle,fontSize:7.5,fontWeight:'900',letterSpacing:.6},
  messages:{paddingHorizontal:12,paddingTop:18,paddingBottom:22,flexGrow:1},bubbleRow:{alignItems:'flex-start',marginTop:10},bubbleRowMine:{alignItems:'flex-end'},bubbleRowTight:{marginTop:3},bubble:{maxWidth:'82%',backgroundColor:colors.surface2,borderRadius:21,borderBottomLeftRadius:7,paddingHorizontal:13,paddingTop:10,paddingBottom:7,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},bubbleMine:{backgroundColor:colors.accentSoft,borderColor:'rgba(111,125,255,.28)',borderBottomLeftRadius:21,borderBottomRightRadius:7},eventBubble:{padding:6,maxWidth:'88%'},eventShare:{width:250,minHeight:86,flexDirection:'row',alignItems:'center'},eventCover:{width:72,height:72,borderRadius:15,backgroundColor:colors.surface3},eventCoverFallback:{width:72,height:72,borderRadius:15,backgroundColor:colors.surface3,alignItems:'center',justifyContent:'center'},eventShareCopy:{flex:1,minWidth:0,marginLeft:10},eventKicker:{color:colors.accent2,fontSize:7.5,fontWeight:'900',letterSpacing:.8},eventKickerMine:{color:colors.accent2},eventTitle:{color:colors.text,fontSize:12,fontWeight:'900',marginTop:2},eventTitleMine:{color:colors.text},eventMeta:{color:colors.muted,fontSize:8.5,marginTop:2},eventMetaMine:{color:colors.muted},bubbleGrouped:{borderTopLeftRadius:10},bubbleMineGrouped:{borderTopRightRadius:10},body:{color:colors.text,fontSize:13.5,lineHeight:19},bodyMine:{color:colors.text},timestamp:{color:colors.subtle,fontSize:8.5,marginTop:4,alignSelf:'flex-end'},timestampMine:{color:colors.subtle},
  empty:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:36,paddingTop:120},emptyAvatar:{width:78,height:78,borderRadius:39,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center',marginBottom:14},emptyTitle:{color:colors.text,fontSize:18,fontWeight:'900'},emptyBody:{color:colors.muted,fontSize:11.5,lineHeight:17,textAlign:'center',marginTop:5},
  composerOuter:{paddingHorizontal:12,paddingTop:9,backgroundColor:'rgba(11,13,15,.94)',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.line},composer:{minHeight:56,borderRadius:24,overflow:'hidden',flexDirection:'row',alignItems:'flex-end',paddingLeft:16,paddingRight:6,paddingVertical:6,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.14)'},input:{flex:1,maxHeight:112,minHeight:42,color:colors.text,fontSize:13.5,lineHeight:19,paddingTop:10,paddingBottom:9},send:{width:44,height:44,borderRadius:18,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},sendDisabled:{backgroundColor:'#202024'},
});
