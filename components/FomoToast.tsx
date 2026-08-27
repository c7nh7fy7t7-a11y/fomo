import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassSurface } from './GlassSurface';
import { colors } from '@/theme/colors';
export function FomoToast({visible,message,icon='checkmark'}:{visible:boolean;message:string;icon?:keyof typeof Ionicons.glyphMap}){
 const y=useRef(new Animated.Value(-18)).current, opacity=useRef(new Animated.Value(0)).current;
 useEffect(()=>{Animated.parallel([Animated.spring(y,{toValue:visible?0:-18,useNativeDriver:true,friction:8,tension:190}),Animated.timing(opacity,{toValue:visible?1:0,duration:visible?150:120,useNativeDriver:true})]).start();},[visible]);
 return <Animated.View pointerEvents="none" style={[styles.wrap,{opacity,transform:[{translateY:y}]}]}><GlassSurface strong style={styles.toast}><View style={styles.icon}><Ionicons name={icon} color={colors.text} size={14}/></View><Text style={styles.text}>{message}</Text></GlassSurface></Animated.View>;
}
const styles=StyleSheet.create({wrap:{position:'absolute',top:8,left:0,right:0,alignItems:'center',zIndex:100},toast:{height:42,borderRadius:21,paddingHorizontal:10,flexDirection:'row',alignItems:'center'},icon:{width:27,height:27,borderRadius:14,backgroundColor:colors.accentSoft,alignItems:'center',justifyContent:'center'},text:{color:colors.text,fontSize:11,fontWeight:'800',marginHorizontal:9}});
