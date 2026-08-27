import { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
export function Skeleton({style}:{style?:StyleProp<ViewStyle>}){const pulse=useRef(new Animated.Value(.38)).current;useEffect(()=>{const loop=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:.72,duration:720,useNativeDriver:true}),Animated.timing(pulse,{toValue:.38,duration:720,useNativeDriver:true})]));loop.start();return()=>loop.stop();},[]);return <Animated.View style={[styles.base,style,{opacity:pulse}]}/>;}const styles=StyleSheet.create({base:{backgroundColor:colors.surface3,borderRadius:12}});
