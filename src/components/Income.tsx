import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { money, useT } from "../lib/app";
import { ui } from "../lib/data";

export type IncomePeriod = "year" | "month" | "day";

/**
 * «Расчётный доход по целевой ставке» под балансом. Значения считает бэкенд —
 * фронт только переключает период. Анимация повторяет остров наверху:
 * строка не размонтируется, ширина и высота — числа (свёрнутая измеряется
 * пробником), без backdrop-filter.
 */
export function IncomeChip({ income }: { income: { year: number; month: number; day: number } }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<IncomePeriod>("month");

  const label: Record<IncomePeriod, string> = {
    year: t(ui.inYear),
    month: t(ui.anPerMonth),
    day: t(ui.inDay),
  };
  const short: Record<IncomePeriod, string> = {
    year: t(ui.perYearShort),
    month: t(ui.perMonthShort),
    day: t(ui.perDayShort),
  };

  const probe = useRef<HTMLSpanElement>(null);
  const [closedW, setClosedW] = useState(150);

  useEffect(() => {
    const el = probe.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setClosedW(Math.ceil(el.offsetWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wide = Math.min(232, (typeof window !== "undefined" ? window.innerWidth : 390) - 56);

  return (
    <motion.div
      className="inc"
      data-open={open}
      animate={{ width: open ? wide : closedW, height: open ? "auto" : 42, borderRadius: open ? 22 : 999 }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
      style={{ overflow: "hidden" }}
    >
      <span className="inc__probe" aria-hidden ref={probe}>
        <span className="inc__dot" />
        <span className="inc__t tnum">
          {money(income.month)} <i>{label.month}</i>
        </span>
        <ChevronDown size={14} strokeWidth={2.4} className="inc__chev" />
      </span>

      <button
        className="inc__row"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t(ui.calcIncomeTitle)}
      >
        <span className="inc__dot" aria-hidden />
        <span className="inc__t tnum">
          {money(income[period], period === "day" ? 2 : 0)} <i>{label[period]}</i>
        </span>
        <motion.span
          className="inc__icon"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        >
          <ChevronDown size={14} strokeWidth={2.4} className="inc__chev" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="more"
            className="inc__more"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.18, delay: 0.05 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            <div className="inc__seg" role="tablist" aria-label={t(ui.calcIncomeTitle)}>
              {(["year", "month", "day"] as IncomePeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={p === period}
                  data-on={p === period}
                  onClick={() => setPeriod(p)}
                >
                  {p === period && (
                    <motion.span
                      className="inc__seg-pill"
                      layoutId="inc-seg"
                      transition={{ type: "spring", stiffness: 460, damping: 36 }}
                    />
                  )}
                  <span>{short[p]}</span>
                </button>
              ))}
            </div>

            <span className="inc__alt tnum">
              {(["year", "month", "day"] as IncomePeriod[])
                .filter((p) => p !== period)
                .map((p) => `${money(income[p], p === "day" ? 2 : 0)} ${label[p]}`)
                .join(" · ")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
