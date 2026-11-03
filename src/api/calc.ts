import type { Cents } from "./types";

/**
 * Правила расчёта из ДДУ и Приложения №2. Единственный источник формул для
 * моков и калькулятора: на боевом бэкенде те же формулы дают те же числа.
 *
 * Деньги — в центах. Ставка — % годовых. Даты — ISO (YYYY-MM-DD).
 */

export const DAY = 86_400_000;
export const TAX_RATE = 0.1;

/** Шкала ставок Девелопмента: полных месяцев до плановой сдачи → ставка. */
export const DEV_RATE_TABLE: { upTo: number; rate: number }[] = [
  { upTo: 14, rate: 20 },
  { upTo: 17, rate: 21.25 },
  { upTo: 20, rate: 22.5 },
  { upTo: 23, rate: 23.75 },
  { upTo: 26, rate: 25 },
  { upTo: 29, rate: 26.25 },
  { upTo: 32, rate: 27.5 },
  { upTo: 35, rate: 28.75 },
  { upTo: Infinity, rate: 30 },
];

/** Ставка по числу полных месяцев до сдачи. */
export const devRateFor = (months: number) =>
  DEV_RATE_TABLE.find((row) => months <= row.upTo)?.rate ?? 30;

/** Полных месяцев между датами: дни отбрасываются. */
export const monthsBetween = (fromISO: string, toISO: string) => {
  const a = new Date(`${fromISO.slice(0, 10)}T00:00:00`);
  const b = new Date(`${toISO.slice(0, 10)}T00:00:00`);
  if (b <= a) return 0;
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(0, b.getDate() < a.getDate() ? months - 1 : months);
};

/** Добавить месяцы к дате (для дат выплат и окончания срока). */
export const addMonths = (iso: string, months: number) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d;
};

/** Выходной → следующий рабочий день. */
export const businessDay = (d: Date) => {
  const x = new Date(d);
  while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + 1);
  return x;
};

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Дней начисления: день зачисления включаем, день возврата — нет. */
export const accrueDays = (fromISO: string, toISO: string) =>
  Math.max(0, Math.floor((new Date(`${toISO.slice(0, 10)}T00:00:00`).getTime() - new Date(`${fromISO.slice(0, 10)}T00:00:00`).getTime()) / DAY));

/** Расчётный доход: простые проценты, база 365, округление до цента. */
export const accrued = (amount: Cents, rate: number, fromISO: string, toISO: string) =>
  Math.round((amount * rate * accrueDays(fromISO, toISO)) / 100 / 365);

/** Дата окончания стратегии: старт + срок в месяцах. */
export const endDate = (startISO: string, months: number) => toISO(addMonths(startISO, months));

/**
 * Дата очередной выплаты по «Ренте»: в число даты зачисления; если такого
 * числа в месяце нет — последний день месяца; выходной — следующий рабочий.
 */
export const nextPayoutDate = (startISO: string, nowISO: string, termMonths = 12) => {
  const start = new Date(`${startISO.slice(0, 10)}T00:00:00`);
  const now = new Date(`${nowISO.slice(0, 10)}T00:00:00`);
  let i = 1;
  while (i <= termMonths) {
    const y = start.getFullYear();
    const m = start.getMonth() + i;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const d = new Date(y, m, Math.min(start.getDate(), lastDay));
    if (d > now) return toISO(businessDay(d));
    i += 1;
  }
  return null;
};

export type EarlyExitInput = {
  amount: Cents;
  rate: number;
  startISO: string;
  /** Уже выплачено клиенту (net), центы. */
  paid: Cents;
};

export type EarlyExitQuote = {
  amount: Cents;
  recalculated: Cents;
  paid: Cents;
  tax: Cents;
  refund: Cents;
  months: number;
  availableAt: string;
  available: boolean;
};

/**
 * Досрочный выход по ДДУ (Приложение №2, п. 10):
 *  • не раньше 3 календарных месяцев с даты зачисления;
 *  • доход пересчитывается по половине ставки за полные месяцы;
 *  • к возврату = тело + пересчитанный доход − выплачено − налог;
 *  • переплата по «Ренте» удерживается из суммы (формула даёт это сама);
 *  • деньги возвращаются в срок до 30 календарных дней.
 */
export const earlyExitQuote = (
  { amount, rate, startISO, paid }: EarlyExitInput,
  nowISO: string,
  taxRate = TAX_RATE
): EarlyExitQuote => {
  const availableAt = toISO(addMonths(startISO, 3));
  const available = new Date(`${nowISO}T00:00:00`) >= new Date(`${availableAt}T00:00:00`);
  const months = Math.min(monthsBetween(startISO, nowISO), 12 * 50);
  const recalculated = Math.round((amount * (rate * 0.5) * months) / 100 / 12);
  const tax = Math.round(recalculated * taxRate);
  return {
    amount,
    recalculated,
    paid,
    tax,
    refund: amount + recalculated - paid - tax,
    months,
    availableAt,
    available,
  };
};

/** Доля клиента в общем объёме инвестиций объекта. */
export const shareOf = (amount: Cents, target: Cents) => (target ? (amount / target) * 100 : 0);
