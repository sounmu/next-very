import { INDUSTRIES, type Industry } from '@marginlog/core';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { DEFAULT_REGION, REGIONS, sigunguOf } from '@/session/regions';
import { useSession } from '@/session/SessionProvider';
import {
  Button,
  Header,
  ListRow,
  Notice,
  Screen,
  Sheet,
  TextField,
  colors,
  control,
  iconSize,
  iconStroke,
  lineWidth,
  opacity,
  radius,
  space,
  typography,
} from '@/ui';

type Picker = 'sido' | 'sigungu' | null;

export default function OnboardingScreen() {
  const { completeSetup, leave } = useSession();
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [sido, setSido] = useState<string>(DEFAULT_REGION.sido);
  const [sigungu, setSigungu] = useState<string>(DEFAULT_REGION.sigungu);
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const ready = name.trim() !== '' && industry !== null;

  async function start() {
    if (!ready || saving || industry === null) return;
    setSaving(true);
    setSaveError(false);
    try {
      await completeSetup({ name: name.trim(), sido, sigungu, industry });
    } catch (error) {
      console.warn('[onboarding] could not save the store', error);
      setSaveError(true);
      setSaving(false);
    }
  }

  const options = picker === 'sido' ? REGIONS.map((region) => region.sido) : picker === 'sigungu' ? sigunguOf(sido) : [];
  const selected = picker === 'sido' ? sido : sigungu;

  return (
    <Screen
      actions={
        <>
          {saveError ? <Text style={styles.error}>저장하지 못했어요. 입력한 내용은 그대로예요. 다시 시도해 주세요</Text> : null}
          {!ready ? <Text style={styles.reason}>가게 이름과 업종을 정하면 시작할 수 있어요</Text> : null}
          <Button label={saveError ? '다시 시도' : '우리 가게 시작하기'} onPress={start} disabled={!ready || saving} loading={saving} />
        </>
      }
    >
      <Header backLabel="로그인" onBack={() => void leave()} title="어떤 가게를 운영하시나요?" />

      <TextField
        label="가게 이름"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setNameTouched(true);
        }}
        placeholder="예: 한끼식당"
        error={nameTouched && name.trim() === '' ? '가게 이름을 입력해 주세요' : undefined}
      />

      <View style={styles.field}>
        <Text style={typography.secondary}>지역</Text>
        <View style={styles.pair}>
          <SelectBox label="시·도" value={sido} onPress={() => setPicker('sido')} />
          <SelectBox label="시·군·구" value={sigungu} onPress={() => setPicker('sigungu')} />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={typography.secondary}>업종</Text>
        <View accessibilityRole="radiogroup" style={styles.cards}>
          {INDUSTRIES.map((item) => (
            <IndustryCard
              key={item.id}
              name={item.name}
              description={item.description}
              selected={industry === item.id}
              onPress={() => setIndustry(item.id)}
            />
          ))}
        </View>
      </View>

      <Notice>선택한 업종에 맞는 예시 메뉴와 기본 레시피를 준비해드려요. 나중에 수정할 수 있어요.</Notice>

      <Sheet visible={picker !== null} title={picker === 'sido' ? '시·도 선택' : '시·군·구 선택'} onClose={() => setPicker(null)}>
        {options.map((option, index) => (
          <ListRow
            key={option}
            title={option}
            value={option === selected ? <CheckMark /> : undefined}
            divider={index < options.length - 1}
            onPress={() => {
              if (picker === 'sido') {
                setSido(option);
                if (option !== sido) setSigungu(sigunguOf(option)[0] ?? '');
              } else {
                setSigungu(option);
              }
              setPicker(null);
            }}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

function SelectBox({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value} 바꾸기`}
      onPress={onPress}
      style={({ pressed }) => [styles.select, pressed && styles.pressed]}
    >
      <Text style={[typography.body, styles.selectValue]} numberOfLines={1}>
        {value}
      </Text>
      <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
        <Path d="M6 9l6 6 6-6" stroke={colors.text2} strokeWidth={iconStroke} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

function IndustryCard({ name, description, selected, onPress }: { name: string; description: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${description}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
    >
      <View style={styles.cardText}>
        <Text style={typography.bodyStrong}>{name}</Text>
        <Text style={typography.caption}>{description}</Text>
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected ? (
          <Svg width={iconSize.sm} height={iconSize.sm} viewBox="0 0 24 24" fill="none">
            <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={colors.surface} strokeWidth={iconStroke * 1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : null}
      </View>
    </Pressable>
  );
}

function CheckMark() {
  return (
    <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none" accessibilityLabel="선택됨">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={colors.primary} strokeWidth={iconStroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const CHECK = iconSize.lg;

const styles = StyleSheet.create({
  field: { gap: space.s2 },
  pair: { flexDirection: 'row', gap: space.s2 },
  select: {
    flex: 1,
    minWidth: 0,
    minHeight: control.inputHeight,
    borderRadius: radius.md,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.subtle,
    paddingHorizontal: space.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  selectValue: { flex: 1, minWidth: 0 },
  cards: { gap: space.s2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: space.s4,
    minHeight: control.inputHeight + space.s4,
    borderRadius: radius.lg,
    borderWidth: lineWidth * 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  cardText: { flex: 1, minWidth: 0, gap: space.s1 },
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: radius.full,
    borderWidth: lineWidth * 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  pressed: { opacity: opacity.pressed },
  reason: { ...typography.caption, textAlign: 'center' },
  error: { ...typography.caption, color: colors.loss, textAlign: 'center' },
});
