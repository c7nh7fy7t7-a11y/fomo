import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FomoEvent, Person } from '@/data/seed';
import { categoryColor, categorySoft, colors } from '@/theme/colors';
import { AvatarStack } from './AvatarStack';

const iconForCategory = (category: string): keyof typeof Ionicons.glyphMap => {
  if (category === 'Study') return 'book-outline';
  if (category === 'Clubs') return 'people-outline';
  if (category === 'Sports & Rec') return 'football-outline';
  if (category === 'Campus Event') return 'school-outline';
  return 'sparkles-outline';
};

const eventPeople=(event:FomoEvent,people:Person[],friendIds:string[])=>{
  const attendees=event.attendeeIds.map((id)=>people.find((person)=>person.id===id)).filter(Boolean) as Person[];
  return attendees.filter((person)=>friendIds.includes(person.id));
};

function Cover({event}:{event:FomoEvent}){
  return event.cover?<Image source={{uri:event.cover}} style={StyleSheet.absoluteFillObject}/>:<View style={[StyleSheet.absoluteFillObject,styles.fallback,{backgroundColor:categorySoft(event.category)}]}><Ionicons name={iconForCategory(event.category)} color={categoryColor(event.category)} size={28}/></View>;
}

export function EventCard({event,people,friendIds,compact=false}:{event:FomoEvent;people:Person[];friendIds:string[];compact?:boolean}){
  const router=useRouter();
  const friends=eventPeople(event,people,friendIds);
  return <Pressable accessibilityRole="button" accessibilityLabel={event.title} onPress={()=>router.push(`/event/${event.id}`)} style={({pressed})=>[compact?styles.compact:styles.card,pressed&&styles.pressed]}>
    <View style={compact?styles.compactMedia:styles.cardMedia}><Cover event={event}/><View style={styles.mediaShade}/><View style={styles.dateBadge}><Text style={styles.dateText}>{event.dateLabel}</Text></View></View>
    <View style={styles.cardCopy}>
      <View style={styles.metaLine}><Text style={[styles.category,{color:categoryColor(event.category)}]}>{event.category.toUpperCase()}</Text><Text style={styles.time}>{event.time}</Text></View>
      <Text style={compact?styles.compactTitle:styles.title} numberOfLines={2}>{event.title}</Text>
      <View style={styles.locationLine}><Ionicons name="location-outline" color={colors.subtle} size={12}/><Text style={styles.location} numberOfLines={1}>{event.location}</Text></View>
      <View style={styles.socialLine}>{friends.length?<AvatarStack people={friends} size={22} max={3}/>:null}<Text style={[styles.socialText,friends.length?styles.socialOffset:null]} numberOfLines={1}>{friends.length?`${friends.length} friend${friends.length===1?'':'s'} going`:`${event.attendeeIds.length} going`}</Text></View>
    </View>
    {compact?<Ionicons name="chevron-forward" color={colors.subtle} size={16}/>:null}
  </Pressable>;
}

export function TonightEventCard({event,people,friendIds}:{event:FomoEvent;people:Person[];friendIds:string[]}){
  const router=useRouter();
  const friends=eventPeople(event,people,friendIds);
  return <Pressable accessibilityRole="button" accessibilityLabel={event.title} onPress={()=>router.push(`/event/${event.id}`)} style={({pressed})=>[styles.tonight,pressed&&styles.pressed]}>
    <Cover event={event}/><View style={styles.tonightShade}/>
    <View style={styles.tonightTop}><View style={styles.livePill}><View style={styles.liveDot}/><Text style={styles.liveText}>{event.time}</Text></View></View>
    <View style={styles.tonightBottom}><Text style={styles.tonightTitle} numberOfLines={2}>{event.title}</Text><Text style={styles.tonightLocation} numberOfLines={1}>{event.location}</Text><View style={styles.tonightSocial}>{friends.length?<AvatarStack people={friends} size={23} max={3}/>:null}<Text style={[styles.tonightGoing,friends.length?styles.socialOffset:null]}>{friends.length?`${friends.length} friends`:`${event.attendeeIds.length} going`}</Text></View></View>
  </Pressable>;
}

export function FeaturedEvent({event,people,friendIds,status='NEXT UP'}:{event:FomoEvent;people:Person[];friendIds:string[];status?:string}){
  const router=useRouter();
  const friends=eventPeople(event,people,friendIds);
  return <Pressable accessibilityRole="button" accessibilityLabel={event.title} onPress={()=>router.push(`/event/${event.id}`)} style={({pressed})=>[styles.featured,pressed&&styles.pressed]}>
    <Cover event={event}/><View style={styles.featuredShade}/>
    <View style={styles.featuredTop}><View style={styles.statusPill}><View style={[styles.statusDot,{backgroundColor:status==='HAPPENING NOW'?colors.success:colors.accent2}]}/><Text style={styles.statusText}>{status}</Text></View><Text style={styles.featuredTime}>{event.dateLabel} · {event.time}</Text></View>
    <View style={styles.featuredBottom}><Text style={styles.featuredKicker}>{event.category.toUpperCase()}</Text><Text style={styles.featuredTitle}>{event.title}</Text><View style={styles.featuredPlace}><Ionicons name="location" color={colors.white} size={13}/><Text style={styles.featuredLocation} numberOfLines={1}>{event.location}</Text></View><View style={styles.featuredSocial}>{friends.length?<AvatarStack people={friends} size={30} max={4}/>:null}<Text style={[styles.featuredSocialText,friends.length?styles.socialOffset:null]}>{friends.length?`${friends[0].name.split(' ')[0]}${friends.length>1?` + ${friends.length-1}`:''} going`:`${event.attendeeIds.length} people going`}</Text><View style={styles.openButton}><Text style={styles.openText}>See event</Text><Ionicons name="arrow-forward" color={colors.black} size={13}/></View></View></View>
  </Pressable>;
}

const styles=StyleSheet.create({
  pressed:{opacity:.86,transform:[{scale:.988}]},fallback:{alignItems:'center',justifyContent:'center'},mediaShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.10)'},
  card:{width:'100%',backgroundColor:colors.surface,marginBottom:12,overflow:'hidden',borderRadius:22},cardMedia:{height:154,backgroundColor:colors.surface2},compact:{minHeight:108,flexDirection:'row',alignItems:'center',paddingVertical:9,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},compactMedia:{width:92,height:92,borderRadius:16,overflow:'hidden',backgroundColor:colors.surface2},dateBadge:{position:'absolute',left:9,top:9,borderRadius:10,backgroundColor:'rgba(6,8,12,.78)',paddingHorizontal:8,paddingVertical:5},dateText:{color:colors.white,fontSize:8,fontWeight:'900',letterSpacing:.4},
  cardCopy:{flex:1,minWidth:0,padding:12},metaLine:{flexDirection:'row',alignItems:'center',gap:7},category:{fontSize:8,fontWeight:'900',letterSpacing:.8},time:{color:colors.muted,fontSize:9.5,fontWeight:'700'},title:{color:colors.text,fontSize:18,lineHeight:21,fontWeight:'900',letterSpacing:-.45,marginTop:5},compactTitle:{color:colors.text,fontSize:15.5,lineHeight:18,fontWeight:'900',letterSpacing:-.3,marginTop:4},locationLine:{flexDirection:'row',alignItems:'center',gap:3,marginTop:5},location:{flex:1,color:colors.muted,fontSize:10},socialLine:{flexDirection:'row',alignItems:'center',marginTop:10},socialOffset:{marginLeft:7},socialText:{color:colors.muted,fontSize:9.5,fontWeight:'700'},
  tonight:{width:224,height:258,borderRadius:24,overflow:'hidden',marginRight:12,backgroundColor:colors.surface2},tonightShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(3,5,9,.34)'},tonightTop:{position:'absolute',left:11,top:11},livePill:{height:27,borderRadius:14,paddingHorizontal:9,backgroundColor:'rgba(5,7,10,.75)',flexDirection:'row',alignItems:'center',gap:6},liveDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.success},liveText:{color:colors.white,fontSize:9,fontWeight:'900'},tonightBottom:{position:'absolute',left:14,right:14,bottom:13},tonightTitle:{color:colors.white,fontSize:21,lineHeight:23,fontWeight:'900',letterSpacing:-.65},tonightLocation:{color:'rgba(255,255,255,.8)',fontSize:10.5,fontWeight:'700',marginTop:5},tonightSocial:{flexDirection:'row',alignItems:'center',marginTop:9},tonightGoing:{color:colors.white,fontSize:9.5,fontWeight:'800'},
  featured:{height:382,borderRadius:28,overflow:'hidden',backgroundColor:colors.surface2},featuredShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(3,5,9,.34)'},featuredTop:{position:'absolute',left:14,right:14,top:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},statusPill:{height:29,borderRadius:15,paddingHorizontal:10,backgroundColor:'rgba(5,7,10,.78)',flexDirection:'row',alignItems:'center',gap:6},statusDot:{width:6,height:6,borderRadius:3},statusText:{color:colors.white,fontSize:8,fontWeight:'900',letterSpacing:.65},featuredTime:{color:colors.white,fontSize:9.5,fontWeight:'900',textShadowColor:'#000',textShadowRadius:8},featuredBottom:{position:'absolute',left:18,right:18,bottom:17},featuredKicker:{color:colors.accent2,fontSize:8.5,fontWeight:'900',letterSpacing:1.1},featuredTitle:{color:colors.white,fontSize:33,lineHeight:35,fontWeight:'900',letterSpacing:-1.25,marginTop:4},featuredPlace:{flexDirection:'row',alignItems:'center',gap:4,marginTop:9},featuredLocation:{flex:1,color:colors.white,fontSize:11.5,fontWeight:'700'},featuredSocial:{flexDirection:'row',alignItems:'center',marginTop:14},featuredSocialText:{color:colors.white,fontSize:10,fontWeight:'800'},openButton:{marginLeft:'auto',height:32,borderRadius:16,backgroundColor:colors.white,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:5},openText:{color:colors.black,fontSize:9,fontWeight:'900'},
});
