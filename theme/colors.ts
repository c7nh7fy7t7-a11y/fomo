import type { ColorValue } from 'react-native';

/** FOMO V6.3 — Liquid Social palette. Periwinkle is intentionally rare; content stays neutral. */
export const colors = {
  bg: '#0B0D0F',
  bgDeep: '#070809',
  surface: '#121518',
  surface2: '#181C20',
  surface3: '#20252A',
  raised: '#282E34',
  glass: 'rgba(18,21,24,.74)',
  glassStrong: 'rgba(20,23,27,.90)',
  glassSoft: 'rgba(255,255,255,.055)',
  line: 'rgba(255,255,255,.085)',
  border: 'rgba(255,255,255,.085)',
  highlight: 'rgba(255,255,255,.16)',
  text: '#F6F3EF',
  ink: '#F6F3EF',
  muted: '#A6A9AD',
  subtle: '#6F757C',
  accent: '#6F7DFF',
  accent2: '#8B96FF',
  accentPressed: '#5968E8',
  accentSoft: 'rgba(111,125,255,.14)',
  accentGlow: 'rgba(111,125,255,.20)',
  success: '#78D7A7',
  warning: '#F2C068',
  danger: '#FF6678',
  white: '#FFFFFF',
  black: '#090A0B',
  study: '#7AAAF8',
  studySoft: '#172335',
  sports: '#71D6A1',
  sportsSoft: '#142921',
  clubs: '#C4A0FF',
  clubsSoft: '#251E33',
  campus: '#F2C46A',
  campusSoft: '#302718',
  social: '#8B96FF',
  socialSoft: '#202443',
};

export const categoryColor = (category: string): ColorValue => {
  if (category === 'Study') return colors.study;
  if (category === 'Sports & Rec') return colors.sports;
  if (category === 'Clubs') return colors.clubs;
  if (category === 'Campus Event') return colors.campus;
  return colors.social;
};

export const categorySoft = (category: string): ColorValue => {
  if (category === 'Study') return colors.studySoft;
  if (category === 'Sports & Rec') return colors.sportsSoft;
  if (category === 'Clubs') return colors.clubsSoft;
  if (category === 'Campus Event') return colors.campusSoft;
  return colors.socialSoft;
};
