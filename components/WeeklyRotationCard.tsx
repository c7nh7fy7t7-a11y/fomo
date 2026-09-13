import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FomoEvent } from '@/data/seed';
import { categoryColor, categorySoft, colors } from '@/theme/colors';
import { relativeOccurrenceLabel, weeklyScheduleLabel, weeklyTimeLabel } from '@/utils/weeklyRotation';

export function WeeklyRotationCard({event,layout='carousel'}:{event:FomoEvent;layout?:'carousel'|'row'}){
  const router=useRouter();
  const recurrence=event.recurrence;
  const attendeeCopy=event.attendeeIds.length
    ? `${event.attendeeIds.length} going`
    : 'Be the first to go';
  const row=layout==='row';

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${event.title}, ${weeklyScheduleLabel(event)}, next on ${event.dateLabel}`}
    onPress={()=>router.push(`/event/${event.id}`)}
    style={({pressed})=>[styles.card,row&&styles.rowCard,pressed&&styles.pressed]}
  >
    <View style={[styles.visual,row&&styles.rowVisual,{backgroundColor:categorySoft(event.category)}]}>
      {event.cover?<Image source={{uri:event.cover}} style={StyleSheet.absoluteFill} resizeMode="cover"/>:<Ionicons name="calendar-outline" color={categoryColor(event.category)} size={row?25:29}/>}
      {event.cover?<View style={styles.imageShade}/>:null}
      <View style={styles.weeklyChip}><View style={styles.weeklyDot}/><Text style={styles.weeklyChipText}>WEEKLY</Text></View>
    </View>
    <View style={[styles.copy,row&&styles.rowCopy]}>
      {recurrence?.weeklyStaple?<Text style={styles.staple}>🔥 Weekly Staple</Text>:<Text style={styles.category}>{event.category.toUpperCase()}</Text>}
      <Text style={[styles.title,row&&styles.rowTitle]} numberOfLines={row?1:2}>{event.title}</Text>
      <Text style={styles.schedule} numberOfLines={1}>{weeklyScheduleLabel(event)} · {weeklyTimeLabel(event)}</Text>
      <View style={styles.locationRow}><Ionicons name="location-outline" color={colors.subtle} size={12}/><Text style={styles.location} numberOfLines={1}>{event.location}</Text></View>
      <View style={styles.footer}>
        <View style={styles.nextPill}><Text style={styles.nextText} numberOfLines={1}>{relativeOccurrenceLabel(event)} · {event.dateLabel}</Text></View>
        <Text style={styles.attendance} numberOfLines={1}>{attendeeCopy}</Text>
        <Ionicons name="chevron-forward" color={colors.subtle} size={15}/>
      </View>
    </View>
  </Pressable>;
}

const styles=StyleSheet.create({
  card:{width:252,minHeight:242,borderRadius:24,overflow:'hidden',backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  rowCard:{width:'100%',minHeight:132,flexDirection:'row',alignItems:'stretch',marginBottom:11},
  pressed:{opacity:.82,transform:[{scale:.985}]},
  visual:{height:82,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  rowVisual:{width:92,height:'auto'},
  imageShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(7,8,9,.24)'},
  weeklyChip:{position:'absolute',left:10,top:10,height:25,borderRadius:13,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(11,13,15,.84)',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.14)'},
  weeklyDot:{width:5,height:5,borderRadius:3,backgroundColor:colors.accent2},
  weeklyChipText:{color:colors.white,fontSize:8,fontWeight:'900',letterSpacing:.8},
  copy:{flex:1,minWidth:0,padding:13},rowCopy:{padding:12},
  staple:{color:colors.accent2,fontSize:9.5,fontWeight:'900'},category:{color:colors.accent2,fontSize:8.5,fontWeight:'900',letterSpacing:.8},
  title:{color:colors.text,fontSize:18,lineHeight:21,fontWeight:'900',letterSpacing:-.35,marginTop:4},rowTitle:{fontSize:16,lineHeight:20},
  schedule:{color:colors.text,fontSize:11,fontWeight:'800',marginTop:6},
  locationRow:{flexDirection:'row',alignItems:'center',gap:4,marginTop:5},location:{flex:1,color:colors.muted,fontSize:10.5},
  footer:{flexDirection:'row',alignItems:'center',marginTop:11,gap:7},
  nextPill:{maxWidth:136,height:26,borderRadius:13,paddingHorizontal:8,alignItems:'center',justifyContent:'center',backgroundColor:colors.accentSoft},nextText:{color:colors.accent2,fontSize:8.5,fontWeight:'900'},
  attendance:{flex:1,color:colors.muted,fontSize:9,fontWeight:'700'},
});
