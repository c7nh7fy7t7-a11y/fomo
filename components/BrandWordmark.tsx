import { Image, ImageStyle, StyleProp } from 'react-native';

export function BrandWordmark({ width = 84, style }: { width?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={require('@/assets/wordmark.png')}
      resizeMode="contain"
      style={[{ width, height: Math.round(width * 0.36) }, style]}
    />
  );
}
