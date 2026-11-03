import { COMPANY, stages, products as productSeed } from "../lib/data";
import type { T } from "../lib/data";
import type { Cents, CompanyInfo, DocItem, NewsItem, ObjectItem, Operation, ProductRule, Profile, RequestItem, Strategy, Account, BankAccount } from "./types";
import { accrued, addMonths, earlyExitQuote, endDate, monthsBetween, nextPayoutDate, toISO, TAX_RATE, shareOf } from "./calc";
import { objectsSeed } from "./seed/objects";
import { newsSeed } from "./seed/news";

/**
 * Моки под контракт API v1. Живут только здесь: экраны получают данные через
 * api/client.ts, поэтому замена моков на HTTP не потребует правок интерфейса.
 */

const now = () => new Date();
const todayISO = () => toISO(now());

/** «IV квартал 2027» → 2027-12-31. Для сданных объектов — дата в прошлом. */
const quarterEnd = (label: string): string => {
  const q = label.match(/(I{1,3}|IV)\s*квартал\s*(\d{4})/i);
  if (q) {
    const map: Record<string, number> = { I: 3, II: 6, III: 9, IV: 12 };
    const month = map[q[1].toUpperCase()] ?? 12;
    const y = Number(q[2]);
    return toISO(new Date(y, month, 0));
  }
  return toISO(new Date(2025, 11, 31));
};

const termLabel = (ru: string, ky: string) => ({ ru, ky });

export const companyInfo: CompanyInfo = {
  brand: COMPANY.name,
  legalName: { ru: COMPANY.legal, ky: COMPANY.legal },
  license: {
    no: "№ 88",
    date: "07.08.2026",
    type: { ru: "Доверительное управление инвестиционными активами", ky: "Инвестициялык активдерди ишенимдүү башкаруу" },
  },
  regNo: "328723-3301-ООО",
  inn: "03004202610201",
  okpo: "34904871",
  legalAddress: { ru: "г. Бишкек, ул. Таш-Кумырская, 9", ky: "Бишкек ш., Таш-Кумыр көч., 9" },
  officeAddress: COMPANY.address,
  phone: COMPANY.phone,
  whatsapp: COMPANY.whatsapp,
  email: COMPANY.email,
  site: COMPANY.site,
  hours: COMPANY.hours,
};

/* ------------------------------------------------------------------ */
/*  Продукты                                                           */
/* ------------------------------------------------------------------ */

export const productRules: Record<string, ProductRule> = {
  rent: {
    ...productSeed.rent,
    max: null,
    consultOnly: false,
  },
  development: {
    ...productSeed.development,
    max: null,
    consultOnly: false,
  },
  partnership: {
    ...productSeed.partnership,
    max: null,
    consultOnly: true,
    term: { ru: "индивидуально, до 30 месяцев", ky: "жекече, 30 айга чейин" },
    rateNote: { ru: "целевая до 55% годовых", ky: "максаттуу жылына 55%га чейин" },
  },
};

/* ------------------------------------------------------------------ */
/*  Объекты                                                            */
/* ------------------------------------------------------------------ */

const riskText = (product: ObjectItem["product"]) =>
  product === "rent"
    ? {
        ru: "Доход зависит от загрузки объекта арендаторами: простой площадей, снижение рыночных ставок или досрочный выезд арендатора уменьшают фактическую выплату.",
        ky: "Киреше объектинин ижарачылар менен толтурулушуна көз каранды: аянттардын бош болушу, рыноктук ченемдердин төмөндөшү же ижарачынын эрте кетиши фактылык төлөмдү азайтат.",
      }
    : {
        ru: "Сроки и стоимость строительства могут меняться, ввод объекта может задержаться. Целевая доходность не гарантирована: если объект принесёт меньше, выплачивается фактический доход.",
        ky: "Курулуштун мөөнөтү жана баасы өзгөрүшү мүмкүн, объект киргизилүүсү кечигиши ыктымал. Максаттуу киреше кепилденбейт: объект азыраак киреше алып келсе, фактылык киреше төлөнөт.",
      };

export const objects: ObjectItem[] = objectsSeed.map((o) => {
  const handoverDate = quarterEnd(o.handover.ru);
  const dev = o.product === "development";
  const months = dev ? monthsBetween(todayISO(), handoverDate) : null;
  const rate = dev ? devRateForLocal(months ?? 0) : 15;

  return {
    ...o,
    /* суммы в сиде — в долларах, в API — в центах */
    min: Math.round(o.min * 100),
    raised: Math.round(o.raised * 100),
    target: Math.round(o.target * 100),
    handoverDate,
    monthsToHandover: months,
    rate,
    term: dev
      ? termLabel(`${months} мес.`, `${months} ай`)
      : termLabel("от 12 мес.", "12 айдан"),
    payout:
      o.product === "rent"
        ? { ru: "ежемесячно", ky: "ай сайын" }
        : { ru: "в конце срока", ky: "мөөнөт аягында" },
    risks: riskText(o.product),
    status: "open" as const,
    marks: [] as ObjectItem["marks"],
  };
});

/* Метки витрины считаются по данным: популярность — по собранной сумме. */
const popularity = [...objects].sort((a, b) => b.raised - a.raised).map((o) => o.id);
objects.forEach((o) => {
  const marks: ObjectItem["marks"] = [];
  if (o.target && o.raised / o.target >= 0.95) marks.push("final");
  if (o.id === popularity[0]) marks.push("popular");
  if (o.id === popularity[1]) marks.push("choice");
  o.marks = marks;
});

/** локальная копия шкалы, чтобы не тянуть цикл импортов */
function devRateForLocal(months: number): number {
  if (months <= 14) return 20;
  if (months <= 17) return 21.25;
  if (months <= 20) return 22.5;
  if (months <= 23) return 23.75;
  if (months <= 26) return 25;
  if (months <= 29) return 26.25;
  if (months <= 32) return 27.5;
  if (months <= 35) return 28.75;
  return 30;
}

export const objectById = (id: string) => objects.find((o) => o.id === id);

export const objectProducts = (o: ObjectItem) => [o.product, ...(o.extra ?? [])];

export { shareOf, stages };

/* ------------------------------------------------------------------ */
/*  Новости                                                            */
/* ------------------------------------------------------------------ */

export const news: NewsItem[] = newsSeed.map((n, i) => ({
  ...n,
  id: `n-${i + 1}`,
  about: Boolean(n.about),
}));

/* ------------------------------------------------------------------ */
/*  Портфель клиента                                                   */
/* ------------------------------------------------------------------ */

type Seed = {
  no: string;
  objectId: string;
  product: Strategy["product"];
  amount: number;
  rate: number;
  start: string;
  term: number;
};

const strategySeeds: Seed[] = [
  { no: "ES-2026-0114", objectId: "manas", product: "rent", amount: 5000, rate: 15, start: "2026-02-12", term: 12 },
  { no: "ES-2026-0137", objectId: "ankara1", product: "development", amount: 12000, rate: 25, start: "2026-04-03", term: 32 },
  { no: "ES-2026-0208", objectId: "sirius", product: "development", amount: 3000, rate: 21.25, start: "2026-08-21", term: 16 },
  { no: "ES-2026-0171", objectId: "domra", product: "development", amount: 8000, rate: 30, start: "2026-06-15", term: 42 },
  { no: "ES-2026-0241", objectId: "talisman", product: "rent", amount: 1200, rate: 15, start: "2026-09-30", term: 12 },
];

const buildStrategy = (s: Seed): Strategy => {
  const amount: Cents = s.amount * 100;
  const today = todayISO();
  const end = endDate(s.start, s.term);
  const till = end < today ? end : today;
  const acc = accrued(amount, s.rate, s.start, till);
  const monthsPassed = Math.min(
    s.term,
    monthsBetween(s.start, till) + (till >= end ? 1 : 0)
  );
  const monthly = Math.round((amount * s.rate) / 100 / 12);
  const paidGross = s.product === "rent" ? monthly * monthsPassed : end < today ? acc : 0;
  const tax = Math.round(paidGross * TAX_RATE);
  const paid = paidGross - tax;
  const quote = earlyExitQuote({ amount, rate: s.rate, startISO: s.start, paid }, today);

  return {
    id: `st-${s.no}`,
    no: s.no,
    objectId: s.objectId,
    product: s.product,
    amount,
    currency: "USD",
    rate: s.rate,
    startDate: s.start,
    endDate: end,
    termMonths: s.term,
    status: "active",
    accrued: acc,
    paid,
    value: amount + acc,
    tax,
    nextPayoutDate: s.product === "rent" ? nextPayoutDate(s.start, today, s.term) : null,
    earlyExit: { availableAt: quote.availableAt, available: quote.available, quote },
  };
};

export const strategies: Strategy[] = strategySeeds.map(buildStrategy);

/* ------------------------------------------------------------------ */
/*  Личный счёт                                                        */
/* ------------------------------------------------------------------ */

export const account: Account = {
  balance: 184_000,
  available: 184_000,
  blocked: 0,
  clientNo: "ES-10428",
  currency: "USD",
  requisites: {
    bank: { ru: "ОАО «Банк-партнёр»", ky: "«Өнөктөш банк» ААК" },
    account: "1280 0000 1234 5678",
    inn: "03004202610201",
    bik: "128001",
    purpose: {
      ru: "Пополнение личного счёта по договору доверительного управления. Укажите номер клиента ES-10428.",
      ky: "Ишенимдүү башкаруу келишими боюнча жеке эсепти толуктоо. ES-10428 кардар номерин көрсөтүңүз.",
    },
    qrPayload: "https://esmar.kg/pay?client=ES-10428",
  },
};

export const bankAccounts: BankAccount[] = [
  {
    id: "ba-1",
    bank: { ru: "Бакай Банк", ky: "Бакай Банк" },
    masked: "•••• 4471",
    currency: "USD",
    owner: "Токтогулов Айбек",
    status: "confirmed",
    primary: true,
  },
  {
    id: "ba-2",
    bank: { ru: "Оптима Банк", ky: "Оптима Банк" },
    masked: "•••• 9082",
    currency: "KGS",
    owner: "Токтогулов Айбек",
    status: "pending",
    primary: false,
  },
];

export const profile: Profile = {
  phone: "+996 555 12 34 56",
  name: "Айбек Токтогулов",
  email: "investor@esmar.kg",
  kyc: "verified",
  manager: { name: "Бекжан", phone: "+996 222 111 114" },
  autoWithdrawRent: false,
  bankAccounts,
  consentVersion: "2026-11-01",
};

/* ------------------------------------------------------------------ */
/*  Операции                                                           */
/* ------------------------------------------------------------------ */

const op = (
  id: string,
  type: Operation["type"],
  title: Operation["title"],
  sub: Operation["sub"],
  date: string,
  amount: Cents,
  status: Operation["status"] = "done"
): Operation => ({ id, type, title, sub, date, amount, status });

export const operations: Operation[] = [
  op("op-1", "topup", { ru: "Пополнение счёта", ky: "Эсепти толуктоо" }, { ru: "Перевод на счёт ДУ", ky: "ДУ эсебине которуу" }, "2026-10-28", 240_000),
  op("op-2", "payout", { ru: "ТЦ Манас", ky: "ТЦ Манас" }, { ru: "Выплата дохода по Ренте", ky: "Ижара боюнча киреше төлөмү" }, "2026-10-12", 5_200),
  op("op-3", "invest", { ru: "ТЦ Манас", ky: "ТЦ Манас" }, { ru: "Вложение в объект", ky: "Объектиге салым" }, "2026-02-12", -500_000),
  op("op-4", "payout", { ru: "Коттедж «Талисман»", ky: "«Талисман» коттеджи" }, { ru: "Выплата дохода по Ренте", ky: "Ижара боюнча киреше төлөмү" }, "2026-10-30", 1_300),
  op("op-5", "withdraw", { ru: "Вывод на карту", ky: "Картага чыгаруу" }, { ru: "Заявка одобрена", ky: "Арыз жактырылды" }, "2026-09-21", -120_000),
  op("op-6", "topup", { ru: "Пополнение счёта", ky: "Эсепти толуктоо" }, { ru: "Ожидаем поступление", ky: "Түшүүнү күтөбүз" }, "2026-10-31", 50_000, "pending"),
];

/* ------------------------------------------------------------------ */
/*  Документы и заявки                                                 */
/* ------------------------------------------------------------------ */

export const documents: DocItem[] = [
  {
    id: "d-1",
    kind: "contract",
    title: { ru: "Договор доверительного управления № ES-2026-0114", ky: "Ишенимдүү башкаруу келишими № ES-2026-0114" },
    date: "2026-02-12",
    status: "accepted",
    contractNo: "ES-2026-0114",
    fileUrl: "#",
  },
  {
    id: "d-2",
    kind: "appendix",
    title: { ru: "Приложение № 2 — стратегия «Рента»", ky: "№ 2 тиркеме — «Ижара» стратегиясы" },
    date: "2026-02-12",
    status: "accepted",
    contractNo: "ES-2026-0114",
    fileUrl: "#",
  },
  {
    id: "d-3",
    kind: "report",
    title: { ru: "Ежемесячный отчёт за октябрь 2026", ky: "2026-жылдын октябры үчүн айлык отчёт" },
    date: "2026-11-03",
    status: "new",
    objectionDaysLeft: 8,
    contractNo: "ES-2026-0114",
    fileUrl: "#",
  },
  {
    id: "d-4",
    kind: "report",
    title: { ru: "Ежемесячный отчёт за сентябрь 2026", ky: "2026-жылдын сентябры үчүн айлык отчёт" },
    date: "2026-10-04",
    status: "accepted",
    contractNo: "ES-2026-0137",
    fileUrl: "#",
  },
  {
    id: "d-5",
    kind: "act",
    title: { ru: "Акт выполненных работ за октябрь 2026", ky: "2026-жылдын октябры үчүн аткарылган иштердин актысы" },
    date: "2026-10-31",
    status: "accepted",
    contractNo: "ES-2026-0137",
    fileUrl: "#",
  },
  {
    id: "d-6",
    kind: "statement",
    title: { ru: "Справка об удержанном налоге за 2026 год", ky: "2026-жыл үчүн кармалган салык боюнча маалымдама" },
    date: "2026-10-15",
    status: "accepted",
    fileUrl: "#",
  },
];

export const requests: RequestItem[] = [
  {
    id: "r-1",
    type: "invest",
    title: { ru: "Вложение в ЖК Анкара II", ky: "«Анкара II» турак жай комплексине салым" },
    sub: { ru: "$1 000 · 20% годовых", ky: "$1 000 · жылына 20%" },
    createdAt: "2026-11-01T10:24:00+06:00",
    status: "docs_ready",
    statusLabel: { ru: "Документы готовы", ky: "Документтер даяр" },
    queue: null,
    amount: 100_000,
  },
  {
    id: "r-2",
    type: "withdraw",
    title: { ru: "Вывод на счёт", ky: "Эсепке чыгаруу" },
    sub: { ru: "Бакай Банк · •••• 4471", ky: "Бакай Банк · •••• 4471" },
    createdAt: "2026-10-30T16:05:00+06:00",
    status: "approved",
    statusLabel: { ru: "Одобрено, платёж до 3 рабочих дней", ky: "Жактырылды, төлөм 3 жумуш күнүнө чейин" },
    queue: null,
    amount: 50_000,
  },
  {
    id: "r-3",
    type: "early_exit",
    title: { ru: "Досрочный выход · ES-2026-0241", ky: "Мөөнөтүнөн мурун чыгуу · ES-2026-0241" },
    sub: { ru: "Заявление принято", ky: "Арыз кабыл алынды" },
    createdAt: "2026-10-26T09:12:00+06:00",
    status: "in_progress",
    statusLabel: { ru: "В очереди", ky: "Кезекте" },
    queue: 2,
    amount: 120_000,
  },
];


/* ------------------------------------------------------------------ */
/*  Аналитика                                                          */
/* ------------------------------------------------------------------ */

export const analytics = () => {
  const list = strategies;
  const body = list.reduce((sum, x) => sum + x.amount, 0);
  const accruedSum = list.reduce((sum, x) => sum + x.accrued, 0);
  const paid = list.reduce((sum, x) => sum + x.paid, 0);
  const annual = list.reduce((sum, x) => sum + (x.amount * x.rate) / 100, 0);

  const group = (key: (id: string) => T): { name: T; value: number }[] => {
    const map = new Map<string, { name: T; value: number }>();
    for (const st of list) {
      const name = key(st.objectId);
      const prev = map.get(name.ru);
      map.set(name.ru, { name, value: (prev?.value ?? 0) + st.amount + st.accrued });
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  };

  const series = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (11 - i));
    const iso = toISO(d);
    const value = list.reduce((sum, x) => sum + accrued(x.amount, x.rate, x.startDate, iso), 0);
    return {
      label: d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "").slice(0, 3),
      value,
    };
  });

  return {
    total: body + accruedSum,
    accrued: accruedSum,
    paid,
    avgRate: body ? list.reduce((sum, x) => sum + x.rate * x.amount, 0) / body : 0,
    contracts: list.length,
    income: { year: Math.round(annual), month: Math.round(annual / 12), day: Math.round(annual / 365) },
    groups: {
      object: group((id) => objectById(id)?.name ?? { ru: id, ky: id }),
      product: group((id) => productRules[objectById(id)?.product ?? "rent"].name),
      city: group((id) => objectById(id)?.city ?? { ru: "—", ky: "—" }),
    },
    series,
  };
};

export { addMonths };
