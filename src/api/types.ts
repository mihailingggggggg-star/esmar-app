import type { Lang, ProductId, T } from "../lib/data";

/**
 * Типы домена приложения. Суммы — целые центы + код валюты (по контракту API),
 * даты — ISO со часовым поясом Бишкека.
 */

export type Cents = number;
export type Currency = "USD" | "KGS";

/** Компания: реквизиты и контакты для экрана «О компании» и профиля. */
export type CompanyInfo = {
  brand: string;
  legalName: T;
  license: { no: string; date: string; type: T };
  regNo: string;
  inn: string;
  okpo: string;
  legalAddress: T;
  officeAddress: T;
  phone: string;
  whatsapp: string;
  email: string;
  site: string;
  hours: T;
};

/** Правила продукта (не код — настройка). */
export type ProductRule = {
  id: ProductId;
  name: T;
  min: Cents;
  /** Максимума нет — null. */
  max: Cents | null;
  payout: T;
  term: T;
  short: T;
  about: T;
  steps: T[];
  /** Партнёрство: только заявка менеджеру, без расчётов в приложении. */
  consultOnly: boolean;
  /** Текст ставки для витрины партнёрства («целевая до 55%»). */
  rateNote?: T;
  /** Ставка для продуктов с фиксированной ставкой (Рента — 15%). */
  rate?: number;
  upTo?: boolean;
};

export type Fact = { k: T; v: string };

/** Объект инвестирования. Ставка и срок здесь — на сегодня (пересчитываются). */
export type ObjectItem = {
  id: string;
  name: T;
  product: ProductId;
  extra?: ProductId[];
  city: T;
  kind: T;
  address: T;
  area: string;
  img: string;
  photos?: string[];
  min: Cents;
  /** Расчётная (целевая) ставка на сегодня, % годовых. */
  rate: number;
  /** Полных месяцев до плановой сдачи (для Девелопмента). */
  monthsToHandover: number | null;
  term: T;
  payout: T;
  raised: Cents;
  target: Cents;
  progress: number;
  stage: number;
  handover: T;
  handoverDate: string;
  about: T;
  risks: T;
  facts: Fact[];
  status: "open" | "closed";
  /** Метки витрины: их считает бэкенд по данным CRM. */
  marks: ("final" | "popular" | "choice")[];
};

export type NewsItem = {
  id: string;
  date: string;
  source: string;
  url: string;
  img: string;
  title: T;
  text: T;
  tag: T;
  about: boolean;
};

/** Стратегия — Приложение №2 к договору ДУ. */
export type Strategy = {
  id: string;
  /** Номер Приложения №2 — присваивает CRM, не приложение. */
  no: string;
  objectId: string;
  product: ProductId;
  amount: Cents;
  currency: Currency;
  /** Ставка зафиксирована на дату Приложения. */
  rate: number;
  startDate: string;
  endDate: string;
  termMonths: number;
  status: "active" | "finished" | "early_exit";
  /** Расчётный доход по целевой ставке, центы. */
  accrued: Cents;
  /** Фактически выплачено (из CRM), центы. */
  paid: Cents;
  /** Тело + расчётный доход. */
  value: Cents;
  /** Налог, удержанный при выплате, центы. */
  tax: Cents;
  nextPayoutDate: string | null;
  earlyExit: {
    availableAt: string;
    available: boolean;
    /** Предварительный расчёт выхода (без учёта очереди). */
    quote: {
      amount: Cents;
      recalculated: Cents;
      paid: Cents;
      tax: Cents;
      refund: Cents;
    };
  };
};

export type OperationType = "topup" | "invest" | "payout" | "refund" | "tax" | "withdraw";

export type Operation = {
  id: string;
  type: OperationType;
  title: T;
  sub: T;
  date: string;
  /** Со знаком: пополнение и доход — плюс, вложение и вывод — минус. */
  amount: Cents;
  status: "done" | "pending" | "rejected";
};

export type BankAccount = {
  id: string;
  bank: T;
  masked: string;
  currency: Currency;
  owner: string;
  status: "pending" | "confirmed";
  primary: boolean;
};

export type Account = {
  balance: Cents;
  available: Cents;
  blocked: Cents;
  clientNo: string;
  currency: Currency;
  requisites: {
    bank: T;
    account: string;
    inn: string;
    bik: string;
    purpose: T;
    qrPayload: string;
  };
};

export type DocKind = "contract" | "appendix" | "report" | "act" | "statement";

export type DocItem = {
  id: string;
  kind: DocKind;
  title: T;
  date: string;
  status: "new" | "objection" | "accepted";
  /** Для отчёта: сколько дней осталось на замечания. */
  objectionDaysLeft?: number;
  contractNo?: string;
  fileUrl: string;
};

export type RequestType =
  | "meeting"
  | "invest"
  | "partnership"
  | "withdraw"
  | "early_exit"
  | "prolong"
  | "report_objection"
  | "bank_account"
  | "data_change";

export type RequestStatus =
  | "new"
  | "in_progress"
  | "docs_ready"
  | "awaiting_signature"
  | "awaiting_payment"
  | "active"
  | "approved"
  | "paid"
  | "done"
  | "rejected"
  | "cancelled";

export type RequestItem = {
  id: string;
  type: RequestType;
  title: T;
  sub: T;
  createdAt: string;
  status: RequestStatus;
  statusLabel: T;
  /** Позиция в очереди на досрочный выход. */
  queue: number | null;
  amount: Cents | null;
};

export type KycStatus = "none" | "pending" | "verified" | "rejected";

export type Manager = { name: string; phone: string; photo?: string };

export type Profile = {
  phone: string;
  name: string;
  email: string;
  kyc: KycStatus;
  manager: Manager;
  autoWithdrawRent: boolean;
  bankAccounts: BankAccount[];
  consentVersion: string;
};

export type Session = {
  phone: string;
  name: string;
};

export type Portfolio = {
  body: Cents;
  accrued: Cents;
  paid: Cents;
  /** Расчётный доход по целевой ставке за период. */
  income: { year: Cents; month: Cents; day: Cents };
  strategies: Strategy[];
};

export type Lead = {
  name: string;
  phone: string;
  amount: Cents | null;
  format: "office" | "video" | "call";
  time: string;
  source: string;
  utm?: string;
};

/** Ошибка API: чтобы экраны умели показывать «нет сети» и «сессия истекла». */
export class ApiError extends Error {
  code: "network" | "unauthorized" | "not_found" | "validation";
  constructor(code: ApiError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export type { Lang, ProductId, T };

export type AnalyticsRow = { name: T; value: Cents };

export type Analytics = {
  total: Cents;
  accrued: Cents;
  paid: Cents;
  avgRate: number;
  contracts: number;
  income: { year: Cents; month: Cents; day: Cents };
  groups: { object: AnalyticsRow[]; product: AnalyticsRow[]; city: AnalyticsRow[] };
  /** Накопленные начисления по месяцам (последние 12). */
  series: { label: string; value: Cents }[];
};
