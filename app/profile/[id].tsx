import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ProfileView } from '@/components/ProfileView';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';

export default function PublicProfile(){
  const router=useRouter(); const {id}=useLocalSearchParams<{id:string}>(); const {currentUser,recordPersonView}=useApp();
  useEffect(()=>{if(id&&id!==currentUser.id)recordPersonView(id);},[id,currentUser.id]);
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.head}><Pressable onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" color={colors.text} size={22}/></Pressable></View><ProfileView personId={id??''}/></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},head:{height:48,paddingHorizontal:16,justifyContent:'center'},back:{width:38,height:38,borderRadius:19,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'}});
