import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { Skeleton } from '@/components/Skeleton';
import { CreatePostModal } from '@/components/CreatePostModal';
import { FeedMediaType } from '@/data/seed';

const inactiveIcons:Record<string,keyof typeof Ionicons.glyphMap>={index:'moon-outline',map:'map-outline',messages:'chatbubble-ellipses-outline',profile:'person-outline'};
const activeIcons:Record<string,keyof typeof Ionicons.glyphMap>={index:'moon',map:'map',messages:'chatbubble-ellipses',profile:'person'};

function TabIcon({route,focused,color,size}:{route:string;focused:boolean;color:ColorValue;size:number}){
  const scale=useRef(new Animated.Value(focused?1.06:1)).current;
  useEffect(()=>{Animated.spring(scale,{toValue:focused?1.07:1,useNativeDriver:true,friction:7,tension:220}).start();},[focused,scale]);
  if(route==='create') return <Animated.View style={[styles.create,{transform:[{scale}]}]}><View style={styles.createGlow}/><Ionicons name="add" color={colors.white} size={28}/></Animated.View>;
  return <Animated.View style={[styles.iconWrap,focused&&styles.iconWrapActive,{transform:[{scale}]}]}><Ionicons name={(focused?activeIcons[route]:inactiveIcons[route])??'ellipse-outline'} color={focused?colors.text:color} size={focused?size+1:size}/>{focused?<View style={styles.activeDot}/>:null}</Animated.View>;
}

const actions:{kind:'event'|'image'|'video';title:string;body:string;icon:keyof typeof Ionicons.glyphMap}[]=[
  {kind:'event',title:'Create an event',body:'Put something on tonight',icon:'calendar-outline'},
  {kind:'image',title:'Post a photo',body:'Share what is happening',icon:'camera-outline'},
  {kind:'video',title:'Post a video',body:'Capture the energy',icon:'videocam-outline'},
];

export default function TabLayout(){
  const router=useRouter();
  const {backendConfigured,demoMode,isAuthenticated,authLoading,events,people,currentUser,createPost}=useApp();
  const [actionOpen,setActionOpen]=useState(false);
  const [postKind,setPostKind]=useState<FeedMediaType>();
  const choose=(kind:'event'|'image'|'video')=>{
    setActionOpen(false);
    Haptics.selectionAsync().catch(()=>{});
    if(kind==='event') setTimeout(()=>router.push('/create-event'),120);
    else setTimeout(()=>setPostKind(kind),120);
  };
  if(authLoading)return <View style={styles.loading}><View style={styles.loadingBrand}/><Skeleton style={styles.loadingLine}/><Skeleton style={[styles.loadingLine,{width:112}]}/></View>;
  if(backendConfigured&&!demoMode&&!isAuthenticated)return <Redirect href="/"/>;
  return <>
    <Tabs
      screenListeners={{tabPress:()=>{Haptics.selectionAsync().catch(()=>{});}}}
      screenOptions={({route})=>({
        headerShown:false,tabBarShowLabel:true,tabBarHideOnKeyboard:true,
        tabBarActiveTintColor:colors.text,tabBarInactiveTintColor:colors.subtle,
        tabBarStyle:styles.bar,tabBarItemStyle:route.name==='create'?styles.createItem:styles.item,tabBarLabelStyle:styles.label,
        tabBarBackground:()=> <BlurView tint="systemUltraThinMaterialDark" intensity={78} style={[StyleSheet.absoluteFill,styles.barBlur]}/>,
        tabBarIcon:({color,size,focused})=><TabIcon route={route.name} focused={focused} color={color} size={size}/>,
      })}>
      <Tabs.Screen name="index" options={{title:'Tonight'}}/>
      <Tabs.Screen name="map" options={{title:'Map'}}/>
      <Tabs.Screen name="create" options={{title:'Create'}} listeners={{tabPress:(event)=>{event.preventDefault();setActionOpen(true);}}}/>
      <Tabs.Screen name="messages" options={{title:'Inbox'}}/>
      <Tabs.Screen name="profile" options={{title:'You'}}/>
      <Tabs.Screen name="friends" options={{href:null}}/>
    </Tabs>

    <Modal visible={actionOpen} transparent animationType="fade" onRequestClose={()=>setActionOpen(false)}>
      <View style={styles.modalHost}>
        <Pressable accessibilityLabel="Close create menu" style={StyleSheet.absoluteFill} onPress={()=>setActionOpen(false)}/>
        <SafeAreaView edges={['bottom']} style={styles.sheetSafe}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle}/>
            <View style={styles.sheetHead}><View><Text style={styles.sheetKicker}>MAKE TONIGHT HAPPEN</Text><Text style={styles.sheetTitle}>Create</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={()=>setActionOpen(false)} style={styles.close}><Ionicons name="close" color={colors.text} size={20}/></Pressable></View>
            {actions.map((action)=><Pressable key={action.kind} accessibilityRole="button" onPress={()=>choose(action.kind)} style={({pressed})=>[styles.action,pressed&&styles.pressed]}><View style={[styles.actionIcon,action.kind==='event'&&styles.actionIconPrimary]}><Ionicons name={action.icon} color={action.kind==='event'?colors.white:colors.text} size={22}/></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>{action.title}</Text><Text style={styles.actionBody}>{action.body}</Text></View><Ionicons name="arrow-forward" color={colors.subtle} size={18}/></Pressable>)}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
    <CreatePostModal visible={Boolean(postKind)} initialKind={postKind??'image'} events={events} people={people} currentUserId={currentUser.id} onClose={()=>setPostKind(undefined)} onPost={createPost}/>
  </>;
}
const styles=StyleSheet.create({
  loading:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center',gap:10},loadingBrand:{width:48,height:48,borderRadius:18,backgroundColor:colors.accentSoft,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,107,87,.22)'},loadingLine:{width:150,height:10,borderRadius:5},
  bar:{position:'absolute',left:10,right:10,bottom:8,height:76,borderRadius:28,overflow:'visible',backgroundColor:'rgba(10,13,18,.86)',borderTopWidth:0,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.14)',paddingTop:7,paddingBottom:8,elevation:14,shadowColor:'#000',shadowOpacity:.38,shadowRadius:22,shadowOffset:{width:0,height:10}},
  barBlur:{borderRadius:28,overflow:'hidden'},item:{paddingTop:0},createItem:{paddingTop:0,overflow:'visible'},label:{fontSize:9,fontWeight:'800',marginTop:1,letterSpacing:.1},
  iconWrap:{width:40,height:34,borderRadius:17,alignItems:'center',justifyContent:'center'},iconWrapActive:{backgroundColor:'rgba(255,255,255,.09)'},activeDot:{position:'absolute',bottom:2,width:4,height:4,borderRadius:2,backgroundColor:colors.accent2},
  create:{width:52,height:52,borderRadius:19,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',marginTop:-15,borderWidth:1,borderColor:'rgba(255,255,255,.24)',shadowColor:colors.accent,shadowOpacity:.3,shadowRadius:14,shadowOffset:{width:0,height:6}},createGlow:{position:'absolute',left:8,right:8,top:2,height:1,backgroundColor:'rgba(255,255,255,.44)'},
  modalHost:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(3,5,8,.62)'},sheetSafe:{backgroundColor:'transparent'},sheet:{marginHorizontal:8,marginBottom:6,borderRadius:30,backgroundColor:colors.surface,paddingHorizontal:15,paddingBottom:14,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.16)',shadowColor:'#000',shadowOpacity:.45,shadowRadius:28,shadowOffset:{width:0,height:-8}},sheetHandle:{alignSelf:'center',width:38,height:4,borderRadius:2,backgroundColor:colors.line,marginTop:9},sheetHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:5,paddingTop:15,paddingBottom:12},sheetKicker:{color:colors.accent2,fontSize:8,fontWeight:'900',letterSpacing:1.2},sheetTitle:{color:colors.text,fontSize:29,fontWeight:'900',letterSpacing:-.9,marginTop:1},close:{width:38,height:38,borderRadius:19,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},
  action:{minHeight:74,flexDirection:'row',alignItems:'center',paddingHorizontal:7,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.line},pressed:{opacity:.7,transform:[{scale:.985}]},actionIcon:{width:47,height:47,borderRadius:16,backgroundColor:colors.surface3,alignItems:'center',justifyContent:'center'},actionIconPrimary:{backgroundColor:colors.accent},actionCopy:{flex:1,marginLeft:13},actionTitle:{color:colors.text,fontSize:15,fontWeight:'900',letterSpacing:-.2},actionBody:{color:colors.muted,fontSize:10.5,marginTop:3},
});
