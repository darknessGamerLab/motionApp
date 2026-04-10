/**
 * Motion App — Design System Palette
 * Dark Mode (default for video app) + Light Mode support
 */

export type ThemeMode = 'dark' | 'light';

const DarkPalette = {
  // Brand
  primary: '#FF2D55',
  primaryDark: '#E0264B',
  primaryLight: 'rgba(255,45,85,0.15)',

  // Backgrounds
  background: '#000000',
  surface: '#1C1C1E',
  /** Tab bar ile aynı aile; ana içerik zemini için surface’ten ~1 ton koyu */
  tabScreenBackground: '#18181A',
  surfaceAlt: '#2C2C2E',
  card: '#1C1C1E',

  // Text
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textMuted: '#8E8E93',
  textDim: '#48484A',

  // Borders
  border: '#38383A',
  borderLight: '#2C2C2E',

  // Semantic
  error: '#FF453A',
  success: '#30D158',
  warning: '#FFD60A',
  info: '#64D2FF',

  // Social actions
  like: '#FF2D55',
  save: '#FFD60A',
  follow: '#30D158',
  comment: '#64D2FF',
  radar: '#BF5AF2',

  // Extra
  blue: '#0A84FF',
  green: '#30D158',
  purple: '#BF5AF2',

  // Shadow
  shadow: 'rgba(0,0,0,0.3)',
  shadowMd: 'rgba(0,0,0,0.5)',

  // Glassmorphism
  glass: 'rgba(255,255,255,0.08)',
  glassStrong: 'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.12)',
};

const LightPalette = {
  primary: '#DC143C',
  primaryDark: '#B01030',
  primaryLight: '#FFF0F3',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  tabScreenBackground: '#F2F2F7',
  surfaceAlt: '#F4F4F5',
  card: '#FFFFFF',
  text: '#111111',
  textSecondary: '#52525B',
  textMuted: '#A1A1AA',
  textDim: '#D4D4D8',
  border: '#E4E4E7',
  borderLight: '#F0F0F1',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
  like: '#EF4444',
  save: '#F59E0B',
  follow: '#22C55E',
  comment: '#3B82F6',
  radar: '#8B5CF6',
  blue: '#3B82F6',
  green: '#22C55E',
  purple: '#8B5CF6',
  shadow: 'rgba(0,0,0,0.06)',
  shadowMd: 'rgba(0,0,0,0.12)',
  glass: 'rgba(0,0,0,0.04)',
  glassStrong: 'rgba(0,0,0,0.08)',
  glassBorder: 'rgba(0,0,0,0.06)',
};

// Default: Dark mode for video app
const Colors = DarkPalette;

export { DarkPalette, LightPalette };
export default Colors;
