import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { FeedPostCard } from '@/components/FeedPostCard';
import { CommentsModal } from '@/components/CommentsModal';
import { colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { showReportSheet } from '@/utils/reporting';
import { ReactionKind } from '@/data/seed';
import { backendConfigured, supabase } from '@/lib/supabase';

export default function PostDetail(){
  const router=useRouter();
  const {id}=useLocalSearchParams<{id:string}>();
  const {posts,people,events,currentUser,reactToPost,addComment,removeComment,markPostViewed,removeMyTag,removePost,report,refreshFeed,demoMode}=useApp();
  const [comments,setComments]=useState(false);
  const post=posts.find((item)=>item.id===id);
  useEffect(()=>{
    if(!id||demoMode||!backendConfigured||!supabase)return;
    const channel=supabase.channel(`post-live-${id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'feed_comments',filter:`post_id=eq.${id}`},()=>refreshFeed())
      .on('postgres_changes',{event:'*',schema:'public',table:'feed_reactions',filter:`post_id=eq.${id}`},()=>refreshFeed())
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[id,demoMode,refreshFeed]);

  if(!post)return <SafeAreaView style={styles.safe}><View style={styles.head}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" color={colors.text} size={22}/></Pressable></View></SafeAreaView>;

  const react=async(reaction?:ReactionKind)=>{try{await reactToPost(post.id,reaction);}catch(error:any){Alert.alert('Couldn’t react',friendlyErrorMessage(error,'Try again.'));}};
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.head}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" color={colors.text} size={22}/></Pressable></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FeedPostCard post={post} people={people} events={events} currentUserId={currentUser.id} onReact={react} onComments={()=>setComments(true)} onViewed={()=>markPostViewed(post.id)} onRemoveTag={()=>removeMyTag(post.id)} onDelete={()=>Alert.alert('Delete post?','This removes the post for everyone.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{await removePost(post.id);router.back();}}])} onReport={()=>showReportSheet({type:'post',id:post.id},report)}/>
    </ScrollView>
    <CommentsModal visible={comments} post={post} people={people} currentUserId={currentUser.id} onClose={()=>setComments(false)} onSend={(body)=>addComment(post.id,body)} onDelete={removeComment}/>
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},head:{height:50,paddingHorizontal:16,justifyContent:'center'},back:{width:38,height:38,borderRadius:19,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},content:{paddingBottom:30}});
