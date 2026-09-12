import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import {
  completeFirstLaunchTutorial,
  hasCompletedFirstLaunchTutorial,
  subscribeToFirstLaunchTutorial,
} from '@/services/tutorial';

const steps=[
  {title:'Home',body:'See friends’ posts and what campus is doing.',icon:'home' as const,tab:0},
  {title:'Discover',body:'Find events happening around you.',icon:'compass' as const,tab:1},
  {title:'Create',body:'Post a moment or create an event.',icon:'add' as const,tab:2},
  {title:'Messages',body:'Talk with friends and people you meet.',icon:'chatbubble-ellipses' as const,tab:3},
  {title:'You',body:'Manage your profile, posts, and settings.',icon:'person' as const,tab:4},
];

export function FirstLaunchTutorial({userId}:{userId:string}){
  const insets=useSafeAreaInsets();
  const {width}=useWindowDimensions();
  const [visible,setVisible]=useState(false);
  const [stepIndex,setStepIndex]=useState(0);
  const step=steps[stepIndex];
  const tabBarBottom=Math.max(12,insets.bottom-3);
  const tabWidth=(width-24)/5;
  const spotlightLeft=12+tabWidth*step.tab;
  const pointerLeft=spotlightLeft+tabWidth/2-1;
  const cardBottom=tabBarBottom+92;
  const isLast=stepIndex===steps.length-1;

  useEffect(()=>{
    if(!userId||userId==='loading-user')return;
    if(!hasCompletedFirstLaunchTutorial(userId)){setStepIndex(0);setVisible(true);}
  },[userId]);

  useEffect(()=>subscribeToFirstLaunchTutorial((requestedUserId)=>{
    if(requestedUserId!==userId)return;
    setStepIndex(0);
    setVisible(true);
  }),[userId]);

  const progress=useMemo(()=>steps.map((_,index)=>index),[]);
  const finish=()=>{completeFirstLaunchTutorial(userId);setVisible(false);};
  const next=()=>{
    if(isLast){finish();return;}
    Haptics.selectionAsync().catch(()=>{});
    setStepIndex((current)=>current+1);
  };

  return <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={finish}>
    <View style={styles.overlay} accessibilityViewIsModal>
      <View pointerEvents="none" style={[styles.spotlight,{left:spotlightLeft,width:tabWidth,bottom:tabBarBottom}]}/>
      <View pointerEvents="none" style={[styles.pointer,{left:pointerLeft,bottom:tabBarBottom+69}]}/>
      <View style={[styles.card,{bottom:cardBottom}]}>
        <View style={styles.cardTop}>
          <View style={styles.stepIcon}><Ionicons name={step.icon} color={colors.white} size={22}/></View>
          <Text style={styles.counter}>{stepIndex+1} / {steps.length}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Skip app tour" onPress={finish} hitSlop={10}><Text style={styles.skip}>Skip</Text></Pressable>
        </View>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>
        <View style={styles.footer}>
          <View style={styles.dots}>{progress.map((index)=><View key={index} style={[styles.dot,index===stepIndex&&styles.dotActive]}/>)}</View>
          <Pressable accessibilityRole="button" onPress={next} style={({pressed})=>[styles.next,pressed&&styles.pressed]}>
            <Text style={styles.nextText}>{isLast?'Done':'Next'}</Text>
            <Ionicons name={isLast?'checkmark':'arrow-forward'} color={colors.white} size={17}/>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles=StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(5,7,9,.72)'},
  spotlight:{position:'absolute',height:68,borderRadius:24,borderWidth:2,borderColor:colors.accent2,backgroundColor:'rgba(111,125,255,.18)'},
  pointer:{position:'absolute',width:2,height:23,backgroundColor:colors.accent2,borderRadius:1},
  card:{position:'absolute',left:16,right:16,minHeight:236,borderRadius:28,padding:18,backgroundColor:colors.glassStrong,borderWidth:1,borderColor:'rgba(139,150,255,.34)',shadowColor:'#000',shadowOpacity:.45,shadowRadius:24,shadowOffset:{width:0,height:12},elevation:18},
  cardTop:{flexDirection:'row',alignItems:'center'},stepIcon:{width:46,height:46,borderRadius:19,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},counter:{flex:1,color:colors.subtle,fontSize:10,fontWeight:'900',letterSpacing:.7,marginLeft:11},skip:{color:colors.muted,fontSize:12,fontWeight:'800'},title:{color:colors.text,fontSize:28,fontWeight:'900',letterSpacing:-.8,marginTop:16},body:{color:colors.muted,fontSize:13.5,lineHeight:20,marginTop:5,maxWidth:290},footer:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:20},dots:{flexDirection:'row',alignItems:'center',gap:5},dot:{width:6,height:6,borderRadius:3,backgroundColor:colors.surface3},dotActive:{width:18,backgroundColor:colors.accent2},next:{height:46,minWidth:102,borderRadius:23,backgroundColor:colors.accent,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,paddingHorizontal:17},nextText:{color:colors.white,fontSize:12,fontWeight:'900'},pressed:{opacity:.78,transform:[{scale:.97}]},
});
