import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, ChevronDown, Lock } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis } from "recharts";
import { api } from "../api/client";
import { useQuery } from "../api/hooks";
import { contractsWord, fixed, money, useApp, useT } from "../lib/app";
import { ui } from "../lib/data";
import { Seg } from "../components/Seg";
import { ErrorState, Loading } from "../components/kit";
import type { IncomePeriod } from "../components/Income";

const PALETTE = ["#2b3a1e", "#4a663a", "#6f8f55", "#96b177", "#c1d2a9", "#e0d2b8"];

/**
 * Аналитика: структура портфеля (объекты / продукты / города), расчётный доход
 * по целевой ставке с выбором периода и динамика начислений. Все значения —
 * из API, фронт только рисует.
 */

/** Доли в процентах, которые в сумме дают ровно 100 (метод наибольших остатков). */
function shares(values: number[]): number[] {
  const total = values.reduce((s, v) => s + v, 0);
  if (!total) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const floor = raw.map(Math.floor);
  let rest = 100 - floor.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  const out = [...floor];
  for (const o of order) {
    if (rest <= 0) break;
    out[o.i] += 1;
    rest -= 1;
  }
  return out;
}

export function Stats({ onVerification, onBack }: { onVerification: () => void; onBack: () => void }) {
  const t = useT();
  const { lang, session } = useApp();
  const [group, setGroup] = useState<"object" | "product" | "city">("object");
  const [period, setPeriod] = useState<IncomePeriod>("day");
  const { data, loading, error, reload } = useQuery(() => api.getAnalytics(), [session?.phone]);
  const [months, setMonths] = useState(12);

  const rows = data?.groups[group] ?? [];
  const total = data?.total ?? 0;
  const series = useMemo(() => (data?.series ?? []).slice(-months), [data, months]);
  const peak = Math.max(...series.map((s) => s.value), 1);

  const periodLabel: Record<IncomePeriod, string> = {
    year: t(ui.inYear),
    month: t(ui.anPerMonth),
    day: t(ui.inDay),
  };

  if (!session) {
    return (
      <div className="screen">
        <header className="an__top">
          <button className="an__round" onClick={onBack} type="button" aria-label={t(ui.back)}>
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
          <span className="an__title">{t(ui.tabStats)}</span>
          <span />
        </header>
        <div className="pad" style={{ marginTop: 16 }}>
          <div className="cat__empty">
            <Lock size={22} strokeWidth={2} />
            <b>{t(ui.guestLocked)}</b>
            <span>{t(ui.kycWhyShort)}</span>
            <button className="btn btn--p btn--sm" onClick={onVerification} type="button" style={{ marginTop: 6 }}>
              {t(ui.signIn)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="an__top">
        <button className="an__round" onClick={onBack} type="button" aria-label={t(ui.back)}>
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <span className="an__title">{t(ui.tabStats)}</span>
        <button
          className="an__round"
          onClick={() => setMonths((m) => (m === 12 ? 6 : 12))}
          type="button"
          aria-label={t(ui.anDynamics)}
        >
          <CalendarDays size={17} strokeWidth={2} />
        </button>
      </header>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <>
          <div className="an__seg">
            <Seg
              value={group}
              name="an-group"
              wide
              small
              onChange={setGroup}
              options={[
                { v: "object" as const, label: t(ui.anByObject) },
                { v: "product" as const, label: t(ui.anByProduct) },
                { v: "city" as const, label: t(ui.anByCity) },
              ]}
            />
          </div>

          <div className="an__head">
            <h2>{t(ui.anStructure)}</h2>
          </div>

          <div className="an__donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows.map((r) => ({ name: t(r.name), value: r.value / 100 }))}
                  dataKey="value"
                  innerRadius="63%"
                  outerRadius="94%"
                  paddingAngle={3}
                  cornerRadius={7}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  isAnimationActive
                  animationDuration={700}
                >
                  {rows.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="an__center">
              <b className="tnum">{money(total)}</b>
              <span>{t(ui.anInPortfolio)}</span>
            </div>
          </div>

          <div className="an__legend">
            {rows.map((r, i) => (
              <div className="an__leg" key={t(r.name)}>
                <span className="an__dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="an__leg-n">{t(r.name)}</span>
                <b className="tnum">{shares(rows.map((x) => x.value))[i]}%</b>
              </div>
            ))}
          </div>

          <motion.div
            className="card an__income"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="card__top">
              <span className="card__k">{t(ui.calcIncomeTitle)}</span>
              <Seg
                name="an-income"
                small
                value={period}
                onChange={setPeriod}
                options={[
                  { v: "year" as IncomePeriod, label: t(ui.perYearShort) },
                  { v: "month" as IncomePeriod, label: t(ui.perMonthShort) },
                  { v: "day" as IncomePeriod, label: t(ui.perDayShort) },
                ]}
              />
            </div>

            <div className="card__main">
              <b className="tnum">{money(data.income[period], period === "day" ? 2 : 0)}</b>
              <span>{periodLabel[period]}</span>
            </div>

            <dl className="card__grid">
              <div>
                <dt>{t(ui.inYear)}</dt>
                <dd className="tnum">{money(data.income.year)}</dd>
              </div>
              <div>
                <dt>{t(ui.anPerMonth)}</dt>
                <dd className="tnum">{money(data.income.month)}</dd>
              </div>
              <div>
                <dt>{t(ui.inDay)}</dt>
                <dd className="tnum">{money(data.income.day, 2)}</dd>
              </div>
            </dl>

            <div className="card__foot">
              <span className="tnum">
                {fixed(data.avgRate)}% {t(ui.perYear)}
              </span>
              <span>{contractsWord(data.contracts, lang)}</span>
            </div>
          </motion.div>

          <div className="an__head">
            <h2>{t(ui.anDynamics)}</h2>
            <button className="an__period" type="button" onClick={() => setMonths((m) => (m === 12 ? 6 : 12))}>
              {months === 12 ? t(ui.months12) : t(ui.months6)}
              <ChevronDown size={13} strokeWidth={2.4} />
            </button>
          </div>

          <div className="an__bars">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 26, right: 4, bottom: 0, left: 4 }}>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10.5, fill: "var(--on-3)" }}
                  interval={0}
                />
                <Bar dataKey="value" radius={[8, 8, 8, 8]} maxBarSize={26} isAnimationActive>
                  {series.map((_, i) => (
                    <Cell key={i} fill={i === series.length - 1 ? "var(--bar-on)" : "var(--bar-idle)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {series.length > 0 && (
              <span
                className="an__tip tnum"
                style={{
                  left: `${((series.length - 0.5) / series.length) * 100}%`,
                  bottom: `calc(${((series[series.length - 1].value / peak) * 0.66) * 100}% + 30px)`,
                }}
              >
                {money(series[series.length - 1].value)}
              </span>
            )}
          </div>

          <p className="an__note">{t(ui.rateNotGuaranteed)}</p>
          <p className="demo">{t(ui.demoNames)}</p>
        </>
      )}
    </div>
  );
}
