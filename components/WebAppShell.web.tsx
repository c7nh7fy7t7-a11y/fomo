import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { BrandWordmark } from '@/components/BrandWordmark';
import { useApp } from '@/context/AppContext';
import { colors } from '@/theme/colors';

type NavItem={
  label:string;
  href:string;
  icon:keyof typeof Ionicons.glyphMap;
  activeIcon:keyof typeof Ionicons.glyphMap;
  accent?:boolean;
};

const primaryNav:NavItem[]=[
  {label:'Home',href:'/(tabs)',icon:'home-outline',activeIcon:'home'},
  {label:'Discover',href:'/(tabs)/map',icon:'compass-outline',activeIcon:'compass'},
  {label:'Events',href:'/(tabs)/events',icon:'calendar-outline',activeIcon:'calendar'},
  {label:'Messages',href:'/(tabs)/messages',icon:'chatbubble-ellipses-outline',activeIcon:'chatbubble-ellipses'},
  {label:'Notifications',href:'/notifications',icon:'notifications-outline',activeIcon:'notifications'},
  {label:'Profile',href:'/(tabs)/profile',icon:'person-outline',activeIcon:'person'},
];
const utilityNav:NavItem[]=[
  {label:'Create',href:'/(tabs)/create',icon:'add',activeIcon:'add',accent:true},
  {label:'Settings',href:'/settings',icon:'settings-outline',activeIcon:'settings'},
];
const mobileNav=[primaryNav[0],primaryNav[1],utilityNav[0],primaryNav[3],primaryNav[5]];

function isActive(pathname:string,href:string){
  const route=href.replace('/(tabs)','')||'/';
  if(route==='/')return pathname==='/'||pathname==='/index';
  return pathname===route||pathname.startsWith(`${route}/`);
}

function NavLink({item,compact=false}:{item:NavItem;compact?:boolean}){
  const pathname=usePathname();
  const active=isActive(pathname,item.href);
  return <Link href={item.href as any} asChild>
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={item.label}
      style={({pressed,hovered}:any)=>[
        compact?styles.mobileItem:styles.navItem,
        active&&!item.accent&&styles.navItemActive,
        item.accent&&!compact&&styles.createItem,
        item.accent&&compact&&styles.mobileCreate,
        hovered&&!active&&!item.accent&&styles.navItemHovered,
        pressed&&styles.pressed,
      ]}
    >
      <View style={[compact?styles.mobileIcon:styles.navIcon,active&&!item.accent&&styles.navIconActive]}>
        <Ionicons name={active?item.activeIcon:item.icon} color={item.accent?colors.white:active?colors.accent2:colors.muted} size={item.accent?compact?27:24:21}/>
      </View>
      <Text numberOfLines={1} style={[compact?styles.mobileLabel:styles.navLabel,active&&styles.navLabelActive,item.accent&&styles.createLabel]}>{item.label}</Text>
    </Pressable>
  </Link>;
}

export function WebAppShell({children}:PropsWithChildren){
  const {width}=useWindowDimensions();
  const {currentUser,unreadNotificationCount}=useApp();
  const desktop=width>=920;
  const showRight=width>=1240;

  return <View style={styles.app}>
    {desktop?<View style={styles.leftRail}>
      <Link href="/(tabs)" asChild><Pressable accessibilityRole="link" accessibilityLabel="FOMO home" style={({pressed})=>[styles.brand,pressed&&styles.pressed]}><BrandWordmark width={104}/></Pressable></Link>
      <View style={styles.nav}>{primaryNav.map((item)=><NavLink key={item.label} item={item}/>)}</View>
      <View style={styles.utility}>{utilityNav.map((item)=><NavLink key={item.label} item={item}/>)}</View>
      <Link href="/(tabs)/profile" asChild><Pressable style={({pressed,hovered}:any)=>[styles.account,hovered&&styles.accountHovered,pressed&&styles.pressed]} accessibilityRole="link" accessibilityLabel="Open your profile"><Avatar person={currentUser} size={42} circular/><View style={styles.accountCopy}><Text style={styles.accountName} numberOfLines={1}>{currentUser.name}</Text><Text style={styles.accountUser} numberOfLines={1}>@{currentUser.username}</Text></View><Ionicons name="chevron-forward" color={colors.subtle} size={16}/></Pressable></Link>
    </View>:<View style={styles.mobileTop}><BrandWordmark width={84}/><Link href="/notifications" asChild><Pressable accessibilityRole="link" accessibilityLabel="Notifications" style={styles.mobileTopAction}><Ionicons name={unreadNotificationCount?'notifications':'notifications-outline'} color={colors.text} size={21}/>{unreadNotificationCount?<View style={styles.badge}><Text style={styles.badgeText}>{Math.min(unreadNotificationCount,9)}{unreadNotificationCount>9?'+':''}</Text></View>:null}</Pressable></Link></View>}

    <View style={[styles.center,desktop?styles.centerDesktop:styles.centerCompact]}><View style={styles.contentFrame}>{children}</View></View>

    {showRight?<View style={styles.rightRail}>
      <View style={styles.rightCard}><Text style={styles.rightKicker}>YOUR CAMPUS</Text><Text style={styles.rightTitle}>What’s happening</Text><View style={styles.placeholder}><View style={styles.placeholderIcon}><Ionicons name="calendar-outline" color={colors.accent2} size={18}/></View><View style={styles.placeholderCopy}><Text style={styles.placeholderTitle}>Coming up</Text><Text style={styles.placeholderBody}>Your next events will appear here.</Text></View></View><View style={styles.placeholder}><View style={styles.placeholderIcon}><Ionicons name="people-outline" color={colors.accent2} size={18}/></View><View style={styles.placeholderCopy}><Text style={styles.placeholderTitle}>People to know</Text><Text style={styles.placeholderBody}>Campus suggestions will appear here.</Text></View></View></View>
      <Text style={styles.footer}>FOMO · University of Saskatchewan</Text>
    </View>:null}

    {!desktop?<View style={styles.mobileNav}>{mobileNav.map((item)=><NavLink key={item.label} item={item} compact/>)}</View>:null}
  </View>;
}

const styles=StyleSheet.create({
  app:{flex:1,flexDirection:'row',backgroundColor:colors.bg,minWidth:0},
  leftRail:{width:244,paddingHorizontal:18,paddingTop:28,paddingBottom:22,borderRightWidth:StyleSheet.hairlineWidth,borderRightColor:colors.line,backgroundColor:colors.bgDeep},
  brand:{height:56,justifyContent:'center',paddingHorizontal:12,alignSelf:'flex-start'},
  nav:{marginTop:22,gap:7},utility:{marginTop:'auto',gap:7},
  navItem:{minHeight:52,borderRadius:18,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:11,borderWidth:StyleSheet.hairlineWidth,borderColor:'transparent'},
  navItemActive:{backgroundColor:colors.surface2,borderColor:colors.line},navItemHovered:{backgroundColor:colors.glassSoft},
  navIcon:{width:34,height:34,borderRadius:13,alignItems:'center',justifyContent:'center'},navIconActive:{backgroundColor:colors.accentSoft},
  navLabel:{color:colors.muted,fontSize:15,fontWeight:'700'},navLabelActive:{color:colors.text,fontWeight:'800'},
  createItem:{backgroundColor:colors.accent,marginBottom:5,borderColor:'rgba(255,255,255,.18)'},createLabel:{color:colors.white,fontWeight:'900'},
  pressed:{opacity:.7,transform:[{scale:.985}]},
  account:{minHeight:68,borderRadius:20,paddingHorizontal:9,marginTop:14,flexDirection:'row',alignItems:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,backgroundColor:colors.surface},accountHovered:{backgroundColor:colors.surface2},accountCopy:{flex:1,minWidth:0,marginLeft:10},accountName:{color:colors.text,fontSize:14,fontWeight:'800'},accountUser:{color:colors.muted,fontSize:12,marginTop:2},
  center:{flex:1,minWidth:0,alignItems:'center',backgroundColor:colors.bg},centerDesktop:{paddingHorizontal:22},centerCompact:{paddingTop:64},contentFrame:{flex:1,width:'100%',maxWidth:780,minWidth:0},
  rightRail:{width:310,paddingHorizontal:20,paddingTop:34,paddingBottom:24,borderLeftWidth:StyleSheet.hairlineWidth,borderLeftColor:colors.line,backgroundColor:colors.bgDeep},
  rightCard:{padding:18,borderRadius:25,backgroundColor:colors.surface,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line},rightKicker:{color:colors.accent2,fontSize:12,fontWeight:'900',letterSpacing:1.1},rightTitle:{color:colors.text,fontSize:22,fontWeight:'900',letterSpacing:-.5,marginTop:5,marginBottom:17},
  placeholder:{minHeight:72,flexDirection:'row',alignItems:'center',paddingVertical:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.line},placeholderIcon:{width:42,height:42,borderRadius:16,backgroundColor:colors.accentSoft,alignItems:'center',justifyContent:'center'},placeholderCopy:{flex:1,minWidth:0,marginLeft:11},placeholderTitle:{color:colors.text,fontSize:14,fontWeight:'800'},placeholderBody:{color:colors.muted,fontSize:12,lineHeight:17,marginTop:3},footer:{color:colors.subtle,fontSize:12,lineHeight:18,marginTop:'auto',paddingHorizontal:4},
  mobileTop:{position:'absolute',left:0,right:0,top:0,height:64,zIndex:40,paddingHorizontal:17,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:colors.glassStrong,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},mobileTopAction:{width:44,height:44,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface2},badge:{position:'absolute',right:2,top:2,minWidth:16,height:16,borderRadius:8,backgroundColor:colors.accent2,alignItems:'center',justifyContent:'center',paddingHorizontal:3},badgeText:{color:colors.white,fontSize:9,fontWeight:'900'},
  mobileNav:{position:'absolute',left:8,right:8,bottom:8,height:70,zIndex:50,borderRadius:24,flexDirection:'row',alignItems:'center',paddingHorizontal:4,backgroundColor:colors.glassStrong,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,.14)'},mobileItem:{flex:1,minWidth:0,height:62,alignItems:'center',justifyContent:'center'},mobileIcon:{width:40,height:34,borderRadius:15,alignItems:'center',justifyContent:'center'},mobileLabel:{color:colors.muted,fontSize:10,fontWeight:'700',marginTop:1},mobileCreate:{transform:[{translateY:-4}]},
});
