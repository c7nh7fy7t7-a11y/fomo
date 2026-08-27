import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

export function FomoInput({label,icon,secureToggle=false,...props}:TextInputProps & {label?:string;icon?:keyof typeof Ionicons.glyphMap;secureToggle?:boolean}){
  const [focused,setFocused]=useState(false); const [visible,setVisible]=useState(false); const focus=useRef(new Animated.Value(0)).current;
  const setFocus=(on:boolean)=>{setFocused(on);Animated.timing(focus,{toValue:on?1:0,duration:140,useNativeDriver:false}).start();};
  const borderColor=focus.interpolate({inputRange:[0,1],outputRange:[colors.line,'rgba(255,107,87,.48)']});
  return <View style={styles.field}>{label?<Text style={[styles.label,focused&&styles.labelActive]}>{label}</Text>:null}<Animated.View style={[styles.shell,{borderColor}]}>{icon?<Ionicons name={icon} color={focused?colors.accent2:colors.subtle} size={17} style={styles.leading}/>:null}<TextInput {...props} secureTextEntry={secureToggle?!visible:props.secureTextEntry} placeholderTextColor={colors.subtle} style={[styles.input,props.style]} onFocus={(e)=>{setFocus(true);props.onFocus?.(e);}} onBlur={(e)=>{setFocus(false);props.onBlur?.(e);}}/>{secureToggle?<Pressable onPress={()=>setVisible(v=>!v)} style={styles.eye} hitSlop={8}><Ionicons name={visible?'eye-off-outline':'eye-outline'} color={colors.muted} size={19}/></Pressable>:null}</Animated.View></View>;
}
const styles=StyleSheet.create({field:{marginTop:14},label:{color:colors.muted,fontSize:9,fontWeight:'900',letterSpacing:1,marginBottom:7},labelActive:{color:colors.accent2},shell:{height:54,borderRadius:20,backgroundColor:colors.surface,borderWidth:1,flexDirection:'row',alignItems:'center',overflow:'hidden'},leading:{marginLeft:14},input:{flex:1,height:'100%',color:colors.text,paddingHorizontal:14,fontSize:14},eye:{width:46,height:'100%',alignItems:'center',justifyContent:'center'}});
