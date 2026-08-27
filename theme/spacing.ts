export const spacing = { xxs:4, xs:8, sm:12, md:16, lg:20, xl:24, xxl:32, huge:40 } as const;
export const radius = { sm:12, md:18, lg:24, xl:30, pill:999 } as const;
export const type = {
  display:{fontSize:38,lineHeight:42,fontWeight:'900' as const,letterSpacing:-1.5},
  screen:{fontSize:30,lineHeight:34,fontWeight:'900' as const,letterSpacing:-1.0},
  section:{fontSize:20,lineHeight:24,fontWeight:'800' as const,letterSpacing:-.45},
  card:{fontSize:16,lineHeight:20,fontWeight:'800' as const,letterSpacing:-.25},
  body:{fontSize:14,lineHeight:20,fontWeight:'500' as const},
  secondary:{fontSize:12,lineHeight:17,fontWeight:'600' as const},
  caption:{fontSize:10,lineHeight:14,fontWeight:'700' as const},
  micro:{fontSize:8.5,lineHeight:12,fontWeight:'800' as const,letterSpacing:.7},
} as const;
