import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EventCard } from '@/components/EventCard';
import { useApp } from '@/context/AppContext';
import type { FomoEvent } from '@/data/seed';
import { colors } from '@/theme/colors';

const modes=['Upcoming','Going','Hosting','Past'] as const;
type Mode=(typeof modes)[number];

function dayEnd(event:FomoEvent){
  const parts=event.eventDate.split('-').map(Number);
  if(parts.length!==3||parts.some((part)=>!Number.isFinite(part)))return Number.POSITIVE_INFINITY;
  const [year,month,day]=parts;
  return new Date(year,month-1,day+1).getTime();
}

export default function EventsScreen(){
  const router=useRouter();
  const {currentUser,events,people,friendIds,refreshAll,syncing,syncError}=useApp();
  const [mode,setMode]=useState<Mode>('Upcoming');
  const visible=useMemo(()=>{
    const now=Date.now();
    const filtered=events.filter((event)=>{
      const upcoming=now<dayEnd(event);
      if(mode==='Upcoming')return upcoming;
      if(mode==='Past')return !upcoming;
      if(mode==='Going')return upcoming&&event.attendeeIds.includes(currentUser.id);
      return upcoming&&(event.hostId===currentUser.id||(event.cohostIds??[]).includes(currentUser.id));
    });
    return filtered.sort((a,b)=>mode==='Past'?dayEnd(b)-dayEnd(a):dayEnd(a)-dayEnd(b));
  },[currentUser.id,events,mode]);

  const emptyCopy=mode==='Upcoming'
    ? 'New campus events will appear here as they’re added.'
    : mode==='Going'
      ? 'Events you join will collect here.'
      : mode==='Hosting'
        ? 'Events you host or co-host will collect here.'
        : 'Finished events will collect here.';

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshAll} tintColor={colors.accent2}/> }>
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={styles.kicker}>PLANS & MOMENTS</Text><Text style={styles.title}>Events</Text><Text style={styles.subtitle}>Everything happening around your campus.</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Create event" onPress={()=>router.push('/create-event')} style={({pressed})=>[styles.create,pressed&&styles.pressed]}><Ionicons name="add" color={colors.white} size={24}/></Pressable>
      </View>
      {syncError?<View style={styles.error}><Ionicons name="cloud-offline-outline" color={colors.warning} size={17}/><Text style={styles.errorText}>{syncError}</Text></View>:null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modes} accessibilityRole="tablist">
        {modes.map((item)=><Pressable key={item} accessibilityRole="tab" accessibilityState={{selected:mode===item}} onPress={()=>setMode(item)} style={({pressed,hovered}:any)=>[styles.mode,mode===item&&styles.modeActive,hovered&&mode!==item&&styles.modeHover,pressed&&styles.pressed]}><Text style={[styles.modeText,mode===item&&styles.modeTextActive]}>{item}</Text></Pressable>)}
      </ScrollView>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{mode}</Text><View style={styles.count}><Text style={styles.countText}>{visible.length}</Text></View></View>
      {visible.length?<View>{visible.map((event)=><EventCard key={event.id} event={event} people={people} friendIds={friendIds}/>)}</View>:<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={mode==='Past'?'time-outline':'calendar-outline'} color={colors.accent2} size={29}/></View><Text style={styles.emptyTitle}>No {mode.toLowerCase()} events</Text><Text style={styles.emptyBody}>{emptyCopy}</Text>{mode==='Upcoming'||mode==='Hosting'?<Pressable onPress={()=>router.push('/create-event')} style={({pressed})=>[styles.emptyButton,pressed&&styles.pressed]}><Ionicons name="add" color={colors.white} size={18}/><Text style={styles.emptyButtonText}>Create an event</Text></Pressable>:null}</View>}
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},content:{paddingHorizontal:18,paddingTop:28,paddingBottom:120},
  header:{flexDirection:'row',alignItems:'center',gap:18},headerCopy:{flex:1,minWidth:0},kicker:{color:colors.accent2,fontSize:11,fontWeight:'900',letterSpacing:1.2},title:{color:colors.text,fontSize:34,lineHeight:40,fontWeight:'900',letterSpacing:-1.05,marginTop:4},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginTop:4},create:{width:48,height:48,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:colors.accent,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.2)'},
  error:{minHeight:48,marginTop:18,borderRadius:18,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:9,backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},errorText:{flex:1,color:colors.warning,fontSize:13,lineHeight:19},
  modes:{gap:8,paddingVertical:24,paddingRight:12},mode:{minHeight:44,borderRadius:20,paddingHorizontal:18,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},modeActive:{backgroundColor:colors.accentSoft,borderColor:'rgba(139,150,255,.32)'},modeHover:{backgroundColor:colors.surface2},modeText:{color:colors.muted,fontSize:14,fontWeight:'700'},modeTextActive:{color:colors.accent2,fontWeight:'900'},
  sectionHead:{minHeight:44,flexDirection:'row',alignItems:'center',gap:9,marginBottom:13},sectionTitle:{color:colors.text,fontSize:20,fontWeight:'900'},count:{minWidth:28,height:28,borderRadius:14,paddingHorizontal:8,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface2},countText:{color:colors.muted,fontSize:12,fontWeight:'800'},
  empty:{padding:34,borderRadius:28,alignItems:'center',backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},emptyIcon:{width:60,height:60,borderRadius:24,alignItems:'center',justifyContent:'center',backgroundColor:colors.accentSoft},emptyTitle:{color:colors.text,fontSize:20,fontWeight:'900',marginTop:16},emptyBody:{maxWidth:390,color:colors.muted,fontSize:14,lineHeight:21,textAlign:'center',marginTop:7},emptyButton:{minHeight:46,borderRadius:20,paddingHorizontal:17,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:colors.accent,marginTop:18},emptyButtonText:{color:colors.white,fontSize:14,fontWeight:'900'},pressed:{opacity:.74,transform:[{scale:.985}]},
});
