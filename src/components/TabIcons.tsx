import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = {
  color: ColorValue;
  size?: number;
};

/** Hoje — anel de calorias com ponto central */
export function TodayIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" />
      <Path
        d="M12 3.5 A8.5 8.5 0 0 1 20.5 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}

/** Refeição — câmera (fotografar o prato) */
export function MealIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8 H7.5 L9 5.8 H15 L16.5 8 H20 C20.55 8 21 8.45 21 9 V18 C21 18.55 20.55 19 20 19 H4 C3.45 19 3 18.55 3 18 V9 C3 8.45 3.45 8 4 8 Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="3.5" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

/** Dieta — calendário semanal */
export function DietIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M3.5 9.5 H20.5" stroke={color} strokeWidth="2" />
      <Path d="M8 3 V6.5 M16 3 V6.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="8" cy="13.5" r="1.3" fill={color} />
      <Circle cx="12" cy="13.5" r="1.3" fill={color} />
      <Circle cx="16" cy="13.5" r="1.3" fill={color} />
      <Circle cx="8" cy="17.2" r="1.3" fill={color} />
      <Circle cx="12" cy="17.2" r="1.3" fill={color} />
    </Svg>
  );
}

/** Compras — sacola com check */
export function ShoppingIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.5 8 H18.5 L17.4 19.1 C17.35 19.6 16.93 20 16.42 20 H7.58 C7.07 20 6.65 19.6 6.6 19.1 L5.5 8 Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path d="M9 8 V6.5 A3 3 0 0 1 15 6.5 V8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path
        d="M9.5 13.5 L11.3 15.3 L14.8 11.8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Mercados — pin de mapa */
export function MarketsIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21 C12 21 19 15.5 19 10 A7 7 0 0 0 5 10 C5 15.5 12 21 12 21 Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="2.6" stroke={color} strokeWidth="2" />
    </Svg>
  );
}
