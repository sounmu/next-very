import { seed } from '../seed';
import type { Preset } from './types';

export const hankkiPreset: Preset = {
  id: 'hankki',
  name: '한끼식당',
  label: '한식',
  description: '제육덮밥·김치찌개 등 한식 메뉴를 팔아요',
  ...seed,
};
