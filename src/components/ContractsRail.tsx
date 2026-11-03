import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, FileText, LogOut } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

const useEmblaCarouselLike = () =>
  useEmblaCarousel({ align: "start", containScroll: "trimSnaps", skipSnaps: true });
import type { ObjectItem, Strategy } from "../api/types";
import { useApp, fixed, money, useT } from "../lib/app";
import { ui } from "../lib/data";

/**
 * Слайдер стратегий (Приложений №2). Карточка — «билет»: фото объекта,
 * зафиксированная ставка, расчётный доход и фактически выплачено, срок и
 * действия. Карусель — embla-carousel-react (github.com/davidjerleke/embla-carousel,
 * MIT), эффект глубины — готовый рецепт из её документации.
 */
export function ContractsRail({
  strategies,
  objects,
  onOpen,
  onEarlyExit,
  onDocuments,
  onProlong,
  onStats,
}: {
  strategies: Strategy[];
  objects: Record<string, ObjectItem>;
  onOpen: (objectId: string) => void;
  onEarlyExit: (strategyId: string) => void;
  onDocuments: () => void;
  onProlong: (strategyId: string) => void;
  onStats: () => void;
}) {
  const t = useT();
  const { lang } = useApp();
  const [ref, embla] = useEmblaCarouselLike();
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const start = useRef({ x: 0, y: 0 });
  const dragged = useRef(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const depth = () => {
      const p = Math.max(0, Math.min(1, embla.scrollProgress()));
      embla.scrollSnapList().forEach((snap, i) => {
        const el = cards.current[i];
        if (!el) return;
        const k = Math.min(Math.abs(snap - p), 1);
        el.style.transform = `scale(${(1 - k * 0.07).toFixed(4)})`;
        el.style.opacity = (1 - k * 0.32).toFixed(3);
      });
    };
    const mark = () => {
      const p = Math.max(0, Math.min(1, embla.scrollProgress()));
      let best = 0;
      let dist = Infinity;
      embla.scrollSnapList().forEach((snap, i) => {
        const d = Math.abs(snap - p);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      setActive(best);
    };
    depth();
    embla.on("scroll", depth).on("select", mark).on("reInit", depth);
    return () => {
      embla.off("scroll", depth).off("select", mark).off("reInit", depth);
    };
  }, [embla]);

  const rows = useMemo(
    () =>
      strategies.map((s) => {
        const o = objects[s.objectId];
        const end = new Date(`${s.endDate}T00:00:00`);
        const now = new Date();
        const monthsLeft = Math.max(
          0,
          (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()) + (end.getDate() >= now.getDate() ? 0 : -1)
        );
        return { s, o, monthsLeft };
      }),
    [strategies, objects]
  );

  return (
    <div className="ctr">
      <div
        className="ctr__viewport"
        ref={ref}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY };
          dragged.current = false;
        }}
        onPointerMove={(e) => {
          if (dragged.current) return;
          if (Math.abs(e.clientX - start.current.x) > 6 || Math.abs(e.clientY - start.current.y) > 6) dragged.current = true;
        }}
      >
        <div className="ctr__track" data-single={rows.length === 1}>
          {rows.map(({ s, o, monthsLeft }, i) => (
            <div className="ctr__slide" key={s.id}>
              <div
                className="ctr__card"
                ref={(el) => {
                  cards.current[i] = el;
                }}
                onClick={() => {
                  if (!dragged.current && o) onOpen(s.objectId);
                }}
              >
                <div className="ctr__photo">
                  {o && <img className="ctr__img" src={`${import.meta.env.BASE_URL}obj/${o.img}`} alt="" loading="lazy" />}
                  <span className="ctr__rate tnum">{fixed(s.rate, s.rate % 1 ? 2 : 0)}%</span>
                  <div className="ctr__head">
                    <span className="ctr__no tnum">
                      {t(ui.contractNo)} {s.no}
                    </span>
                    <span className="ctr__name">{o ? o.name[lang] : s.objectId}</span>
                    <span className="ctr__sub">
                      {t(ui.term)}: {s.termMonths} {t(ui.monthsShort)}
                    </span>
                  </div>
                </div>

                <div className="ctr__body">
                  <div className="ctr__sum">
                    <b className="tnum">{money(s.amount + s.accrued)}</b>
                    <i className="up tnum">+{money(s.accrued)}</i>
                  </div>

                  <span className="ctr__perf" aria-hidden />

                  <div className="ctr__facts">
                    <span>
                      <i>{t(ui.paidFact)}</i>
                      <b className="tnum">{money(s.paid)}</b>
                    </span>
                    <span>
                      <i>{t(ui.ctrLeft)}</i>
                      <b className="tnum">
                        {monthsLeft} {t(ui.monthsShort)}
                      </b>
                    </span>
                    <span>
                      <i>{t(ui.until)}</i>
                      <b className="tnum">{new Date(`${s.endDate}T00:00:00`).toLocaleDateString("ru-RU", { month: "2-digit", year: "numeric" })}</b>
                    </span>
                  </div>

                  <div className="ctr__foot">
                    <button
                      className="ctr__open"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEarlyExit(s.id);
                      }}
                    >
                      <LogOut size={13} strokeWidth={2.4} />
                      {t(ui.earlyExit)}
                    </button>
                    <button
                      className="ctr__more"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onProlong(s.id);
                      }}
                    >
                      {t(ui.prolong)}
                    </button>
                    <button
                      className="ctr__more"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDocuments();
                      }}
                    >
                      <FileText size={13} strokeWidth={2.4} />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ctr__bar">
        <div className="ctr__dots" role="tablist" aria-label={t(ui.myObjects)}>
          {rows.length > 1 &&
            rows.map(({ s }, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`${i + 1}`}
                data-on={i === active}
                onClick={() => embla?.scrollTo(i)}
              />
            ))}
        </div>
        <button className="ctr__more" type="button" onClick={onStats}>
          {t(ui.analytics)}
          <ChevronRight size={13} strokeWidth={2.4} />
        </button>
      </div>

      <AnimatePresence>
        {rows.length === 0 && (
          <motion.div className="ctr__empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {t(ui.emptyHere)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

