import { ApiError } from "./types";
import type { Analytics } from "./types";
import { analytics } from "./mocks";
import type {
  Account,
  BankAccount,
  Cents,
  CompanyInfo,
  DocItem,
  Lead,
  NewsItem,
  ObjectItem,
  Operation,
  ProductRule,
  Profile,
  RequestItem,
  RequestType,
  Session,
  Strategy,
  Portfolio,
} from "./types";
import {
  account as mockAccount,
  companyInfo,
  documents as mockDocuments,
  news as mockNews,
  objectById,
  objects,
  operations as mockOperations,
  productRules,
  profile as mockProfile,
  requests as mockRequests,
  strategies as mockStrategies,
} from "./mocks";
import { accrued, earlyExitQuote, endDate, monthsBetween, shareOf, toISO } from "./calc";

/**
 * API-клиент. Сейчас отдаёт моки, но интерфейс совпадает с контрактом v1:
 * экраны не знают, откуда данные. Переключение на HTTP — правка одного файла.
 *
 * Демо-режимы состояний для проверки вёрстки: `?state=loading|error|empty|unauthorized`
 * или `localStorage.esmar-state`.
 */

const LATENCY = 320;

const params = () =>
  new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
const demoState = () => {
  try {
    return params().get("state") || localStorage.getItem("esmar-state") || "";
  } catch {
    return "";
  }
};

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

const TOKEN_KEY = "esmar-token";
const hasSession = () => {
  try {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  } catch {
    return false;
  }
};

const call = async <T>(fn: () => T, opts: { auth?: boolean } = {}): Promise<T> => {
  const state = demoState();
  if (state === "loading") await sleep(60_000);
  else await sleep(LATENCY + Math.random() * 180);

  if (state === "error") throw new ApiError("network", "Нет соединения");
  if (state === "unauthorized" || (opts.auth && !hasSession()))
    throw new ApiError("unauthorized", "Сессия истекла");
  if (state === "empty" && Array.isArray((fn as unknown as () => unknown[])())) return [] as unknown as T;

  return fn();
};

/* ------------------------------------------------------------------ */
/*  Портфель                                                           */
/* ------------------------------------------------------------------ */

const nowISO = () => toISO(new Date());

const portfolioOf = (list: Strategy[]): Portfolio => {
  const body = list.reduce((s, x) => s + x.amount, 0);
  const acc = list.reduce((s, x) => s + x.accrued, 0);
  const paid = list.reduce((s, x) => s + x.paid, 0);
  const active = list.filter((x) => x.status === "active");
  const annual = active.reduce((s, x) => s + (x.amount * x.rate) / 100, 0);
  return {
    body,
    accrued: acc,
    paid,
    income: { year: Math.round(annual), month: Math.round(annual / 12), day: Math.round(annual / 365) },
    strategies: list,
  };
};

/* ------------------------------------------------------------------ */
/*  Клиент                                                             */
/* ------------------------------------------------------------------ */

export const api = {
  /* --- вход --- */
  async requestOtp(phone: string): Promise<{ phone: string; codeTtl: number }> {
    return call(() => ({ phone, codeTtl: 300 }));
  },

  async verifyOtp(phone: string, code: string): Promise<Session> {
    return call(() => {
      if (!/^\d{6}$/.test(code)) throw new ApiError("validation", "Код из 6 цифр");
      try {
        localStorage.setItem(TOKEN_KEY, `demo-${Date.now()}`);
      } catch {
        /* приватный режим */
      }
      return { phone, name: mockProfile.name };
    });
  },

  async logout(): Promise<void> {
    return call(() => {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* noop */
      }
    });
  },

  /* --- каталог --- */
  async getProducts(): Promise<Record<string, ProductRule>> {
    return call(() => productRules);
  },

  async getObjects(): Promise<ObjectItem[]> {
    return call(() => objects);
  },

  async getObject(id: string): Promise<ObjectItem> {
    return call(() => {
      const o = objectById(id);
      if (!o) throw new ApiError("not_found", "Объект не найден");
      return o;
    });
  },

  async getNews(): Promise<NewsItem[]> {
    return call(() => mockNews);
  },

  async getCompany(): Promise<CompanyInfo> {
    return call(() => companyInfo);
  },

  async createLead(lead: Lead): Promise<{ id: string }> {
    return call(() => ({ id: `lead-${Date.now()}-${lead.phone.slice(-4)}` }));
  },

  /* --- клиент --- */
  async getMe(): Promise<Profile> {
    return call(() => mockProfile, { auth: true });
  },

  async patchMe(patch: Partial<Profile>): Promise<Profile> {
    return call(() => Object.assign(mockProfile, patch), { auth: true });
  },

  async addBankAccount(input: Omit<BankAccount, "id" | "status" | "primary">): Promise<BankAccount> {
    return call(
      () => {
        const acc: BankAccount = { ...input, id: `ba-${Date.now()}`, status: "pending", primary: false };
        mockProfile.bankAccounts = [...mockProfile.bankAccounts, acc];
        return acc;
      },
      { auth: true }
    );
  },

  async deleteBankAccount(id: string): Promise<void> {
    return call(() => {
      mockProfile.bankAccounts = mockProfile.bankAccounts.filter((b) => b.id !== id);
    }, { auth: true });
  },

  /* --- портфель --- */
  async getPortfolio(): Promise<Portfolio> {
    return call(() => portfolioOf(mockStrategies), { auth: true });
  },

  async getStrategies(): Promise<Strategy[]> {
    return call(() => mockStrategies, { auth: true });
  },

  async getStrategy(id: string): Promise<Strategy> {
    return call(() => {
      const s = mockStrategies.find((x) => x.id === id);
      if (!s) throw new ApiError("not_found", "Стратегия не найдена");
      return s;
    }, { auth: true });
  },

  async getEarlyExitQuote(id: string): Promise<Strategy["earlyExit"]> {
    return call(() => {
      const s = mockStrategies.find((x) => x.id === id);
      if (!s) throw new ApiError("not_found", "Стратегия не найдена");
      const q = earlyExitQuote(
        { amount: s.amount, rate: s.rate, startISO: s.startDate, paid: s.paid },
        nowISO()
      );
      return { availableAt: q.availableAt, available: q.available, quote: q };
    }, { auth: true });
  },

  async getAnalytics(): Promise<Analytics> {
    return call(() => analytics(), { auth: true });
  },

  /* --- счёт --- */
  async getAccount(): Promise<Account> {
    return call(() => mockAccount, { auth: true });
  },

  async getOperations(): Promise<Operation[]> {
    return call(() => mockOperations, { auth: true });
  },

  /* --- заявки --- */
  async createRequest(input: {
    type: RequestType;
    amount?: Cents;
    objectId?: string;
    note?: string;
    bankAccountId?: string;
  }): Promise<RequestItem> {
    return call(
      () => {
        const item: RequestItem = {
          id: `r-${Date.now()}`,
          type: input.type,
          title: { ru: "Новая заявка", ky: "Жаңы арыз" },
          sub: { ru: "Отправлена менеджеру", ky: "Менеджерге жөнөтүлдү" },
          createdAt: new Date().toISOString(),
          status: "new",
          statusLabel: { ru: "Новая", ky: "Жаңы" },
          queue: null,
          amount: input.amount ?? null,
        };
        mockRequests.unshift(item);
        return item;
      },
      { auth: true }
    );
  },

  async getRequests(): Promise<RequestItem[]> {
    return call(() => mockRequests, { auth: true });
  },

  async cancelRequest(id: string): Promise<void> {
    return call(() => {
      const r = mockRequests.find((x) => x.id === id);
      if (r) {
        r.status = "cancelled";
        r.statusLabel = { ru: "Отменена", ky: "Жокко чыгарылды" };
      }
    }, { auth: true });
  },

  /* --- документы --- */
  async getDocuments(): Promise<DocItem[]> {
    return call(() => mockDocuments, { auth: true });
  },

  async objectToReport(id: string, _text: string): Promise<void> {
    return call(() => {
      const d = mockDocuments.find((x) => x.id === id);
      if (d) d.status = "objection";
    }, { auth: true });
  },
};

/* ------------------------------------------------------------------ */
/*  Калькулятор — единственный расчёт, который делает фронт            */
/* ------------------------------------------------------------------ */

export type CalcInput = {
  objectId?: string;
  product: "rent" | "development" | "partnership";
  amount: Cents;
  startISO?: string;
  /** Для девелопмента — дата сдачи объекта. */
  handoverDate?: string;
};

export type CalcResult = {
  rate: number;
  months: number;
  endDate: string;
  income: Cents;
  sharePct: number;
  min: Cents;
  valid: boolean;
};

/** Расчёт для экрана оформления: сумма, целевая ставка, срок, доход. */
export const calculate = (input: CalcInput, target?: Cents): CalcResult => {
  const start = input.startISO ?? nowISO();
  const months =
    input.product === "rent"
      ? 12
      : input.product === "development" && input.handoverDate
        ? Math.max(1, monthsBetween(start, input.handoverDate))
        : 0;
  const rate =
    input.product === "rent"
      ? 15
      : input.product === "development"
        ? rateFor(input.handoverDate ? months : 0)
        : 0;
  const end = months ? endDate(start, months) : start;
  const income = months ? accrued(input.amount, rate, start, end) : 0;
  const min = input.product === "partnership" ? 1_000_000_00 : 100_00;
  return {
    rate,
    months,
    endDate: end,
    income,
    sharePct: target ? shareOf(input.amount, target) : 0,
    min,
    valid: input.amount >= min,
  };
};

const rateFor = (months: number) => {
  if (months <= 14) return 20;
  if (months <= 17) return 21.25;
  if (months <= 20) return 22.5;
  if (months <= 23) return 23.75;
  if (months <= 26) return 25;
  if (months <= 29) return 26.25;
  if (months <= 32) return 27.5;
  if (months <= 35) return 28.75;
  return 30;
};
