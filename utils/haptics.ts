import * as Haptics from 'expo-haptics';
/** FOMO V6.3 tactile language. Keep these short; never use haptics for scrolling. */
export const fomoHaptics={
  selection:()=>Haptics.selectionAsync().catch(()=>{}),
  light:()=>Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{}),
  medium:()=>Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{}),
  success:()=>Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{}),
  error:()=>Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(()=>{}),
  reaction:()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(()=>{});setTimeout(()=>Haptics.selectionAsync().catch(()=>{}),65);setTimeout(()=>Haptics.selectionAsync().catch(()=>{}),125);setTimeout(()=>Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{}),205);},
};
