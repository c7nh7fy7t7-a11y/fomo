import { ReactNode, useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { motion } from '@/theme/motion';

const AnimatedPressable=Animated.createAnimatedComponent(Pressable);
type Props=Omit<PressableProps,'style'|'children'> & {children:ReactNode;style?:StyleProp<ViewStyle>;haptic?:'none'|'selection'|'light'|'medium'};
export function PressableScale({children,style,haptic='none',onPressIn,onPressOut,...props}:Props){
  const scale=useRef(new Animated.Value(1)).current;
  const animate=(to:number)=>Animated.spring(scale,{toValue:to,useNativeDriver:true,...motion.spring}).start();
  return <AnimatedPressable {...props} style={[style,{transform:[{scale}]}]} onPressIn={(e)=>{animate(motion.pressScale);if(haptic==='selection')Haptics.selectionAsync().catch(()=>{});if(haptic==='light')Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});if(haptic==='medium')Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});onPressIn?.(e);}} onPressOut={(e)=>{animate(1);onPressOut?.(e);}}>{children}</AnimatedPressable>;
}
