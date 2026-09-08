import type { ColorValue } from 'react-native';

/** FOMO V6.3 — Liquid Social palette. Coral is intentionally rare; content stays neutral. */
export const colors = {
  bg: '#080B11',
  bgDeep: '#05070B',
  surface: '#11161E',
  surface2: '#171D27',
  surface3: '#202936',
  raised: '#293442',
  glass: 'rgba(14,19,27,.76)',
  glassStrong: 'rgba(15,20,29,.91)',
  glassSoft: 'rgba(255,255,255,.055)',
  line: 'rgba(255,255,255,.085)',
  border: 'rgba(255,255,255,.085)',
  highlight: 'rgba(255,255,255,.16)',
  text: '#F6F3EF',
  ink: '#F6F3EF',
  muted: '#A6A9AD',
  subtle: '#6F757C',
  accent: '#FF6B57',
  accent2: '#FF7A66',
  accentPressed: '#EF5947',
  accentSoft: 'rgba(255,107,87,.13)',
  accentGlow: 'rgba(255,107,87,.18)',
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
  social: '#FF7A66',
  socialSoft: '#34201D',
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
