import type { BaseUnit, Unit, Won } from './types';

export function unitLabel(unit: Unit): string {
  return unit === 'ea' ? '개' : unit;
}

export function formatWon(value: Won): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

export function formatQty(value: number, unit: Unit): string {
  return `${value}${unitLabel(unit)}`;
}

export function formatUnitPrice(price: number, baseUnit: BaseUnit): string {
  return baseUnit === 'ea'
    ? `개당 ${formatWon(Math.round(price))}`
    : `100${baseUnit}당 ${formatWon(Math.round(price * 100))}`;
}

export function formatDateKo(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

export function formatDateFull(date: string): string {
  return date.replaceAll('-', '.');
}
