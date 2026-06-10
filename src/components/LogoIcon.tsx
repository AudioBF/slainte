import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors } from '../theme/colors';

type Props = {
  size?: number;
  variant?: 'light' | 'dark';
};

export function LogoIcon({ size = 40, variant = 'dark' }: Props) {
  const plate = variant === 'dark' ? colors.white : colors.forest;
  const stem = colors.sage;
  const leafTop = colors.orange;
  const leafBottom = colors.sage;
  const dot = colors.gold;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx="24" cy="24" r="18" stroke={plate} strokeWidth="3" fill="none" />
      <Circle cx="24" cy="24" r="12" stroke={plate} strokeWidth="1.5" fill="none" opacity={0.5} />
      <Path d="M24 30 V22" stroke={stem} strokeWidth="2" strokeLinecap="round" />
      <Ellipse cx="22" cy="20" rx="4" ry="6" fill={leafBottom} transform="rotate(-25 22 20)" />
      <Ellipse cx="26" cy="18" rx="4" ry="6" fill={leafTop} transform="rotate(20 26 18)" />
      <Circle cx="32" cy="16" r="2.5" fill={dot} />
    </Svg>
  );
}
