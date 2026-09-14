import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EventCard } from '@/components/EventCard';
import { useApp } from '@/context/AppContext';
import type { FomoEvent } from '@/data/seed';
import { colors } from '@/theme/colors';

const filters=['All','Friends','Public'] as const;
type Filter=(typeof filters)[number];

function isUpcoming(event:FomoEvent){
  const parts=event.eventDate.split('-').map(Number);
  if(parts.length!==3||parts.some((part)=>!Number.isFinite(part)))return true;
  const [year,month,day]=parts;
  return Date.now()<new Date(year,month-1,day+1).getTime();
}

export default function WebDiscoverScreen(){
  const {events,people,friendIds,refreshAll,syncing,syncError}=useApp();
  const [filter,setFilter]=useState<Filter>('All');
  const visible=useMemo(()=>events
    .filter(isUpcoming)
    .filter((event)=>filter==='All'||filter==='Public'&&event.privacy==='Public'||filter==='Friends'&&event.attendeeIds.some((id)=>friendIds.includes(id)))
    .sort((a,b)=>a.eventDate.localeCompare(b.eventDate)||a.time.localeCompare(b.time)),[events,filter,friendIds]);

  return <SafeAreaView style={styles.safe} edges={[]}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshAll} tintColor={colors.accent2}/>}>
      <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.kicker}>EXPLORE CAMPUS</Text><Text style={styles.title}>Discover</Text><Text style={styles.subtitle}>Find the plans and people worth showing up for.</Text></View><View style={styles.icon}><Ionicons name="compass-outline" color={colors.accent2} size={26}/></View></View>
      {syncError?<View style={styles.error}><Ionicons name="cloud-offline-outline" color={colors.warning} size={17}/><Text style={styles.errorText}>{syncError}</Text></View>:null}
      <View style={styles.mapPreview}><View style={styles.mapIcon}><Ionicons name="map-outline" color={colors.accent2} size={24}/></View><View style={styles.mapCopy}><Text style={styles.mapTitle}>Campus map for web is next</Text><Text style={styles.mapBody}>Browse the live event list now. Private events show only their approximate area until you’re approved.</Text></View><View style={styles.safeBadge}><Ionicons name="shield-checkmark-outline" color={colors.success} size={15}/><Text style={styles.safeText}>Location safe</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityRole="tablist">
        {filters.map((item)=><Pressable key={item} accessibilityRole="tab" accessibilityState={{selected:filter===item}} onPress={()=>setFilter(item)} style={({pressed,hovered}:any)=>[styles.filter,filter===item&&styles.filterActive,hovered&&filter!==item&&styles.filterHover,pressed&&styles.pressed]}><Text style={[styles.filterText,filter===item&&styles.filterTextActive]}>{item}</Text></Pressable>)}
      </ScrollView>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Happening soon</Text><View style={styles.count}><Text style={styles.countText}>{visible.length}</Text></View></View>
      {visible.length?visible.map((event)=><EventCard key={event.id} event={event} people={people} friendIds={friendIds}/>):<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="compass-outline" color={colors.accent2} size={27}/></View><Text style={styles.emptyTitle}>Nothing in this view yet</Text><Text style={styles.emptyBody}>{filter==='All'?'New campus events will appear here as they’re added.':'Switch to All to see the rest of campus.'}</Text>{filter!=='All'?<Pressable onPress={()=>setFilter('All')} style={({pressed})=>[styles.emptyButton,pressed&&styles.pressed]}><Text style={styles.emptyButtonText}>Show all events</Text></Pressable>:null}</View>}
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},content:{paddingHorizontal:18,paddingTop:32,paddingBottom:120},header:{flexDirection:'row',alignItems:'center',gap:16},headerCopy:{flex:1,minWidth:0},kicker:{color:colors.accent2,fontSize:11,fontWeight:'900',letterSpacing:1.2},title:{color:colors.text,fontSize:34,lineHeight:40,fontWeight:'900',letterSpacing:-1.05,marginTop:4},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginTop:4},icon:{width:52,height:52,borderRadius:21,alignItems:'center',justifyContent:'center',backgroundColor:colors.accentSoft,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(139,150,255,.25)'},
  error:{minHeight:48,marginTop:18,borderRadius:18,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:9,backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},errorText:{flex:1,color:colors.warning,fontSize:13,lineHeight:19},
  mapPreview:{minHeight:116,borderRadius:26,marginTop:24,padding:17,flexDirection:'row',alignItems:'center',gap:13,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},mapIcon:{width:50,height:50,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:colors.accentSoft},mapCopy:{flex:1,minWidth:0},mapTitle:{color:colors.text,fontSize:16,fontWeight:'900'},mapBody:{color:colors.muted,fontSize:13,lineHeight:19,marginTop:5},safeBadge:{minHeight:34,borderRadius:16,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(120,215,167,.09)',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(120,215,167,.2)'},safeText:{color:colors.success,fontSize:11,fontWeight:'800'},
  filters:{gap:8,paddingVertical:22,paddingRight:12},filter:{minHeight:44,borderRadius:20,paddingHorizontal:19,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},filterActive:{backgroundColor:colors.accentSoft,borderColor:'rgba(139,150,255,.32)'},filterHover:{backgroundColor:colors.surface2},filterText:{color:colors.muted,fontSize:14,fontWeight:'700'},filterTextActive:{color:colors.accent2,fontWeight:'900'},
  sectionHead:{minHeight:44,flexDirection:'row',alignItems:'center',gap:9,marginBottom:12},sectionTitle:{color:colors.text,fontSize:20,fontWeight:'900'},count:{minWidth:28,height:28,borderRadius:14,paddingHorizontal:8,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface2},countText:{color:colors.muted,fontSize:12,fontWeight:'800'},
  empty:{padding:34,borderRadius:28,alignItems:'center',backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},emptyIcon:{width:58,height:58,borderRadius:23,alignItems:'center',justifyContent:'center',backgroundColor:colors.accentSoft},emptyTitle:{color:colors.text,fontSize:20,fontWeight:'900',marginTop:16},emptyBody:{color:colors.muted,fontSize:14,lineHeight:21,textAlign:'center',marginTop:7},emptyButton:{minHeight:44,borderRadius:19,paddingHorizontal:17,alignItems:'center',justifyContent:'center',backgroundColor:colors.accent,marginTop:17},emptyButtonText:{color:colors.white,fontSize:14,fontWeight:'900'},pressed:{opacity:.74,transform:[{scale:.985}]},
});
