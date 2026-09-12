import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { FeedPostCard } from '@/components/FeedPostCard';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { showReportSheet } from '@/utils/reporting';
import { ReactionKind } from '@/data/seed';
import { backendConfigured, supabase } from '@/lib/supabase';

export default function PostDetail(){
  const router=useRouter();
  const scrollRef=useRef<ScrollView>(null);
  const {id}=useLocalSearchParams<{id:string}>();
  const {posts,people,events,currentUser,reactToPost,addComment,removeComment,markPostViewed,removeMyTag,removePost,report,refreshFeed,demoMode}=useApp();
  const [commentsExpanded,setCommentsExpanded]=useState(false);
  const post=posts.find((item)=>item.id===id);
  useEffect(()=>{
    if(!id||demoMode||!backendConfigured||!supabase)return;
    const client=supabase;
    const channel=client.channel(`post-live-${id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'feed_comments',filter:`post_id=eq.${id}`},()=>refreshFeed())
      .on('postgres_changes',{event:'*',schema:'public',table:'feed_reactions',filter:`post_id=eq.${id}`},()=>refreshFeed())
      .subscribe();
    return()=>{client.removeChannel(channel);};
  },[id,demoMode,refreshFeed]);

  if(!post)return <SafeAreaView style={styles.safe}><View style={styles.head}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" color={colors.text} size={22}/></Pressable></View></SafeAreaView>;

  const react=async(reaction?:ReactionKind)=>{try{await reactToPost(post.id,reaction);}catch(error:any){Alert.alert('Couldn’t react',friendlyErrorMessage(error,'Try again.'));}};
  const comment=async(body:string)=>{try{await addComment(post.id,body);}catch(error:any){Alert.alert('Couldn’t comment',friendlyErrorMessage(error,'Try again.'));throw error;}};
  const deleteComment=async(commentId:string)=>{try{await removeComment(commentId);}catch(error:any){Alert.alert('Couldn’t delete comment',friendlyErrorMessage(error,'Try again.'));throw error;}};
  const keepCommentVisible=(target:number)=>{setTimeout(()=>{const responder=(scrollRef.current as any)?.getScrollResponder?.();responder?.scrollResponderScrollNativeHandleToKeyboard?.(target,112,true);},120);};
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.head}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" color={colors.text} size={22}/></Pressable></View>
    <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets={Platform.OS==='ios'} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'} contentContainerStyle={styles.content}>
      <FeedPostCard post={post} people={people} events={events} currentUserId={currentUser.id} commentsExpanded={commentsExpanded} onReact={react} onToggleComments={()=>setCommentsExpanded((expanded)=>!expanded)} onAddComment={comment} onDeleteComment={deleteComment} onCommentInputFocus={keepCommentVisible} onViewed={()=>markPostViewed(post.id)} onRemoveTag={()=>removeMyTag(post.id)} onDelete={()=>Alert.alert('Delete post?','This removes the post for everyone.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{await removePost(post.id);router.back();}}])} onReport={()=>showReportSheet({type:'post',id:post.id},report)}/>
    </ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},head:{height:50,paddingHorizontal:16,justifyContent:'center'},back:{width:38,height:38,borderRadius:19,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},content:{paddingBottom:30}});
