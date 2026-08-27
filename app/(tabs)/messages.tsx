import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { GlassSurface } from '@/components/GlassSurface';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { timeAgo } from '@/utils/time';

export default function MessagesScreen(){
  const router=useRouter();
  const {conversations,people,currentUser,friendIds,openChatWith,refreshConversations}=useApp();
  const [newOpen,setNewOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [newQuery,setNewQuery]=useState('');

  const filteredConversations=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return conversations;
    return conversations.filter((conversation)=>{
      const peer=people.find((p)=>p.id===conversation.peerId);
      return peer?.name.toLowerCase().includes(q)||peer?.username.toLowerCase().includes(q)||(conversation.lastMessage??'').toLowerCase().includes(q);
    });
  },[conversations,people,query]);

  const candidates=useMemo(()=>{
    const q=newQuery.trim().toLowerCase();
    return people.filter((p)=>p.id!==currentUser.id)
      .filter((p)=>!q||p.name.toLowerCase().includes(q)||p.username.toLowerCase().includes(q))
      .sort((a,b)=>Number(friendIds.includes(b.id))-Number(friendIds.includes(a.id))||a.name.localeCompare(b.name));
  },[people,currentUser.id,friendIds,newQuery]);

  const open=async(peerId:string)=>{
    try{const id=await openChatWith(peerId);setNewOpen(false);setNewQuery('');router.push(`/chat/${id}?peer=${peerId}`);}
    catch(error:any){Alert.alert('Couldn’t open chat',friendlyErrorMessage(error,'Try again.'));}
  };

  return(
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <View><Text style={styles.kicker}>PRIVATE</Text><Text style={styles.title}>Messages</Text><Text style={styles.sub}>One-to-one conversations.</Text></View>
        <Pressable onPress={()=>setNewOpen(true)} style={({pressed})=>[styles.new,pressed&&styles.pressed]}><Ionicons name="create-outline" color={colors.white} size={20}/></Pressable>
      </View>

      <GlassSurface style={styles.searchWrap} intensity={56}>
        <Ionicons name="search-outline" color={colors.subtle} size={17}/>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search messages" placeholderTextColor={colors.subtle} style={styles.searchInput}/>
        {query?<Pressable onPress={()=>setQuery('')} hitSlop={10}><Ionicons name="close-circle" color={colors.subtle} size={17}/></Pressable>:null}
      </GlassSurface>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} onScrollEndDrag={refreshConversations}>
        {filteredConversations.length?filteredConversations.map((conversation)=>{
          const peer=people.find((p)=>p.id===conversation.peerId); if(!peer)return null;
          return <Pressable key={conversation.id} onPress={()=>router.push(`/chat/${conversation.id}?peer=${peer.id}`)} style={({pressed})=>[styles.row,pressed&&styles.rowPressed]}>
            <View style={styles.avatarWrap}><Avatar person={peer} size={53}/><View style={styles.onlineDot}/></View>
            <View style={styles.copy}>
              <View style={styles.nameLine}><View style={styles.nameInline}><Text style={styles.name}>{peer.name}</Text><VerifiedBadge person={peer} size={12}/></View><Text style={styles.time}>{conversation.lastMessageAt?timeAgo(conversation.lastMessageAt):''}</Text></View>
              <Text style={styles.preview} numberOfLines={1}>{conversation.lastMessage??'Start the conversation.'}</Text>
            </View>
            <Ionicons name="chevron-forward" color="#4F4F58" size={15}/>
          </Pressable>;
        }):<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" color={colors.muted} size={26}/></View><Text style={styles.emptyTitle}>{query?'No matches.':'No messages yet.'}</Text><Text style={styles.emptyBody}>{query?'Try another name or message.':'Message a friend from their profile or start one here.'}</Text>{!query?<Pressable onPress={()=>setNewOpen(true)} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Start a message</Text><Ionicons name="arrow-forward" color={colors.black} size={14}/></Pressable>:null}</View>}
      </ScrollView>

      <Modal visible={newOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setNewOpen(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.sheetHandle}/>
          <View style={styles.modalHead}><View><Text style={styles.modalTitle}>New message</Text><Text style={styles.modalSub}>Pick someone on campus.</Text></View><Pressable onPress={()=>setNewOpen(false)} style={styles.close}><Ionicons name="close" color={colors.text} size={20}/></Pressable></View>
          <GlassSurface style={[styles.searchWrap,styles.modalSearch]} intensity={56}><Ionicons name="search-outline" color={colors.subtle} size={17}/><TextInput value={newQuery} onChangeText={setNewQuery} placeholder="Search people" placeholderTextColor={colors.subtle} style={styles.searchInput}/></GlassSurface>
          <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
            {candidates.map((person)=><Pressable key={person.id} onPress={()=>open(person.id)} style={({pressed})=>[styles.person,pressed&&styles.rowPressed]}>
              <Avatar person={person} size={47}/><View style={{flex:1,marginLeft:11}}><View style={styles.personNameLine}><Text style={styles.name}>{person.name}</Text>{friendIds.includes(person.id)?<View style={styles.friendPill}><Text style={styles.friendPillText}>FRIEND</Text></View>:null}</View><Text style={styles.preview}>@{person.username}</Text></View><Ionicons name="arrow-forward" color={colors.subtle} size={16}/>
            </Pressable>)}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},head:{paddingHorizontal:16,paddingTop:16,paddingBottom:13,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},kicker:{color:colors.subtle,fontSize:8,fontWeight:'900',letterSpacing:1.2},title:{color:colors.text,fontSize:31,fontWeight:'900',letterSpacing:-1,marginTop:2},sub:{color:colors.muted,fontSize:11,marginTop:2},
  new:{width:43,height:43,borderRadius:17,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},pressed:{opacity:.75,transform:[{scale:.97}]},
  searchWrap:{height:46,marginHorizontal:16,borderRadius:20,flexDirection:'row',alignItems:'center',paddingHorizontal:14,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},searchInput:{flex:1,color:colors.text,fontSize:12.5,marginLeft:8,paddingVertical:0},
  list:{paddingHorizontal:12,paddingTop:12,paddingBottom:120},row:{minHeight:78,flexDirection:'row',alignItems:'center',paddingHorizontal:9,paddingVertical:8,borderRadius:21,marginBottom:4},rowPressed:{backgroundColor:colors.surface2},avatarWrap:{position:'relative'},onlineDot:{position:'absolute',right:0,bottom:1,width:11,height:11,borderRadius:6,backgroundColor:colors.success,borderWidth:2,borderColor:colors.bg},copy:{flex:1,marginLeft:12,marginRight:8},nameLine:{flexDirection:'row',alignItems:'center'},nameInline:{flexDirection:'row',alignItems:'center',gap:4},name:{color:colors.text,fontSize:13.5,fontWeight:'900'},time:{marginLeft:'auto',color:colors.subtle,fontSize:9.5,fontWeight:'700'},preview:{color:colors.muted,fontSize:11.5,marginTop:4},
  empty:{alignItems:'center',paddingTop:96,paddingHorizontal:32},emptyIcon:{width:54,height:54,borderRadius:27,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center',marginBottom:13},emptyTitle:{color:colors.text,fontSize:18,fontWeight:'900'},emptyBody:{color:colors.muted,fontSize:11.5,lineHeight:17,textAlign:'center',marginTop:5},emptyButton:{height:38,borderRadius:19,backgroundColor:colors.accent,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:7,marginTop:14},emptyButtonText:{color:colors.white,fontSize:10,fontWeight:'900'},
  modalSafe:{flex:1,backgroundColor:colors.bg},sheetHandle:{width:42,height:4,borderRadius:2,backgroundColor:colors.line,alignSelf:'center',marginTop:8},modalHead:{minHeight:70,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},modalTitle:{color:colors.text,fontSize:21,fontWeight:'900',letterSpacing:-.4},modalSub:{color:colors.muted,fontSize:10.5,marginTop:2},close:{width:36,height:36,borderRadius:18,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},modalSearch:{marginTop:3,marginBottom:10},modalList:{paddingHorizontal:12,paddingBottom:30},person:{minHeight:68,flexDirection:'row',alignItems:'center',paddingHorizontal:8,borderRadius:19},personNameLine:{flexDirection:'row',alignItems:'center',gap:7},friendPill:{paddingHorizontal:6,paddingVertical:3,borderRadius:7,backgroundColor:colors.surface3},friendPillText:{color:colors.muted,fontSize:7,fontWeight:'900',letterSpacing:.5},
});
