import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { Skeleton } from '@/components/Skeleton';
import { FirstLaunchTutorial } from '@/components/FirstLaunchTutorial';

const inactiveIcons:Record<string,keyof typeof Ionicons.glyphMap>={index:'home-outline',map:'compass-outline',messages:'chatbubble-ellipses-outline',profile:'person-outline'};
const activeIcons:Record<string,keyof typeof Ionicons.glyphMap>={index:'home',map:'compass',messages:'chatbubble-ellipses',profile:'person'};

function TabIcon({route,focused,color,size,reduceMotion}:{route:string;focused:boolean;color:ColorValue;size:number;reduceMotion:boolean}){
  const focusProgress=useRef(new Animated.Value(focused?1:0)).current;
  const createBurst=useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    focusProgress.stopAnimation();
    createBurst.stopAnimation();
    if(reduceMotion){
      focusProgress.setValue(focused?1:0);
      createBurst.setValue(0);
      return;
    }
    Animated.spring(focusProgress,{toValue:focused?1:0,useNativeDriver:true,friction:7,tension:210}).start();
    if(route==='create'&&focused){
      createBurst.setValue(0);
      Animated.sequence([
        Animated.delay(20),
        Animated.timing(createBurst,{toValue:1,duration:460,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
      ]).start();
    }else createBurst.setValue(0);
    return ()=>{focusProgress.stopAnimation();createBurst.stopAnimation();};
  },[createBurst,focusProgress,focused,reduceMotion,route]);

  if(route==='create'){
    const buttonScale=focusProgress.interpolate({inputRange:[0,1],outputRange:[1,1.08]});
    const buttonLift=focusProgress.interpolate({inputRange:[0,1],outputRange:[0,-2]});
    const burstScale=createBurst.interpolate({inputRange:[0,1],outputRange:[.82,1.42]});
    const burstOpacity=createBurst.interpolate({inputRange:[0,.18,1],outputRange:[0,.42,0]});
    return <View style={styles.createStage}>
      <Animated.View pointerEvents="none" style={[styles.createBurst,{opacity:burstOpacity,transform:[{scale:burstScale}]}]}/>
      <Animated.View style={[styles.createButton,focused&&styles.createButtonFocused,{transform:[{translateY:buttonLift},{scale:buttonScale}]}]}>
        <View pointerEvents="none" style={styles.createHighlight}/>
        <Ionicons name="add" color={colors.white} size={31}/>
      </Animated.View>
    </View>;
  }

  const iconScale=focusProgress.interpolate({inputRange:[0,1],outputRange:[1,1.1]});
  const iconLift=focusProgress.interpolate({inputRange:[0,1],outputRange:[0,-1.5]});
  const haloScale=focusProgress.interpolate({inputRange:[0,1],outputRange:[.82,1]});
  const indicatorScale=focusProgress.interpolate({inputRange:[0,1],outputRange:[.35,1]});
  return <View style={styles.iconSlot}>
    <Animated.View pointerEvents="none" style={[styles.iconHalo,{opacity:focusProgress,transform:[{scale:haloScale}]}]}/>
    <Animated.View style={{transform:[{translateY:iconLift},{scale:iconScale}]}}><Ionicons name={(focused?activeIcons[route]:inactiveIcons[route])??'ellipse-outline'} color={color} size={focused?size+1:size}/></Animated.View>
    <Animated.View pointerEvents="none" style={[styles.activeIndicator,{opacity:focusProgress,transform:[{scaleX:indicatorScale}]}]}/>
  </View>;
}

function TabBarBackground(){
  return <View pointerEvents="none" style={styles.barBackground}>
    <BlurView tint="systemUltraThinMaterialDark" intensity={78} style={StyleSheet.absoluteFill}/>
    <View style={styles.barTint}/>
    <View style={styles.barTopLight}/>
  </View>;
}

export default function TabLayout(){
  const {authLoading,currentUser,isAuthenticated,demoMode}=useApp();
  const insets=useSafeAreaInsets();
  const [reduceMotion,setReduceMotion]=useState(false);
  useEffect(()=>{
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(()=>{});
    const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);
    return ()=>subscription.remove();
  },[]);
  if(authLoading)return <View style={styles.loading}><View style={styles.loadingBrand}/><Skeleton style={styles.loadingLine}/><Skeleton style={[styles.loadingLine,{width:112}]}/></View>;
  return <><Tabs
    screenListeners={({route})=>({tabPress:()=>{
      const feedback=route.name==='create'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : Haptics.selectionAsync();
      feedback.catch(()=>{});
    }})}
    screenOptions={({route})=>({
      headerShown:false,tabBarShowLabel:true,tabBarHideOnKeyboard:true,
      tabBarActiveTintColor:colors.accent2,tabBarInactiveTintColor:colors.muted,
      tabBarStyle:[styles.bar,{bottom:Math.max(12,insets.bottom-3)}],tabBarItemStyle:styles.item,tabBarLabelStyle:styles.label,
      tabBarBackground:()=> <TabBarBackground/>,
      tabBarIcon:({color,size,focused})=><TabIcon route={route.name} focused={focused} color={color} size={size} reduceMotion={reduceMotion}/>,
    })}>
    <Tabs.Screen name="index" options={{title:'Home'}}/>
    <Tabs.Screen name="map" options={{title:'Discover'}}/>
    <Tabs.Screen name="create" options={{title:'Create',tabBarLabel:()=>null,tabBarAccessibilityLabel:'Create'}}/>
    <Tabs.Screen name="messages" options={{title:'Messages'}}/>
    <Tabs.Screen name="profile" options={{title:'You'}}/>
    <Tabs.Screen name="friends" options={{href:null}}/>
  </Tabs>{isAuthenticated||demoMode?<FirstLaunchTutorial userId={currentUser.id}/>:null}</>;
}
const styles=StyleSheet.create({
  loading:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center',gap:10},loadingBrand:{width:48,height:48,borderRadius:18,backgroundColor:colors.accentSoft,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(111,125,255,.22)'},loadingLine:{width:150,height:10,borderRadius:5},
  bar:{position:'absolute',left:12,right:12,height:68,borderRadius:25,backgroundColor:'transparent',borderTopWidth:0,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.14)',paddingTop:4,paddingBottom:5,elevation:16,shadowColor:'#000',shadowOpacity:.4,shadowRadius:24,shadowOffset:{width:0,height:11}},
  barBackground:{position:'absolute',inset:0,borderRadius:25,overflow:'hidden',backgroundColor:'rgba(12,14,17,.76)'},
  barTint:{position:'absolute',inset:0,backgroundColor:'rgba(15,18,22,.52)'},
  barTopLight:{position:'absolute',left:18,right:18,top:0,height:StyleSheet.hairlineWidth,backgroundColor:'rgba(255,255,255,.22)'},
  item:{paddingTop:1},label:{fontSize:9.5,fontWeight:'800',marginTop:-1,letterSpacing:.15},
  iconSlot:{width:46,height:35,alignItems:'center',justifyContent:'center'},
  iconHalo:{position:'absolute',width:43,height:32,borderRadius:16,backgroundColor:colors.accentSoft,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(139,150,255,.22)'},
  activeIndicator:{position:'absolute',bottom:0,width:14,height:2.5,borderRadius:2,backgroundColor:colors.accent2},
  createStage:{width:60,height:52,alignItems:'center',justifyContent:'center',transform:[{translateY:3}]},
  createBurst:{position:'absolute',width:48,height:48,borderRadius:20,borderWidth:1.5,borderColor:colors.accent2},
  createButton:{width:52,height:52,borderRadius:21,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.34)',shadowColor:colors.accent,shadowOpacity:.44,shadowRadius:13,shadowOffset:{width:0,height:5},elevation:11},
  createButtonFocused:{backgroundColor:colors.accent2,shadowOpacity:.58},
  createHighlight:{position:'absolute',left:10,right:10,top:5,height:1,borderRadius:1,backgroundColor:'rgba(255,255,255,.45)'},
});
