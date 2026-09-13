import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import type { FomoEvent } from '@/data/seed';
import { categoryColor, categorySoft, colors } from '@/theme/colors';
import { AvatarStack } from '@/components/AvatarStack';
import { GlassSurface } from '@/components/GlassSurface';
import { eventLocationForViewer } from '@/utils/eventLocation';
import { dateKeyInTimeZone, daysFromDateKey, selectNextWeeklyOccurrences, SASKATOON_TIME_ZONE } from '@/utils/weeklyRotation';

const iconFor=(category:string):keyof typeof Ionicons.glyphMap=>category==='Study'?'book':category==='Clubs'?'people':category==='Sports & Rec'?'football':category==='Campus Event'?'school':'sparkles';
const mapFilters=[
  {id:'All',label:'All',icon:'layers-outline' as const},
  {id:'Friends',label:'Friends',icon:'people-outline' as const},
  {id:'Public',label:'Public',icon:'globe-outline' as const},
];
type MapFilter=(typeof mapFilters)[number]['id'];

type TrayState='collapsed'|'partial'|'expanded';
export default function MapScreen(){
  const router=useRouter(); const insets=useSafeAreaInsets(); const {height}=useWindowDimensions();
  const {currentUser,events,people,friendIds}=useApp();
  const [filter,setFilter]=useState<MapFilter>('All');
  const [selected,setSelected]=useState<FomoEvent|undefined>(events[0]);
  const [tray,setTray]=useState<TrayState>('partial');
  const mapEvents=useMemo(()=>{
    const nextWeeklyIds=new Set(selectNextWeeklyOccurrences(events).map((event)=>event.id));
    return events.filter((event)=>{
      if(!event.recurrence)return true;
      const timeZone=event.recurrence.timezone??SASKATOON_TIME_ZONE;
      const delta=daysFromDateKey(event.eventDate,dateKeyInTimeZone(new Date(),timeZone));
      return nextWeeklyIds.has(event.id)&&delta>=0&&delta<=21;
    });
  },[events]);
  const visible=useMemo(()=>filter==='Friends'?mapEvents.filter((e)=>e.attendeeIds.some((id)=>friendIds.includes(id))):filter==='Public'?mapEvents.filter((e)=>e.privacy==='Public'):mapEvents,[mapEvents,filter,friendIds]);
  const locationFor=(event:FomoEvent)=>eventLocationForViewer(event,currentUser?.id);
  const trayHeight=tray==='collapsed'?88:tray==='partial'?Math.min(300,height*.38):Math.min(530,height*.66);
  const bottomNavClearance=88+Math.max(insets.bottom,8);
  const cycleTray=()=>{setTray((cur)=>cur==='collapsed'?'partial':cur==='partial'?'expanded':'collapsed');Haptics.selectionAsync().catch(()=>{});};
  const filterSummary=filter==='Friends'?'Friends are going':filter==='Public'?'Open to everyone':'All visible events';

  useEffect(()=>{
    if(selected&&visible.some((event)=>event.id===selected.id))return;
    setSelected(visible[0]);
  },[selected,visible]);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.head}><Text style={styles.title}>Map</Text><Text style={styles.sub}>Find events around campus.</Text></View>
    <View style={styles.filters} accessibilityRole="tablist">{mapFilters.map((item)=><Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={`Show ${item.label.toLowerCase()} events`} accessibilityState={{selected:filter===item.id}} onPress={()=>{setFilter(item.id);setTray('partial');Haptics.selectionAsync().catch(()=>{});}} style={({pressed})=>[styles.filter,filter===item.id&&styles.filterActive,pressed&&styles.pressed]}><Ionicons name={item.icon} color={filter===item.id?colors.white:colors.muted} size={15}/><Text style={[styles.filterText,filter===item.id&&styles.filterTextActive]}>{item.label}</Text></Pressable>)}</View>
    <View style={[styles.mapWrap,{marginBottom:bottomNavClearance}]}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={{latitude:52.129,longitude:-106.633,latitudeDelta:.035,longitudeDelta:.035}} userInterfaceStyle="dark">
        {visible.map((event)=>{const active=selected?.id===event.id;const location=locationFor(event);return <Marker key={event.id} coordinate={{latitude:location.latitude,longitude:location.longitude}} onPress={()=>{setSelected(event);setTray('partial');}}><View style={[styles.marker,active&&styles.markerActive,{borderColor:categoryColor(event.category),backgroundColor:active?categoryColor(event.category):colors.surface2}]}><Ionicons name={iconFor(event.category)} color={active?colors.white:categoryColor(event.category)} size={14}/></View></Marker>;})}
      </MapView>
      <View style={styles.legend}><Ionicons name="shield-checkmark-outline" color={colors.accent2} size={14}/><Text style={styles.legendText}>Private pins stay approximate until you’re approved.</Text></View>

      <GlassSurface strong intensity={72} style={[styles.tray,{height:trayHeight}]}>
        <Pressable onPress={cycleTray} style={styles.trayHead}>
          <View style={styles.grabber}/>
          <View style={styles.trayHeadRow}>
            <View style={styles.trayHeading}><Text style={styles.trayKicker}>ON THE MAP</Text><Text style={styles.trayTitle}>Events nearby</Text><Text style={styles.traySubtitle}>{visible.length} showing · {filterSummary}</Text></View>
            <View style={styles.trayControl}><Text style={styles.trayControlText}>{tray==='expanded'?'Collapse':tray==='collapsed'?'Show':'Expand'}</Text><Ionicons name={tray==='expanded'?'chevron-down':'chevron-up'} color={colors.text} size={16}/></View>
          </View>
        </Pressable>
        {tray!=='collapsed'?<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {visible.length?visible.map((event)=>{
            const active=selected?.id===event.id; const location=locationFor(event); const attendees=event.attendeeIds.map((id)=>people.find((p)=>p.id===id)).filter(Boolean) as typeof people; const friends=attendees.filter((p)=>friendIds.includes(p.id));
            const pinLabel=event.privacy==='Public'?'Public pin':location.showsExactCoordinates?'Exact pin':'Approx. area'; const pinIcon=event.privacy==='Public'?'globe-outline':location.showsExactCoordinates?'navigate-outline':'lock-closed-outline';
            return <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`Select ${event.title} on map`} onPress={()=>{setSelected(event);Haptics.selectionAsync().catch(()=>{});}} onLongPress={()=>router.push(`/event/${event.id}`)} style={[styles.eventRow,active&&styles.eventRowActive]}>
              {event.cover?<Image source={{uri:event.cover}} style={styles.thumb}/>:<View style={[styles.thumb,styles.thumbFallback,{backgroundColor:categorySoft(event.category)}]}><Ionicons name={iconFor(event.category)} color={categoryColor(event.category)} size={22}/></View>}
              <View style={styles.copy}><View style={styles.metaLine}><Text style={[styles.category,{color:categoryColor(event.category)}]}>{event.category.toUpperCase()}</Text><Text style={styles.meta}> · {event.dateLabel} · {event.time}</Text></View><Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text><View style={styles.locationLine}><Ionicons name={pinIcon} color={location.showsExactCoordinates?colors.accent2:colors.subtle} size={12}/><Text style={styles.location} numberOfLines={1}><Text style={styles.pinLabel}>{pinLabel} · </Text>{location.label}</Text></View><View style={styles.social}>{friends.length?<AvatarStack people={friends} size={21} max={3}/>:null}<Text style={[styles.socialText,friends.length?{marginLeft:6}:null]}>{friends.length?`${friends.length} friends going`:`${event.attendeeIds.length} going`}</Text></View></View>
              <Pressable accessibilityRole="button" accessibilityLabel={`View ${event.title} details`} onPress={()=>router.push(`/event/${event.id}`)} style={({pressed})=>[styles.open,pressed&&styles.pressed]}><Text style={styles.openText}>View</Text><Ionicons name="chevron-forward" color={colors.white} size={14}/></Pressable>
            </Pressable>;
          }):<View style={styles.empty}><Ionicons name="map-outline" color={colors.accent2} size={25}/><Text style={styles.emptyTitle}>No {filter.toLowerCase()} events here.</Text><Text style={styles.emptyText}>Try another filter to see what else is happening.</Text></View>}
        </ScrollView>:null}
      </GlassSurface>
    </View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},head:{paddingHorizontal:16,paddingTop:10,paddingBottom:8},title:{color:colors.text,fontSize:30,fontWeight:'900',letterSpacing:-.9},sub:{color:colors.muted,fontSize:11.5,marginTop:2},filters:{height:52,flexDirection:'row',gap:6,marginHorizontal:12,marginBottom:10,padding:4,borderRadius:24,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},filter:{flex:1,minHeight:44,borderRadius:20,flexDirection:'row',gap:6,alignItems:'center',justifyContent:'center'},filterActive:{backgroundColor:colors.accent,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.accent2},filterText:{color:colors.muted,fontSize:11.5,fontWeight:'800'},filterTextActive:{color:colors.white,fontWeight:'900'},pressed:{opacity:.72,transform:[{scale:.98}]},mapWrap:{flex:1,marginHorizontal:10,borderRadius:28,overflow:'hidden',backgroundColor:colors.surface2},marker:{width:36,height:36,borderRadius:18,borderWidth:2,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.28,shadowRadius:7,shadowOffset:{width:0,height:3}},markerActive:{transform:[{scale:1.10}]},legend:{position:'absolute',left:12,right:12,top:12,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'rgba(17,18,21,.90)',borderRadius:16,paddingHorizontal:11,paddingVertical:8,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.10)'},legendText:{color:colors.text,fontSize:9.5,fontWeight:'700',flex:1},tray:{position:'absolute',left:9,right:9,bottom:9,borderRadius:25,backgroundColor:'rgba(18,21,24,.82)',overflow:'hidden',shadowColor:'#000',shadowOpacity:.30,shadowRadius:18,shadowOffset:{width:0,height:8}},trayHead:{height:88,paddingHorizontal:15,paddingTop:15,justifyContent:'center'},grabber:{position:'absolute',top:8,alignSelf:'center',width:38,height:4,borderRadius:2,backgroundColor:colors.subtle},trayHeadRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},trayHeading:{flex:1,minWidth:0},trayKicker:{color:colors.accent2,fontSize:8.5,fontWeight:'900',letterSpacing:1.1},trayTitle:{color:colors.text,fontSize:17,fontWeight:'900',marginTop:2},traySubtitle:{color:colors.muted,fontSize:9.5,fontWeight:'700',marginTop:3},trayControl:{minWidth:78,height:38,borderRadius:19,backgroundColor:colors.surface3,flexDirection:'row',gap:4,alignItems:'center',justifyContent:'center',paddingHorizontal:11,marginLeft:10},trayControlText:{color:colors.text,fontSize:9.5,fontWeight:'900'},listContent:{paddingHorizontal:9,paddingBottom:20},eventRow:{minHeight:112,borderRadius:20,padding:8,flexDirection:'row',alignItems:'center',marginBottom:8,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},eventRowActive:{borderColor:colors.accent2,backgroundColor:colors.surface2},thumb:{width:78,height:96,borderRadius:16,backgroundColor:colors.surface2},thumbFallback:{alignItems:'center',justifyContent:'center'},copy:{flex:1,minWidth:0,marginLeft:10},metaLine:{flexDirection:'row',alignItems:'center'},category:{fontSize:8,fontWeight:'900'},meta:{color:colors.subtle,fontSize:8.5,fontWeight:'700'},eventTitle:{color:colors.text,fontSize:14,fontWeight:'900',marginTop:3},locationLine:{flexDirection:'row',alignItems:'center',gap:4,marginTop:5},location:{color:colors.muted,fontSize:9.5,flex:1},pinLabel:{color:colors.text,fontWeight:'800'},social:{flexDirection:'row',alignItems:'center',marginTop:7},socialText:{color:colors.muted,fontSize:9.5,fontWeight:'700'},open:{minWidth:58,height:44,borderRadius:22,backgroundColor:colors.accent,flexDirection:'row',gap:1,alignItems:'center',justifyContent:'center',paddingHorizontal:9,marginLeft:7},openText:{color:colors.white,fontSize:9.5,fontWeight:'900'},empty:{alignItems:'center',paddingVertical:28},emptyTitle:{color:colors.text,fontSize:14,fontWeight:'900',marginTop:8},emptyText:{color:colors.muted,fontSize:10.5,marginTop:3},
});
