import { Alert } from 'react-native';
import { ReportReason, ReportTarget } from '@/services/v62';

export function showReportSheet(target:ReportTarget,report:(target:ReportTarget,reason:ReportReason,details?:string)=>Promise<void>){
  const send=(reason:ReportReason)=>report(target,reason).then(()=>Alert.alert('Report received','Thanks. We’ll keep this in the moderation queue.')).catch(()=>Alert.alert('Couldn’t send report','Try again.'));
  const more=()=>Alert.alert('Report','Choose the closest reason.',[
    {text:'Inappropriate',onPress:()=>send('inappropriate')},{text:'Safety concern',onPress:()=>send('safety')},{text:'More',onPress:()=>Alert.alert('Report','One last choice.',[{text:'Fake event',onPress:()=>send('fake_event')},{text:'Other',onPress:()=>send('other')},{text:'Cancel',style:'cancel'}])},
  ]);
  Alert.alert('Report to FOMO','What’s the issue?',[{text:'Spam',onPress:()=>send('spam')},{text:'Harassment',onPress:()=>send('harassment')},{text:'More',onPress:more}]);
}
