import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { FomoEvent } from '@/data/seed';
import { categoryColor, categorySoft, colors } from '@/theme/colors';
import { AvatarStack } from '@/components/AvatarStack';
import { GlassSurface } from '@/components/GlassSurface';

const iconFor=(category:string):keyof typeof Ionicons.glyphMap=>category==='Study'?'book':category==='Clubs'?'people':category==='Sports & Rec'?'football':category==='Campus Event'?'school':'sparkles';

type TrayState='collapsed'|'partial'|'expanded';
export default function MapScreen(){
  const router=useRouter(); const insets=useSafeAreaInsets(); const {height}=useWindowDimensions();
  const {events,people,friendIds}=useApp();
  const [filter,setFilter]=useState<'All'|'Friends'|'Open'>('All');
  const [selected,setSelected]=useState<FomoEvent|undefined>(events[0]);
  const [tray,setTray]=useState<TrayState>('partial');
  const visible=useMemo(()=>filter==='Friends'?events.filter((e)=>e.attendeeIds.some((id)=>friendIds.includes(id))):filter==='Open'?events.filter((e)=>e.privacy==='Public'):events,[events,filter,friendIds]);
  const coord=(event:FomoEvent)=>({latitude:event.exactLatitude??event.latitude,longitude:event.exactLongitude??event.longitude});
  const trayHeight=tray==='collapsed'?72:tray==='partial'?Math.min(232,height*.30):Math.min(460,height*.56);
  const bottomNavClearance=88+Math.max(insets.bottom,8);
  const cycleTray=()=>{setTray((cur)=>cur==='collapsed'?'partial':cur==='partial'?'expanded':'collapsed');Haptics.selectionAsync().catch(()=>{});};

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.head}><View><Text style={styles.title}>Map</Text><Text style={styles.sub}>See where campus is moving.</Text></View><View style={styles.filters}>{(['All','Friends','Open'] as const).map((item)=><Pressable key={item} onPress={()=>{setFilter(item);Haptics.selectionAsync().catch(()=>{});}} style={[styles.filter,filter===item&&styles.filterActive]}><Text style={[styles.filterText,filter===item&&styles.filterTextActive]}>{item}</Text></Pressable>)}</View></View>
    <View style={[styles.mapWrap,{marginBottom:bottomNavClearance}]}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={{latitude:52.129,longitude:-106.633,latitudeDelta:.035,longitudeDelta:.035}} userInterfaceStyle="dark">
        {visible.map((event)=>{const active=selected?.id===event.id;return <Marker key={event.id} coordinate={coord(event)} onPress={()=>{setSelected(event);setTray('partial');}}><View style={[styles.marker,active&&styles.markerActive,{borderColor:categoryColor(event.category),backgroundColor:active?categoryColor(event.category):colors.surface2}]}><Ionicons name={iconFor(event.category)} color={active?colors.white:categoryColor(event.category)} size={14}/></View></Marker>;})}
      </MapView>
      <View style={styles.legend}><View style={styles.legendDot}/><Text style={styles.legendText}>Protected events only reveal exact pins after access.</Text></View>

      <GlassSurface strong intensity={72} style={[styles.tray,{height:trayHeight}]}>
        <Pressable onPress={cycleTray} style={styles.trayHead}>
          <View><Text style={styles.trayKicker}>NEARBY NOW</Text><Text style={styles.trayTitle}>{visible.length} {visible.length===1?'event':'events'} around you</Text></View>
          <View style={styles.trayControl}><Ionicons name={tray==='expanded'?'chevron-down':tray==='collapsed'?'chevron-up':'swap-vertical'} color={colors.text} size={18}/></View>
        </Pressable>
        {tray!=='collapsed'?<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {visible.length?visible.map((event)=>{
            const active=selected?.id===event.id; const attendees=event.attendeeIds.map((id)=>people.find((p)=>p.id===id)).filter(Boolean) as typeof people; const friends=attendees.filter((p)=>friendIds.includes(p.id));
            return <Pressable key={event.id} onPress={()=>{setSelected(event);Haptics.selectionAsync().catch(()=>{});}} onLongPress={()=>router.push(`/event/${event.id}`)} style={[styles.eventRow,active&&styles.eventRowActive]}>
              {event.cover?<Image source={{uri:event.cover}} style={styles.thumb}/>:<View style={[styles.thumb,styles.thumbFallback,{backgroundColor:categorySoft(event.category)}]}><Ionicons name={iconFor(event.category)} color={categoryColor(event.category)} size={22}/></View>}
              <View style={styles.copy}><View style={styles.metaLine}><Text style={[styles.category,{color:categoryColor(event.category)}]}>{event.category.toUpperCase()}</Text><Text style={styles.meta}> · {event.dateLabel} · {event.time}</Text></View><Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text><View style={styles.locationLine}><Ionicons name="location-outline" color={colors.subtle} size={11}/><Text style={styles.location} numberOfLines={1}>{event.exactLocation??event.location}</Text></View><View style={styles.social}>{friends.length?<AvatarStack people={friends} size={21} max={3}/>:null}<Text style={[styles.socialText,friends.length?{marginLeft:6}:null]}>{friends.length?`${friends.length} friends going`:`${event.attendeeIds.length} going`}</Text></View></View>
              <Pressable onPress={()=>router.push(`/event/${event.id}`)} style={styles.open}><Ionicons name="arrow-forward" color={colors.white} size={15}/></Pressable>
            </Pressable>;
          }):<View style={styles.empty}><Ionicons name="map-outline" color={colors.accent2} size={25}/><Text style={styles.emptyTitle}>Nothing nearby yet.</Text><Text style={styles.emptyText}>Try another filter or put something on the map.</Text></View>}
        </ScrollView>:null}
      </GlassSurface>
    </View>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},head:{paddingHorizontal:16,paddingTop:12,paddingBottom:11,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},title:{color:colors.text,fontSize:30,fontWeight:'900',letterSpacing:-.9},sub:{color:colors.muted,fontSize:11,marginTop:2},filters:{flexDirection:'row',gap:7,marginLeft:10},filter:{height:32,borderRadius:16,paddingHorizontal:11,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},filterActive:{backgroundColor:colors.accent,borderColor:colors.accent2},filterText:{color:colors.muted,fontSize:10,fontWeight:'700'},filterTextActive:{color:colors.white,fontWeight:'900'},mapWrap:{flex:1,marginHorizontal:10,marginTop:2,borderRadius:28,overflow:'hidden',backgroundColor:colors.surface2},marker:{width:36,height:36,borderRadius:18,borderWidth:2,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.28,shadowRadius:7,shadowOffset:{width:0,height:3}},markerActive:{transform:[{scale:1.10}]},legend:{position:'absolute',left:12,top:12,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'rgba(17,18,21,.88)',borderRadius:16,paddingHorizontal:10,paddingVertical:7,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.10)'},legendDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.accent2},legendText:{color:colors.text,fontSize:8.5,fontWeight:'700'},tray:{position:'absolute',left:9,right:9,bottom:9,borderRadius:25,backgroundColor:'rgba(18,21,24,.70)',overflow:'hidden',shadowColor:'#000',shadowOpacity:.30,shadowRadius:18,shadowOffset:{width:0,height:8}},trayHead:{height:70,paddingHorizontal:15,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},trayKicker:{color:colors.accent2,fontSize:8,fontWeight:'900',letterSpacing:1.1},trayTitle:{color:colors.text,fontSize:15,fontWeight:'900',marginTop:3},trayControl:{width:36,height:36,borderRadius:18,backgroundColor:colors.surface3,alignItems:'center',justifyContent:'center'},listContent:{paddingHorizontal:9,paddingBottom:20},eventRow:{minHeight:108,borderRadius:20,padding:8,flexDirection:'row',alignItems:'center',marginBottom:8,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},eventRowActive:{borderColor:colors.accent2,backgroundColor:colors.surface2},thumb:{width:82,height:92,borderRadius:16,backgroundColor:colors.surface2},thumbFallback:{alignItems:'center',justifyContent:'center'},copy:{flex:1,minWidth:0,marginLeft:10},metaLine:{flexDirection:'row',alignItems:'center'},category:{fontSize:8,fontWeight:'900'},meta:{color:colors.subtle,fontSize:8.5,fontWeight:'700'},eventTitle:{color:colors.text,fontSize:14,fontWeight:'900',marginTop:3},locationLine:{flexDirection:'row',alignItems:'center',gap:3,marginTop:4},location:{color:colors.muted,fontSize:9.5,flex:1},social:{flexDirection:'row',alignItems:'center',marginTop:7},socialText:{color:colors.muted,fontSize:9.5,fontWeight:'700'},open:{width:35,height:35,borderRadius:18,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',marginLeft:7},empty:{alignItems:'center',paddingVertical:28},emptyTitle:{color:colors.text,fontSize:14,fontWeight:'900',marginTop:8},emptyText:{color:colors.muted,fontSize:10.5,marginTop:3},
});
