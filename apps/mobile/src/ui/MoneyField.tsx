import { TextField, type TextFieldProps } from './TextField';

export type MoneyFieldProps = Omit<TextFieldProps, 'value' | 'onChangeText' | 'keyboardType' | 'suffix'> & {
  /** Integer won, or null while the field is empty (never auto-filled with 0). */
  value: number | null;
  onChangeValue: (value: number | null) => void;
  /** Default "원". */
  suffix?: string;
};

function withCommas(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** TextField for won amounts: shows "90,000", reports 90000; right aligned with a "원" suffix. */
export function MoneyField({ value, onChangeValue, suffix = '원', align = 'right', ...field }: MoneyFieldProps) {
  return (
    <TextField
      {...field}
      align={align}
      suffix={suffix}
      keyboardType="number-pad"
      value={value === null ? '' : withCommas(value)}
      onChangeText={(text) => {
        const digits = text.replace(/\D/g, '');
        onChangeValue(digits === '' ? null : Number(digits));
      }}
    />
  );
}
