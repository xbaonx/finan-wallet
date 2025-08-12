import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { useTheme } from '../../core/theme';

interface LogoComponentProps {
  size?: 'small' | 'medium' | 'large';
  style?: StyleProp<ImageStyle>;
}

export const LogoComponent: React.FC<LogoComponentProps> = ({ 
  size = 'medium', 
  style 
}) => {
  const { theme } = useTheme();
  
  // Chọn logo phù hợp với theme
  const logoSource = theme.isDark 
    ? require('../../../assets/images/logo-white.png')
    : require('../../../assets/images/logo.png');
  
  // Kích thước logo theo size
  const getLogoSize = () => {
    switch (size) {
      case 'small':
        return { width: 24, height: 24 };
      case 'medium':
        return { width: 40, height: 40 };
      case 'large':
        return { width: 80, height: 80 };
      default:
        return { width: 40, height: 40 };
    }
  };

  return (
    <Image
      source={logoSource}
      style={[
        getLogoSize(),
        { resizeMode: 'contain' },
        style
      ]}
      resizeMode="contain"
    />
  );
};
