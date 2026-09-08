import { Redirect } from 'expo-router';

// The center tab is a quick-action trigger in the tab layout. Keep direct links safe.
export default function CreateTab(){
  return <Redirect href="/(tabs)"/>;
}
