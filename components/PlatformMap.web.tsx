import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

type WebMapProps={
  children?:React.ReactNode;
  style?:StyleProp<ViewStyle>;
  accessibilityLabel?:string;
};

const PlatformMap=forwardRef<any,WebMapProps>(function PlatformMap({style,accessibilityLabel},ref){
  useImperativeHandle(ref,()=>({animateCamera:()=>{}}),[]);
  return <View accessibilityLabel={accessibilityLabel??'Map preview unavailable on web'} style={[styles.map,style]}>
    <View style={styles.icon}><Ionicons name="compass-outline" color={colors.accent2} size={26}/></View>
    <Text style={styles.title}>Map view is coming to web</Text>
    <Text style={styles.body}>Use the event list to browse safely. Exact private locations remain hidden until you have access.</Text>
  </View>;
});

export function Marker(_props:any){return null;}
export type MapPressEvent={nativeEvent:{coordinate:{latitude:number;longitude:number}}};
export default PlatformMap;

const styles=StyleSheet.create({
  map:{alignItems:'center',justifyContent:'center',padding:24,backgroundColor:colors.surface2},
  icon:{width:54,height:54,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:colors.accentSoft,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(139,150,255,.28)'},
  title:{color:colors.text,fontSize:17,fontWeight:'900',marginTop:13,textAlign:'center'},
  body:{maxWidth:360,color:colors.muted,fontSize:13,lineHeight:20,marginTop:6,textAlign:'center'},
});
