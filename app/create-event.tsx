import { useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { MapPressEvent, Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Privacy } from '@/data/seed';
import { categoryColor, colors } from '@/theme/colors';
import { friendlyErrorMessage } from '@/utils/errors';
import { PressableScale } from '@/components/PressableScale';

const categories=['Social','Study','Clubs','Sports & Rec','Campus Event','Other'];
const DEFAULT_PIN={latitude:52.1290,longitude:-106.6334};
const privacyOptions:{value:Privacy;title:string;desc:string;icon:keyof typeof Ionicons.glyphMap}[]=[
  {value:'Public',title:'Open',desc:'Anyone on your campus can join and see the pin.',icon:'earth-outline'},
  {value:'Request',title:'Request to join',desc:'People see the area. You approve who gets the exact pin.',icon:'hand-left-outline'},
  {value:'Private',title:'Invite only',desc:'Only invited people get the exact pin.',icon:'lock-closed-outline'},
];
const startOfToday=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const prettyDate=(date:Date)=>date.toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric',year:date.getFullYear()!==new Date().getFullYear()?'numeric':undefined});

export default function CreateScreen(){
  const router=useRouter();
  const {addEvent}=useApp();
  const today=useMemo(startOfToday,[]); const maxDate=useMemo(()=>{const d=new Date(today);d.setFullYear(d.getFullYear()+1);return d;},[today]);
  const [title,setTitle]=useState(''); const [category,setCategory]=useState('Social'); const [eventDate,setEventDate]=useState(today); const [showAndroidDate,setShowAndroidDate]=useState(false);
  const [time,setTime]=useState('9:00 PM'); const [location,setLocation]=useState('College Quarter'); const [exactLocation,setExactLocation]=useState('');
  const [description,setDescription]=useState(''); const [privacy,setPrivacy]=useState<Privacy>('Request'); const [cover,setCover]=useState<string>();
  const [pin,setPin]=useState(DEFAULT_PIN); const [publishing,setPublishing]=useState(false);

  const pickCover=async()=>{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[4,3],quality:.82});if(!result.canceled&&result.assets[0]?.uri)setCover(result.assets[0].uri);};
  const movePin=(event:MapPressEvent)=>setPin(event.nativeEvent.coordinate);
  const publish=async()=>{
    if(!title.trim()){Alert.alert('What are you doing?','Give the event a name.');return;}
    if(!location.trim()){Alert.alert('Where is it?','Add a public location or area.');return;}
    setPublishing(true);
    try{
      const event=await addEvent({title,category,eventDate:dateKey(eventDate),time,location,exactLocation:exactLocation||location,description,privacy,cover,latitude:pin.latitude,longitude:pin.longitude});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
      setTitle('');setCategory('Social');setEventDate(today);setTime('9:00 PM');setLocation('College Quarter');setExactLocation('');setDescription('');setPrivacy('Request');setCover(undefined);setPin(DEFAULT_PIN);
      router.replace({pathname:'/(tabs)',params:{view:'feed',posted:event.id}} as any);
    }catch(error:any){Alert.alert('Couldn’t post your event',friendlyErrorMessage(error,'Try again in a moment.'));}
    finally{setPublishing(false);}
  };

  return(
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.head}><Text style={styles.title}>Create something</Text><Text style={styles.sub}>Put a real thing on campus.</Text></View>

          <Section label="WHAT ARE YOU DOING?">
            <TextInput value={title} onChangeText={setTitle} placeholder="Party, study sprint, pickup…" placeholderTextColor={colors.subtle} style={styles.heroInput} maxLength={70}/>
          </Section>

          <Section label="WHAT KIND OF THING IS IT?">
            <View style={styles.categoryWrap}>{categories.map((item)=>{
              const active=category===item;return <PressableScale key={item} haptic="selection" onPress={()=>setCategory(item)} style={[styles.category,active&&styles.categoryActive]}><View style={[styles.categoryDot,{backgroundColor:categoryColor(item)}]}/><Text style={[styles.categoryText,active&&styles.categoryTextActive]}>{item}</Text></PressableScale>;
            })}</View>
          </Section>

          <Section label="WHEN?">
            {Platform.OS==='ios'?<View style={styles.dateField}><View style={styles.dateCopy}><Ionicons name="calendar-outline" color={colors.accent2} size={18}/><View><Text style={styles.dateTitle}>Event date</Text><Text style={styles.dateValue}>{prettyDate(eventDate)}</Text></View></View><DateTimePicker value={eventDate} mode="date" display="compact" minimumDate={today} maximumDate={maxDate} accentColor={colors.accent2} onChange={(_,selected)=>selected&&setEventDate(selected)}/></View>:
              <Pressable onPress={()=>setShowAndroidDate(true)} style={styles.dateField}><View style={styles.dateCopy}><Ionicons name="calendar-outline" color={colors.accent2} size={18}/><View><Text style={styles.dateTitle}>Event date</Text><Text style={styles.dateValue}>{prettyDate(eventDate)}</Text></View></View><Ionicons name="chevron-forward" color={colors.subtle} size={17}/></Pressable>}
            {Platform.OS==='android'&&showAndroidDate?<DateTimePicker value={eventDate} mode="date" minimumDate={today} maximumDate={maxDate} onChange={(_,selected)=>{setShowAndroidDate(false);if(selected)setEventDate(selected);}}/>:null}
            <TextInput value={time} onChangeText={setTime} placeholder="9:00 PM" placeholderTextColor={colors.subtle} style={styles.input}/>
          </Section>

          <Section label="WHERE IS IT?">
            <TextInput value={location} onChangeText={setLocation} placeholder="Public area — College Quarter" placeholderTextColor={colors.subtle} style={styles.input}/>
            <TextInput value={exactLocation} onChangeText={setExactLocation} placeholder="Exact address / unit / room (optional label)" placeholderTextColor={colors.subtle} style={styles.input}/>
            <View style={styles.mapShell}>
              <MapView style={StyleSheet.absoluteFillObject} initialRegion={{...pin,latitudeDelta:.012,longitudeDelta:.012}} onPress={movePin} userInterfaceStyle="dark">
                <Marker coordinate={pin} draggable onDragEnd={(e)=>setPin(e.nativeEvent.coordinate)}><View style={styles.pin}><View style={styles.pinCore}/></View></Marker>
              </MapView>
              <View style={styles.mapHint}><Ionicons name="hand-left-outline" color={colors.white} size={14}/><Text style={styles.mapHintText}>Tap or drag the pin</Text></View>
            </View>
            <View style={styles.coords}><Text style={styles.coordsText}>{pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</Text><Text style={styles.coordsRight}>{privacy==='Public'?'EXACT PIN PUBLIC':'EXACT PIN PROTECTED'}</Text></View>
          </Section>

          <Section label="WHO CAN COME?">
            {privacyOptions.map((item)=>{const active=privacy===item.value;return <PressableScale key={item.value} haptic="selection" onPress={()=>setPrivacy(item.value)} style={[styles.privacy,active&&styles.privacyActive]}>
              <View style={styles.privacyIcon}><Ionicons name={item.icon} color={active?colors.accent2:colors.muted} size={18}/></View>
              <View style={{flex:1}}><Text style={[styles.privacyTitle,active&&styles.privacyTitleActive]}>{item.title}</Text><Text style={[styles.privacyDesc,active&&styles.privacyDescActive]}>{item.desc}</Text></View>
              {active?<Ionicons name="checkmark-circle" color={colors.accent2} size={21}/>:<View style={styles.radio}/>}</PressableScale>;})}
          </Section>

          <Section label="GIVE PEOPLE THE VIBE">
            <Pressable onPress={pickCover} style={styles.cover}>
              {cover?<Image source={{uri:cover}} style={StyleSheet.absoluteFillObject}/>:<><Ionicons name="image-outline" color={colors.muted} size={25}/><Text style={styles.coverText}>Add cover photo</Text></>}
              {cover?<View style={styles.coverChange}><Text style={styles.coverChangeText}>Change</Text></View>:null}
            </Pressable>
            <TextInput value={description} onChangeText={setDescription} placeholder="What should people know?" placeholderTextColor={colors.subtle} multiline style={styles.description}/>
          </Section>

          <PressableScale haptic="medium" onPress={publish} disabled={publishing||!title.trim()} style={[styles.publish,(publishing||!title.trim())&&styles.disabled]}>
            <Text style={styles.publishText}>{publishing?'Posting…':'Put it on fomo'}</Text><Ionicons name="arrow-forward" color={colors.white} size={19}/>
          </PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function Section({label,children}:{label:string;children:React.ReactNode}){return <View style={styles.section}><Text style={styles.label}>{label}</Text>{children}</View>;}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},content:{paddingHorizontal:16,paddingBottom:42},head:{paddingTop:16,paddingBottom:20},
  title:{color:colors.text,fontSize:31,fontWeight:'900',letterSpacing:-1},sub:{color:colors.muted,fontSize:12,marginTop:4},
  section:{marginBottom:25},label:{color:colors.muted,fontSize:9,fontWeight:'900',letterSpacing:1.1,marginBottom:10},
  heroInput:{minHeight:56,color:colors.text,fontSize:21,fontWeight:'800',backgroundColor:colors.surface,borderRadius:19,paddingHorizontal:15,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  categoryWrap:{flexDirection:'row',flexWrap:'wrap',gap:8},category:{height:38,borderRadius:19,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:colors.surface2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  categoryActive:{backgroundColor:colors.accentSoft,borderColor:'rgba(255,107,87,.42)'},categoryDot:{width:7,height:7,borderRadius:4},categoryText:{color:colors.muted,fontSize:11,fontWeight:'700'},categoryTextActive:{color:colors.text,fontWeight:'900'},
  dateField:{minHeight:58,borderRadius:18,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,marginBottom:9},dateCopy:{flexDirection:'row',alignItems:'center',gap:10},dateTitle:{color:colors.subtle,fontSize:9,fontWeight:'800',letterSpacing:.4},dateValue:{color:colors.text,fontSize:12.5,fontWeight:'800',marginTop:2},
  input:{height:48,borderRadius:16,backgroundColor:colors.surface,color:colors.text,paddingHorizontal:14,fontSize:13,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,marginBottom:9},
  mapShell:{height:270,borderRadius:24,overflow:'hidden',backgroundColor:colors.surface2,marginTop:3},pin:{width:34,height:34,borderRadius:17,backgroundColor:colors.white,alignItems:'center',justifyContent:'center',borderWidth:4,borderColor:'rgba(5,5,5,.35)'},pinCore:{width:8,height:8,borderRadius:4,backgroundColor:colors.black},
  mapHint:{position:'absolute',left:12,bottom:12,height:32,borderRadius:16,backgroundColor:'rgba(5,5,5,.82)',paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:6},mapHintText:{color:colors.white,fontSize:10,fontWeight:'800'},
  coords:{flexDirection:'row',justifyContent:'space-between',paddingTop:8},coordsText:{color:colors.subtle,fontSize:9},coordsRight:{color:colors.muted,fontSize:8.5,fontWeight:'900',letterSpacing:.6},
  privacy:{minHeight:72,borderRadius:20,backgroundColor:colors.surface,padding:12,flexDirection:'row',alignItems:'center',gap:11,marginBottom:8,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  privacyActive:{backgroundColor:colors.accentSoft,borderColor:'rgba(255,107,87,.38)'},privacyIcon:{width:38,height:38,borderRadius:19,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},
  privacyTitle:{color:colors.text,fontSize:13,fontWeight:'800'},privacyTitleActive:{color:colors.text},privacyDesc:{color:colors.muted,fontSize:10,lineHeight:14,marginTop:2},privacyDescActive:{color:colors.muted},radio:{width:20,height:20,borderRadius:10,borderWidth:1,borderColor:colors.line},
  cover:{height:180,borderRadius:22,overflow:'hidden',backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',gap:7,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},coverText:{color:colors.muted,fontSize:11,fontWeight:'700'},
  coverChange:{position:'absolute',right:11,bottom:11,backgroundColor:'rgba(5,5,5,.8)',paddingHorizontal:11,paddingVertical:7,borderRadius:14},coverChangeText:{color:colors.white,fontSize:9,fontWeight:'800'},
  description:{minHeight:100,borderRadius:18,backgroundColor:colors.surface,color:colors.text,padding:14,fontSize:13,lineHeight:19,textAlignVertical:'top',marginTop:10,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
  publish:{height:56,borderRadius:28,backgroundColor:colors.accent,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:4},publishText:{color:colors.white,fontSize:13,fontWeight:'900'},disabled:{opacity:.35},
});
