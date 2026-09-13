import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const router=useRouter(); const insets=useSafeAreaInsets();
  const mapRef=useRef<MapView>(null);
  const listRef=useRef<ScrollView>(null);
  const rowOffsets=useRef<Record<string,number>>({});
  const {currentUser,events,people,friendIds}=useApp();
  const [filter,setFilter]=useState<MapFilter>('All');
  const [selectedId,setSelectedId]=useState<string>();
  const [tray,setTray]=useState<TrayState>('partial');
  const [mapHeight,setMapHeight]=useState(0);
  const [reduceMotion,setReduceMotion]=useState(true);
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
  const selected=visible.find((event)=>event.id===selectedId)??visible[0];
  const locationFor=(event:FomoEvent)=>eventLocationForViewer(event,currentUser?.id);
  const maxTrayHeight=Math.max(76,mapHeight-116);
  const partialTrayHeight=Math.max(76,Math.min(286,mapHeight*.58));
  const trayHeight=tray==='collapsed'?76:Math.min(tray==='partial'?partialTrayHeight:530,maxTrayHeight);
  const bottomNavClearance=88+Math.max(insets.bottom,8);
  const filterSummary=filter==='Friends'?'Friends are going':filter==='Public'?'Public events':'All visible events';
  const changeTray=(next:TrayState)=>{setTray(next);Haptics.selectionAsync().catch(()=>{});};
  const revealSelected=()=>{
    const offset=selected?rowOffsets.current[selected.id]:undefined;
    if(offset!==undefined)listRef.current?.scrollTo({y:offset,animated:false});
  };
  const selectOnMap=(event:FomoEvent)=>{
    setSelectedId(event.id);
    const location=locationFor(event);
    mapRef.current?.animateCamera({center:{latitude:location.latitude,longitude:location.longitude}},{duration:reduceMotion?0:240});
    Haptics.selectionAsync().catch(()=>{});
  };

  useEffect(()=>{
    let mounted=true;
    const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);
    AccessibilityInfo.isReduceMotionEnabled().then((enabled)=>{if(mounted)setReduceMotion(enabled);}).catch(()=>{});
    return()=>{mounted=false;subscription.remove();};
  },[]);
  useEffect(()=>{revealSelected();},[selected?.id,tray]);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.head}>
      <View style={styles.headingCopy}><Text style={styles.title}>Explore nearby</Text><Text style={styles.sub}>Pick a pin. Find your plans.</Text></View>
      <View style={styles.mapBadge}><Ionicons name="map-outline" color={colors.accent2} size={23}/></View>
    </View>
    <View style={styles.filters} accessibilityRole="tablist">{mapFilters.map((item)=><Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={`Show ${item.label.toLowerCase()} events`} accessibilityState={{selected:filter===item.id}} onPress={()=>{setFilter(item.id);setSelectedId(undefined);setTray('partial');Haptics.selectionAsync().catch(()=>{});}} style={({pressed})=>[styles.filter,filter===item.id&&styles.filterActive,pressed&&styles.pressed]}><Ionicons name={item.icon} color={filter===item.id?colors.accent2:colors.muted} size={16}/><Text style={[styles.filterText,filter===item.id&&styles.filterTextActive]}>{item.label}</Text></Pressable>)}</View>
    <View onLayout={(event)=>setMapHeight(event.nativeEvent.layout.height)} style={[styles.mapWrap,{marginBottom:bottomNavClearance}]}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={{latitude:52.129,longitude:-106.633,latitudeDelta:.035,longitudeDelta:.035}} mapPadding={{top:54,right:12,bottom:trayHeight+18,left:12}} userInterfaceStyle="dark">
        {visible.map((event)=>{const active=selected?.id===event.id;const location=locationFor(event);return <Marker key={event.id} zIndex={active?2:1} accessibilityLabel={event.title} coordinate={{latitude:location.latitude,longitude:location.longitude}} onPress={()=>{setSelectedId(event.id);setTray('partial');Haptics.selectionAsync().catch(()=>{});}}><View style={[styles.marker,active&&styles.markerActive]}><Ionicons name={iconFor(event.category)} color={active?colors.bg:colors.accent2} size={active?20:17}/></View></Marker>;})}
      </MapView>
      <View pointerEvents="none" style={styles.legend}><Ionicons name="shield-checkmark-outline" color={colors.accent2} size={15}/><Text style={styles.legendText}>Private events show an area until you have access.</Text></View>

      <GlassSurface strong intensity={72} style={[styles.tray,{height:trayHeight}]}>
        <View style={styles.trayHead}>
          <View style={styles.trayHeading}>
            <Text style={styles.trayTitle}>{visible.length} event{visible.length===1?'':'s'}</Text>
            <Text style={styles.traySubtitle} numberOfLines={1}>{filterSummary}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={tray==='expanded'?'Show more map':tray==='collapsed'?'Show event list':'Expand event list'} accessibilityState={{expanded:tray==='expanded'}} onPress={()=>changeTray(tray==='partial'?'expanded':'partial')} style={({pressed})=>[styles.trayControl,pressed&&styles.pressed]}>
            <Text style={styles.trayControlText}>{tray==='expanded'?'Show map':tray==='collapsed'?'Show list':'Expand'}</Text>
            <Ionicons name={tray==='expanded'?'chevron-down':'chevron-up'} color={colors.accent2} size={15}/>
          </Pressable>
          {tray!=='collapsed'?<Pressable accessibilityRole="button" accessibilityLabel="Hide event list" onPress={()=>changeTray('collapsed')} style={({pressed})=>[styles.hideControl,pressed&&styles.pressed]}><Ionicons name="close" color={colors.muted} size={19}/></Pressable>:null}
        </View>
        {tray!=='collapsed'?<ScrollView ref={listRef} style={styles.list} onContentSizeChange={revealSelected} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {visible.length?visible.map((event)=>{
            const active=selected?.id===event.id; const location=locationFor(event); const attendees=event.attendeeIds.map((id)=>people.find((p)=>p.id===id)).filter(Boolean) as typeof people; const friends=attendees.filter((p)=>friendIds.includes(p.id));
            const pinLabel=location.showsExactCoordinates?'Exact pin':location.canSeeExact&&location.label!==event.location?'Event address':event.privacy==='Public'?'Public event':'Approximate area';
            const pinIcon=location.showsExactCoordinates?'navigate-outline':event.privacy==='Public'?'globe-outline':'lock-closed-outline';
            return <View key={event.id} onLayout={(layout)=>{rowOffsets.current[event.id]=layout.nativeEvent.layout.y;}} style={[styles.eventRow,active&&styles.eventRowActive]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Select ${event.title} on map`} accessibilityState={{selected:active}} accessibilityHint="Centers the map on this event’s available location" onPress={()=>selectOnMap(event)} onLongPress={()=>router.push(`/event/${event.id}`)} style={({pressed})=>[styles.eventMain,pressed&&styles.pressed]}>
                {event.cover?<Image source={{uri:event.cover}} resizeMode="cover" style={styles.thumb}/>:<View style={[styles.thumb,styles.thumbFallback,{backgroundColor:categorySoft(event.category)}]}><Ionicons name={iconFor(event.category)} color={categoryColor(event.category)} size={24}/></View>}
                <View style={styles.copy}>
                  <View style={styles.metaLine}><Text style={styles.category} numberOfLines={1}>{event.category}</Text><View style={styles.selectionHint}><Ionicons name={active?'checkmark-circle':'locate-outline'} color={active?colors.accent2:colors.muted} size={13}/><Text style={[styles.selectionText,active&&styles.selectionTextActive]}>{active?'Selected':'Locate'}</Text></View></View>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  <Text style={styles.meta}>{event.dateLabel} · {event.time}</Text>
                </View>
              </Pressable>
              <View style={styles.locationLine}><Ionicons name={pinIcon} color={colors.accent2} size={13}/><View style={styles.locationCopy}><Text style={styles.location} numberOfLines={1}>{location.label}</Text><Text style={styles.pinLabel}>{pinLabel}</Text></View></View>
              <View style={styles.eventFooter}>
                <View style={styles.social}>{friends.length?<AvatarStack people={friends} size={22} max={2}/>:null}<Text style={styles.socialText} numberOfLines={1}>{friends.length?`${friends.length} friend${friends.length===1?'':'s'} going`:`${event.attendeeIds.length} going`}</Text></View>
                <Pressable accessibilityRole="button" accessibilityLabel={`View ${event.title} details`} onPress={()=>router.push(`/event/${event.id}`)} style={({pressed})=>[styles.open,pressed&&styles.pressed]}><Text style={styles.openText}>Details</Text><Ionicons name="arrow-forward" color={colors.accent2} size={15}/></Pressable>
              </View>
            </View>;
          }):<View style={styles.empty}><Ionicons name="map-outline" color={colors.accent2} size={27}/><Text style={styles.emptyTitle}>{filter==='Friends'?'No plans with friends yet':filter==='Public'?'No public events here yet':'No events here yet'}</Text><Text style={styles.emptyText}>{filter==='All'?'Events will appear here as they’re added.':'Switch to All to browse the other events.'}</Text>{filter!=='All'?<Pressable accessibilityRole="button" onPress={()=>{setFilter('All');setSelectedId(undefined);Haptics.selectionAsync().catch(()=>{});}} style={({pressed})=>[styles.emptyAction,pressed&&styles.pressed]}><Text style={styles.openText}>Show all events</Text><Ionicons name="arrow-forward" color={colors.accent2} size={15}/></Pressable>:null}</View>}
        </ScrollView>:null}
      </GlassSurface>
    </View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},
  head:{paddingHorizontal:18,paddingTop:10,paddingBottom:16,flexDirection:'row',alignItems:'center',gap:12},
  headingCopy:{flex:1},title:{color:colors.text,fontSize:27,fontWeight:'900',letterSpacing:-.7},sub:{color:colors.muted,fontSize:13,marginTop:4},
  mapBadge:{width:46,height:46,borderRadius:19,backgroundColor:colors.accentSoft,alignItems:'center',justifyContent:'center'},
  filters:{flexDirection:'row',gap:6,marginHorizontal:16,marginBottom:14,padding:4,borderRadius:24,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  filter:{flex:1,minHeight:44,borderRadius:20,flexDirection:'row',gap:6,alignItems:'center',justifyContent:'center'},
  filterActive:{backgroundColor:colors.accentSoft,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(139,150,255,.35)'},
  filterText:{color:colors.muted,fontSize:12,fontWeight:'700'},filterTextActive:{color:colors.text,fontWeight:'800'},pressed:{opacity:.72},
  mapWrap:{flex:1,marginHorizontal:10,borderRadius:28,overflow:'hidden',backgroundColor:colors.surface2},
  marker:{width:44,height:44,borderRadius:22,borderWidth:2,borderColor:colors.accent2,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.3,shadowRadius:6,shadowOffset:{width:0,height:3}},
  markerActive:{borderColor:colors.text,backgroundColor:colors.accent2},
  legend:{position:'absolute',left:12,right:12,top:12,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'rgba(17,18,21,.94)',borderRadius:15,paddingHorizontal:11,paddingVertical:9,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  legendText:{color:colors.muted,fontSize:11,lineHeight:15,flex:1},
  tray:{position:'absolute',left:8,right:8,bottom:8,borderRadius:24,backgroundColor:'rgba(18,21,24,.92)',overflow:'hidden'},
  trayHead:{height:76,flexShrink:0,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:4},
  trayHeading:{flex:1,minWidth:0},trayTitle:{color:colors.text,fontSize:18,fontWeight:'800',letterSpacing:-.3},traySubtitle:{color:colors.muted,fontSize:11,marginTop:4},
  trayControl:{minHeight:44,borderRadius:18,backgroundColor:colors.accentSoft,flexDirection:'row',gap:4,alignItems:'center',justifyContent:'center',paddingHorizontal:10},
  trayControlText:{color:colors.accent2,fontSize:11,fontWeight:'800'},hideControl:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:18},
  list:{flex:1},listContent:{paddingHorizontal:8,paddingBottom:12},
  eventRow:{borderRadius:20,marginBottom:10,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,overflow:'hidden'},
  eventRowActive:{borderColor:colors.accent2,backgroundColor:colors.surface2},
  eventMain:{padding:12,paddingBottom:8,flexDirection:'row',alignItems:'center'},
  thumb:{width:58,height:66,borderRadius:14,backgroundColor:colors.surface2},thumbFallback:{alignItems:'center',justifyContent:'center'},
  copy:{flex:1,minWidth:0,marginLeft:11},metaLine:{flexDirection:'row',alignItems:'center',gap:5},
  category:{flex:1,color:colors.muted,fontSize:10,fontWeight:'700'},selectionHint:{flexDirection:'row',alignItems:'center',gap:3},selectionText:{color:colors.muted,fontSize:10,fontWeight:'700'},selectionTextActive:{color:colors.accent2},
  eventTitle:{color:colors.text,fontSize:16,lineHeight:20,fontWeight:'800',letterSpacing:-.2,marginTop:5},meta:{color:colors.muted,fontSize:11,lineHeight:16,marginTop:5},
  locationLine:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingBottom:8},locationCopy:{flex:1,minWidth:0},location:{color:colors.text,fontSize:12,lineHeight:17},pinLabel:{color:colors.muted,fontSize:10,lineHeight:14,marginTop:1},
  eventFooter:{flexDirection:'row',alignItems:'center',gap:8,paddingLeft:12,paddingRight:6,paddingBottom:4},
  social:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:6},socialText:{flexShrink:1,color:colors.muted,fontSize:11,fontWeight:'600'},
  open:{minHeight:44,minWidth:86,borderRadius:16,backgroundColor:colors.accentSoft,flexDirection:'row',gap:6,alignItems:'center',justifyContent:'center',paddingHorizontal:12},openText:{color:colors.accent2,fontSize:12,fontWeight:'800'},
  empty:{alignItems:'center',paddingHorizontal:16,paddingVertical:22},emptyTitle:{color:colors.text,fontSize:16,fontWeight:'800',marginTop:10,textAlign:'center'},emptyText:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:6,textAlign:'center'},emptyAction:{minHeight:44,borderRadius:18,backgroundColor:colors.accentSoft,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:7,marginTop:14},
});
