import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ui, type Contract } from "../lib/data";
import { money, portfolioIncome, useT, type IncomePeriod } from "../lib/app";

/**
 * «Примерный доход» под балансом. Свёрнуто — капсула со значением за месяц,
 * по нажатию раскрывается и даёт выбрать период «в год / месяц / день».
 *
 * Анимация повторяет остров наверху (components/Island.tsx):
 *  • строка с суммой никогда не размонтируется — она остаётся на месте,
 *    поэтому в середине анимации нет пустой плашки;
 *  • ширина и высота числовые (свёрнутая ширина измеряется пробником) —
 *    `auto` не интерполируется и давал рывок в первом кадре;
 *  • кроссфейд идёт одновременно с морфингом, без `mode="wait"`;
 *  • без backdrop-filter: пересчёт размытия на каждом кадре поверх живого
 *    WebGL-градиента и был причиной рывков на устройстве.
 */
export function IncomeChip({ contracts }: { contracts: Contract[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<IncomePeriod>("month");

  const sums = useMemo(
    () => ({
      year: portfolioIncome(contracts, "year"),
      month: portfolioIncome(contracts, "month"),
      day: portfolioIncome(contracts, "day"),
    }),
    [contracts]
  );

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

  /* Пробник со свёрнутой строкой: даёт точную ширину капсулы в пикселях. */
  const probe = useRef<HTMLSpanElement>(null);
  const [closedW, setClosedW] = useState(150);

  useEffect(() => {
    const el = probe.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setClosedW(Math.ceil(el.offsetWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wide = Math.min(222, (typeof window !== "undefined" ? window.innerWidth : 390) - 56);

  return (
    <motion.div
      className="inc"
      data-open={open}
      animate={{
        width: open ? wide : closedW,
        height: open ? "auto" : 42,
        borderRadius: open ? 22 : 999,
      }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
      style={{ overflow: "hidden" }}
    >
      <span className="inc__probe" aria-hidden ref={probe}>
        <span className="inc__dot" />
        <span className="inc__t tnum">
          {money(sums.month)} <i>{label.month}</i>
        </span>
        <ChevronDown size={14} strokeWidth={2.4} className="inc__chev" />
      </span>

      {/* строка живёт всегда: в свёрнутом виде это капсула, в раскрытом — заголовок */}
      <button
        className="inc__row"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t(ui.incomeApprox)}
      >
        <span className="inc__dot" aria-hidden />
        <span className="inc__t tnum">
          {money(sums[period], period === "day" ? 2 : 0)} <i>{label[period]}</i>
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
            <div className="inc__seg" role="tablist" aria-label={t(ui.incomeApprox)}>
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
                .map((p) => `${money(sums[p], p === "day" ? 2 : 0)} ${label[p]}`)
                .join(" · ")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
