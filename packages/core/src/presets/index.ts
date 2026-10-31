import { gimbapPreset } from './gimbap';
import { hankkiPreset } from './hankki';
import { pastaPreset } from './pasta';
import { pizzaPreset } from './pizza';
import type { Preset, PresetId } from './types';

export * from './types';
export * from './hankki';
export * from './pasta';
export * from './pizza';
export * from './gimbap';

export const PRESETS: Record<PresetId, Preset> = {
  hankki: hankkiPreset,
  pasta: pastaPreset,
  pizza: pizzaPreset,
  gimbap: gimbapPreset,
};

export function getPreset(id: PresetId): Preset {
  return PRESETS[id];
}
