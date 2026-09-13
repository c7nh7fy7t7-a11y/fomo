import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WeeklyRotationCard } from '@/components/WeeklyRotationCard';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';
import { dateKeyInTimeZone, isoDayForDateKey, orderedWeekdays, selectNextWeeklyOccurrences, SASKATOON_TIME_ZONE, WEEKDAY_NAMES } from '@/utils/weeklyRotation';

export default function WeeklyRotationScreen(){
  const router=useRouter();
  const {events,refreshAll,syncing,syncError}=useApp();
  const weeklyEvents=useMemo(()=>selectNextWeeklyOccurrences(events),[events]);
  const dayOrder=useMemo(()=>orderedWeekdays(),[]);
  const today=useMemo(()=>isoDayForDateKey(dateKeyInTimeZone(new Date(),SASKATOON_TIME_ZONE)),[]);
  const byDay=useMemo(()=>{
    const result=new Map<number,typeof weeklyEvents>();
    for(const event of weeklyEvents){
      const day=event.recurrence?.dayOfWeek;
      if(!day)continue;
      result.set(day,[...(result.get(day)??[]),event]);
    }
    for(const [day,items] of result)result.set(day,[...items].sort((a,b)=>a.time.localeCompare(b.time)||a.title.localeCompare(b.title)));
    return result;
  },[weeklyEvents]);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={()=>router.back()} style={({pressed})=>[styles.headerButton,pressed&&styles.pressed]}><Ionicons name="arrow-back" color={colors.text} size={21}/></Pressable>
      <View style={styles.headerCopy}><Text style={styles.eyebrow}>DISCOVER</Text><Text style={styles.title}>Weekly Rotation</Text></View>
      <View style={styles.headerButton}/>
    </View>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshAll} tintColor={colors.accent2}/>}
    >
      <View style={styles.intro}>
        <View style={styles.introIcon}><Ionicons name="repeat" color={colors.accent2} size={22}/></View>
        <Text style={styles.introTitle}>The week, on repeat.</Text>
        <Text style={styles.introBody}>Reliable campus and Saskatoon staples, shown as the next specific date you can join.</Text>
      </View>
      {syncError?<View style={styles.error}><Ionicons name="cloud-offline-outline" color={colors.warning} size={16}/><Text style={styles.errorText}>{syncError}</Text></View>:null}
      {!weeklyEvents.length?<View style={styles.emptyAll}><Ionicons name="calendar-clear-outline" color={colors.accent2} size={28}/><Text style={styles.emptyAllTitle}>Nothing on rotation yet.</Text><Text style={styles.emptyAllBody}>Verified weekly events will show up here as soon as they’re available.</Text></View>:dayOrder.map((day)=>{
        const items=byDay.get(day)??[];
        const isToday=day===today;
        return <View key={day} style={styles.daySection}>
          <View style={styles.dayHeader}><Text style={[styles.dayName,isToday&&styles.dayNameToday]}>{WEEKDAY_NAMES[day-1].toUpperCase()}</Text>{isToday?<View style={styles.todayPill}><Text style={styles.todayText}>TODAY</Text></View>:null}<View style={styles.dayLine}/></View>
          {items.length?items.map((event)=><WeeklyRotationCard key={event.recurrence?.seriesId??event.id} event={event} layout="row"/>):<View style={styles.emptyDay}><View style={styles.emptyDot}/><Text style={styles.emptyDayText}>Nothing scheduled yet.</Text></View>}
        </View>;
      })}
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},header:{height:58,paddingHorizontal:12,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},headerButton:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},headerCopy:{flex:1,alignItems:'center'},eyebrow:{color:colors.accent2,fontSize:8,fontWeight:'900',letterSpacing:1.2},title:{color:colors.text,fontSize:18,fontWeight:'900',letterSpacing:-.25,marginTop:2},pressed:{opacity:.68,transform:[{scale:.96}]},
  content:{paddingHorizontal:16,paddingBottom:80},intro:{padding:18,borderRadius:26,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,marginTop:14},introIcon:{width:44,height:44,borderRadius:20,backgroundColor:colors.accentSoft,alignItems:'center',justifyContent:'center'},introTitle:{color:colors.text,fontSize:23,fontWeight:'900',letterSpacing:-.6,marginTop:14},introBody:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:6,maxWidth:330},
  error:{flexDirection:'row',alignItems:'center',gap:7,backgroundColor:colors.surface2,borderRadius:16,padding:12,marginTop:12,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},errorText:{color:colors.warning,fontSize:10.5,flex:1},
  daySection:{marginTop:27},dayHeader:{height:30,flexDirection:'row',alignItems:'center',gap:8,marginBottom:10,paddingHorizontal:2},dayName:{color:colors.muted,fontSize:10,fontWeight:'900',letterSpacing:1.25},dayNameToday:{color:colors.text},todayPill:{height:20,borderRadius:10,backgroundColor:colors.accentSoft,paddingHorizontal:7,alignItems:'center',justifyContent:'center'},todayText:{color:colors.accent2,fontSize:7.5,fontWeight:'900',letterSpacing:.7},dayLine:{flex:1,height:StyleSheet.hairlineWidth,backgroundColor:colors.line},
  emptyDay:{height:58,borderRadius:18,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,flexDirection:'row',alignItems:'center',paddingHorizontal:15,gap:9},emptyDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.surface3},emptyDayText:{color:colors.subtle,fontSize:10.5,fontWeight:'700'},
  emptyAll:{alignItems:'center',paddingHorizontal:26,paddingVertical:72},emptyAllTitle:{color:colors.text,fontSize:18,fontWeight:'900',marginTop:12},emptyAllBody:{color:colors.muted,fontSize:11.5,lineHeight:17,textAlign:'center',marginTop:6},
});
