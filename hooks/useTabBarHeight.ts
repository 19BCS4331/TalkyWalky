import { Platform, Dimensions } from 'react-native';

export function useTabBarHeight() {
  const windowWidth = Dimensions.get('window').width;
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 65;
  const MARGIN = windowWidth * 0.025; // 5% margin on each side

  return {
    height: TAB_BAR_HEIGHT,
    margin: MARGIN,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  };
}
