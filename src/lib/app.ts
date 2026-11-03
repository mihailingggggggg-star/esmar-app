import { createContext, useContext } from "react";
import type { Lang, T } from "./data";
import type { CompanyInfo, ProductRule, Profile, Session } from "../api/types";

export type Theme = "light" | "dark";

export type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** Сессия по телефону + SMS-коду. null — гостевая зона. */
  session: Session | null;
  profile: Profile | null;
  signIn: (s: Session) => void;
  signOut: () => void;
  /** Правила продуктов и карточка компании — нужны почти всем экранам. */
  products: Record<string, ProductRule>;
  company: CompanyInfo | null;
  /** Счётчик изменений: после заявки/платежа списки перезапрашиваются. */
  version: number;
  bump: () => void;
  /** Обновить профиль после правок (язык, автовывод, счета). */
  setProfile: (p: Profile | null) => void;
};

export const AppCtx = createContext<Ctx>({
  lang: "ru",
  setLang: () => {},
  theme: "light",
  setTheme: () => {},
  session: null,
  profile: null,
  signIn: () => {},
  signOut: () => {},
  products: {},
  company: null,
  version: 0,
  bump: () => {},
  setProfile: () => {},
});

export const useApp = () => useContext(AppCtx);
export const useT = () => {
  const { lang } = useApp();
  return (t: T) => t?.[lang] ?? "";
};

/* ------------------------------------------------------------------ */
/*  Форматирование                                                     */
/* ------------------------------------------------------------------ */

const nf = new Intl.NumberFormat("ru-RU");

/** Деньги: на входе центы, на выходе «$5 000» (или с копейками). */
export const money = (cents: number, frac = 0) =>
  "$" +
  (cents / 100).toLocaleString("ru-RU", { minimumFractionDigits: frac, maximumFractionDigits: frac });

/** Суммы в сомах — эквивалент по курсу НБКР (в моках курс фиксированный). */
export const som = (cents: number) => `${Math.round((cents / 100) * 89.5).toLocaleString("ru-RU")} с`;

export const num = (v: number) => nf.format(v);

export const pct = (v: number, sign = true) =>
  `${sign && v > 0 ? "+" : ""}${v.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%`;

/** Число с фиксированной точностью в русской записи: 23,7 (а не 23.7). */
export const fixed = (v: number, digits = 1) =>
  v.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const shortDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

export const longDate = (iso: string, lang: Lang = "ru") => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang === "ky" ? "ky-KG" : "ru-RU", { day: "numeric", month: "long", year: "numeric" });
};

export const timeOf = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** «1 месяц», «2 месяца», «5 месяцев» */
export const monthsWord = (n: number) => {
  const t = Math.abs(n) % 100;
  const u = t % 10;
  if (t > 10 && t < 20) return "месяцев";
  if (u === 1) return "месяц";
  if (u >= 2 && u <= 4) return "месяца";
  return "месяцев";
};

/** «1 день», «2 дня», «232 дня» */
export const daysWord = (n: number) => {
  const t = Math.abs(n) % 100;
  const u = t % 10;
  if (t > 10 && t < 20) return "дней";
  if (u === 1) return "день";
  if (u >= 2 && u <= 4) return "дня";
  return "дней";
};

/** Копирование в буфер с фолбэком для старых веб-вью. */
export const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/** «1 договор», «2 договора», «5 договоров» — по числу стратегий. */
export const contractsWord = (n: number, lang: Lang = "ru") => {
  if (lang === "ky") return `${n} келишим`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "договор"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "договора"
        : "договоров";
  return `${n} ${word}`;
};
