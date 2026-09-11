import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { colors } from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { Skeleton } from '@/components/Skeleton';

const inactiveIcons:Record<string,keyof typeof Ionicons.glyphMap>={index:'home-outline',map:'compass-outline',messages:'chatbubble-ellipses-outline',profile:'person-outline'};
const activeIcons:Record<string,keyof typeof Ionicons.glyphMap>={index:'home',map:'compass',messages:'chatbubble-ellipses',profile:'person'};

function TabIcon({route,focused,color,size}:{route:string;focused:boolean;color:ColorValue;size:number}){
  const scale=useRef(new Animated.Value(focused?1.06:1)).current;
  useEffect(()=>{Animated.spring(scale,{toValue:focused?1.07:1,useNativeDriver:true,friction:7,tension:220}).start();},[focused]);
  if(route==='create') return <Animated.View style={[styles.create,{transform:[{scale}]}]}><Ionicons name="add" color={focused?colors.text:color} size={focused?30:27}/></Animated.View>;
  return <Animated.View style={[styles.iconWrap,focused&&styles.iconWrapActive,{transform:[{scale}]}]}><Ionicons name={(focused?activeIcons[route]:inactiveIcons[route])??'ellipse-outline'} color={focused?colors.text:color} size={focused?size+1:size}/>{focused?<View style={styles.activeDot}/>:null}</Animated.View>;
}

export default function TabLayout(){
  const {authLoading}=useApp();
  if(authLoading)return <View style={styles.loading}><View style={styles.loadingBrand}/><Skeleton style={styles.loadingLine}/><Skeleton style={[styles.loadingLine,{width:112}]}/></View>;
  return <Tabs
    screenListeners={{tabPress:()=>{Haptics.selectionAsync().catch(()=>{});}}}
    screenOptions={({route})=>({
      headerShown:false,tabBarShowLabel:true,tabBarHideOnKeyboard:true,
      tabBarActiveTintColor:colors.text,tabBarInactiveTintColor:colors.subtle,
      tabBarStyle:styles.bar,tabBarItemStyle:styles.item,tabBarLabelStyle:styles.label,
      tabBarBackground:()=> <BlurView tint="systemUltraThinMaterialDark" intensity={72} style={[StyleSheet.absoluteFill,styles.barBackground]}/>,
      tabBarIcon:({color,size,focused})=><TabIcon route={route.name} focused={focused} color={color} size={size}/>,
    })}>
    <Tabs.Screen name="index" options={{title:'Home'}}/>
    <Tabs.Screen name="map" options={{title:'Discover'}}/>
    <Tabs.Screen name="create" options={{title:'Create'}}/>
    <Tabs.Screen name="messages" options={{title:'Messages'}}/>
    <Tabs.Screen name="profile" options={{title:'You'}}/>
    <Tabs.Screen name="friends" options={{href:null}}/>
  </Tabs>;
}
const styles=StyleSheet.create({
  loading:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center',gap:10},loadingBrand:{width:48,height:48,borderRadius:18,backgroundColor:colors.accentSoft,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(111,125,255,.22)'},loadingLine:{width:150,height:10,borderRadius:5},
  bar:{position:'absolute',left:12,right:12,bottom:17,height:72,borderRadius:28,overflow:'hidden',backgroundColor:'rgba(15,18,21,.54)',borderTopWidth:0,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.13)',paddingTop:5,paddingBottom:6,elevation:14,shadowColor:'#000',shadowOpacity:.34,shadowRadius:22,shadowOffset:{width:0,height:10}},
  barBackground:{borderRadius:28,overflow:'hidden'},
  item:{paddingTop:0},label:{fontSize:9,fontWeight:'800',marginTop:0,letterSpacing:.1},
  iconWrap:{width:40,height:34,borderRadius:17,alignItems:'center',justifyContent:'center'},
  iconWrapActive:{backgroundColor:'rgba(255,255,255,.09)',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.11)'},
  activeDot:{position:'absolute',bottom:2,width:4,height:4,borderRadius:2,backgroundColor:colors.accent2},
  create:{width:40,height:34,alignItems:'center',justifyContent:'center'},
});
