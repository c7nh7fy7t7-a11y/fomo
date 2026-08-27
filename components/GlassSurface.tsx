import { PropsWithChildren } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView, type BlurTint } from 'expo-blur';
import { colors } from '@/theme/colors';

type Props=PropsWithChildren<{style?:StyleProp<ViewStyle>;intensity?:number;tint?:BlurTint;strong?:boolean}>;

export function GlassSurface({children,style,intensity=58,tint='systemUltraThinMaterialDark',strong=false}:Props){
  const content=<><View pointerEvents="none" style={[StyleSheet.absoluteFill,styles.tint,strong&&styles.strong]}/><View pointerEvents="none" style={styles.topHighlight}/>{children}</>;
  if(Platform.OS==='android') return <View style={[styles.base,style]}>{content}</View>;
  return <BlurView intensity={intensity} tint={tint} style={[styles.base,style]}>{content}</BlurView>;
}
const styles=StyleSheet.create({
  base:{overflow:'hidden',borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,backgroundColor:'rgba(18,21,24,.56)'},
  tint:{backgroundColor:'rgba(12,14,16,.34)'},strong:{backgroundColor:'rgba(12,14,16,.52)'},
  topHighlight:{position:'absolute',left:10,right:10,top:0,height:StyleSheet.hairlineWidth,backgroundColor:'rgba(255,255,255,.18)'},
});
