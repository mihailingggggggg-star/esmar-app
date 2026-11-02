import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bookmark,
  Coins,
  Flame,
  MapPin,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import { assets, news, ui, type Asset as Obj } from "../lib/data";
import { accrued, contractValue, money, objectsWord, useApp, useT } from "../lib/app";
import { eventDate, feed, type Event } from "../lib/feed";
import { ActionChip, Pill, SectionHead, TxRow } from "../components/kit";
import { HeroBg } from "../components/Hero";
import { AccountIsland } from "../components/Island";
import { ContractsRail } from "../components/ContractsRail";
import { IncomeChip } from "../components/Income";

/** Бейджи-метки карточек: финальная стадия, популярность, выбор инвесторов. */
type Mark = "final" | "popular" | "choice" | "mine";

const MARKS = {
  final: { icon: Timer, label: "markFinal" },
  popular: { icon: Flame, label: "markPopular" },
  choice: { icon: Sparkles, label: "markChoice" },
  mine: { icon: Bookmark, label: "markMine" },
} as const;

/** Метка объекта: закрытая подписка → популярность → выбор инвесторов → свой объект. */
function markOf(a: Obj, mine: Set<string>, top: string[]): Mark | null {
  if (a.raised / a.target >= 0.95) return "final";
  if (a.id === top[0]) return "popular";
  if (a.id === top[1]) return "choice";
  if (mine.has(a.id)) return "mine";
  return null;
}

/**
 * Порядок карточек в шапке: сначала помеченные (метка задаёт повод), внутри
 * группы — по объёму привлечённых средств. В портфеле может быть несколько
 * договоров по одному объекту, поэтому список объектов собираем не из договоров.
 */
function rankOf(m: Mark | null) {
  if (m === "final" || m === "popular") return 3;
  if (m === "choice" || m === "mine") return 2;
  return 1;
}

/**
 * Раскрытая карточка объекта. Морфит из маленькой карточки в ленте
 * (общий layoutId) — тот же приём, что в shared-layout примерах framer-motion.
 */
function ObjectExpanded({
  a,
  mark,
  onClose,
  onOpen,
  onBuy,
}: {
  a: Obj;
  mark: Mark | null;
  onClose: () => void;
  onOpen: () => void;
  onBuy: () => void;
}) {
  const t = useT();
  const { lang, contracts } = useApp();
  const mine = contracts.filter((c) => c.assetId === a.id);
  const val = mine.reduce((s, c) => s + contractValue(c), 0);
  const MarkIcon = mark ? MARKS[mark].icon : null;

  return (
    <div className="expand">
      <motion.div
        className="expand__veil"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
      />
      <motion.div
        className="expand__card"
        layoutId={`obj-${a.id}`}
        transition={{ type: "spring", stiffness: 300, damping: 33 }}
        role="dialog"
        aria-modal="true"
        aria-label={a.name[lang]}
      >
        <img className="expand__img" src={`${import.meta.env.BASE_URL}obj/${a.img}`} alt="" />
        <span className="expand__shade" aria-hidden />

        <motion.div
          className="expand__in"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.1, duration: 0.24 }}
        >
          <div className="expand__top">
            <div className="expand__tags">
              {mark && MarkIcon && (
                <span className="mark" data-kind={mark}>
                  <MarkIcon size={11} strokeWidth={2.6} />
                  {t(ui[MARKS[mark].label])}
                </span>
              )}
              <span className="expand__tag">{a.kind[lang]}</span>
            </div>
            <button className="expand__x" onClick={onClose} type="button" aria-label={t(ui.close)}>
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>

          <div className="expand__body">
            <div>
              <h3>{a.name[lang]}</h3>
              <p className="expand__addr">
                <MapPin size={12} strokeWidth={2.2} />
                {a.address[lang]}
              </p>
            </div>

            <div className="expand__stats">
              <div>
                <span>{t(ui.rate)}</span>
                <b className="tnum">{a.rate}%</b>
              </div>
              <div>
                <span>{t(ui.term)}</span>
                <b>{a.term[lang]}</b>
              </div>
              <div>
                <span>{t(ui.minShort)}</span>
                <b className="tnum">{money(a.min)}</b>
              </div>
            </div>

            <div>
              <div className="expand__prow">
                <span>{t(ui.readiness)}</span>
                <b className="tnum">{a.progress}%</b>
              </div>
              <div className="progress progress--light">
                <i style={{ width: `${a.progress}%` }} />
              </div>
            </div>

            {mine.length > 0 && (
              <div className="expand__mine">
                <span>{t(ui.portfolio)}</span>
                <b className="tnum">{money(Math.round(val))}</b>
              </div>
            )}

            <div className="expand__foot">
              <button className="btn btn--s btn--sm" onClick={onOpen} type="button">
                {t(ui.details)}
              </button>
              <button className="btn btn--p btn--sm" onClick={onBuy} type="button">
                {t(ui.buy)}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function Home({
  onAsset,
  onStats,
  onAll,
  onKyc,
  onBrowse,
  onAllNews,
  onTopUp,
  onWithdraw,
  onBuy,
}: {
  onAsset: (id: string) => void;
  onStats: () => void;
  onAll: () => void;
  onKyc: () => void;
  onBrowse: () => void;
  onAllNews: () => void;
  onTopUp: () => void;
  onWithdraw: () => void;
  onBuy: (id: string) => void;
}) {
  const t = useT();
  const { lang, user, contracts, cash } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const now = new Date();

  const body = contracts.reduce((s, c) => s + c.amount, 0);
  const acc = contracts.reduce((s, c) => s + accrued(c, now), 0);
  const total = body + acc;
  const events = feed(contracts, now);

  const mineIds = new Set(contracts.map((c) => c.assetId));
  const top = [...assets].sort((x, y) => y.raised - x.raised).map((x) => x.id);
  const mark = (a: Obj) => markOf(a, mineIds, top);

  /* Помеченные объекты идут вперёд: метка — повод открыть карточку. */
  const all = [...assets]
    .sort((x, y) => rankOf(mark(y)) - rankOf(mark(x)) || y.raised - x.raised)
    .slice(0, 6);
  const opened = open ? assets.find((a) => a.id === open) : null;
  const cards = all.filter((a) => a.id !== open);

  return (
    <div className="screen screen--home">
      <section className="hero">
        <HeroBg />

        <div className="hero__in">
          <AccountIsland
            user={!!user}
            cash={cash}
            onTopUp={onTopUp}
            onWithdraw={onWithdraw}
            onKyc={onKyc}
          />

          <motion.div
            className="balance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="balance__k">{user ? t(ui.portfolio) : t(ui.guestTitle)}</span>
            <span className="balance__v tnum">
              {user ? (
                money(total, 2)
              ) : (
                <>
                  до 55<small>%</small>
                </>
              )}
            </span>
            {user ? (
              contracts.length > 0 ? (
                <IncomeChip contracts={contracts} />
              ) : null
            ) : (
              <Pill icon={ShieldCheck}>{`${t(ui.license)} № 88`}</Pill>
            )}
          </motion.div>

          <div className="cards" role="list">
            {cards.map((a, i) => {
              const m = mark(a);
              const MarkIcon = m ? MARKS[m].icon : null;
              return (
                <motion.button
                  key={a.id}
                  className="ocard"
                  type="button"
                  role="listitem"
                  data-mark={!!m}
                  layoutId={`obj-${a.id}`}
                  onClick={() => setOpen(a.id)}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.05 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                >
                  <img src={`${import.meta.env.BASE_URL}obj/${a.img}`} alt="" loading="lazy" />
                  <span className="ocard__shade" aria-hidden />
                  {m && MarkIcon && (
                    <span className="mark ocard__badge" data-kind={m}>
                      <MarkIcon size={11} strokeWidth={2.6} />
                      {t(ui[MARKS[m].label])}
                    </span>
                  )}
                  <span className="ocard__t">{a.name[lang]}</span>
                  <span className="ocard__m tnum">
                    <b>{a.rate}%</b> {t(ui.perYear)} · {a.term[lang]}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="actions">
            {user ? (
              <>
                <ActionChip icon={ArrowUpRight} label={t(ui.topUp)} onClick={onTopUp} />
                <ActionChip icon={ArrowLeftRight} label={t(ui.buy)} onClick={onBrowse} />
                <ActionChip icon={ArrowDownLeft} label={t(ui.withdraw)} onClick={onWithdraw} />
              </>
            ) : (
              <>
                <ActionChip icon={ShieldCheck} label={t(ui.guestCtaShort)} onClick={onKyc} />
                <ActionChip icon={ArrowLeftRight} label={t(ui.tabMarket)} onClick={onBrowse} />
                <ActionChip icon={Coins} label={t(ui.manager)} onClick={onBrowse} />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="content">
        {user && contracts.length > 0 && (
          <>
            <SectionHead
              title={t(ui.myObjects)}
              action={objectsWord(new Set(contracts.map((c) => c.assetId)).size, lang)}
            />
            <ContractsRail contracts={contracts} onOpen={onAsset} onAnalytics={onStats} />
          </>
        )}

        <SectionHead title={t(ui.recent)} action={t(ui.all)} onAction={onAll} />

        <div className="txs">
          {events.slice(0, 4).map((e: Event) => (
            <TxRow
              key={e.id}
              kind={e.kind}
              title={e.title[lang]}
              sub={`${e.sub[lang]} · ${eventDate(e.date, lang)}`}
              amount={`${e.amount > 0 ? "+" : "−"}${money(Math.abs(e.amount))}`}
              tone={e.amount > 0 ? "up" : undefined}
              onClick={() => {
                const id = contracts.find((c) => e.id.endsWith(c.no))?.assetId;
                onAsset(id ?? all[0]?.id ?? assets[0].id);
              }}
            />
          ))}

          {events.length === 0 && (
            <div className="empty">
              <b>{t(ui.noContractsYet)}</b>
              <span>{t(ui.noContractsHint)}</span>
              <button className="btn btn--p btn--sm" onClick={onBrowse}>
                {t(ui.guestBrowse)}
              </button>
            </div>
          )}
        </div>

        <SectionHead title={t(ui.newsTitle)} action={t(ui.allNews)} onAction={onAllNews} />
        <div className="news">
          {news.slice(0, 2).map((n, i) => (
            <article className="ncard" key={i}>
              <div className="ncard__img">
                <img src={`${import.meta.env.BASE_URL}obj/${n.img}`} alt="" loading="lazy" />
              </div>
              <div className="ncard__b">
                <div className="ncard__h">
                  <span className="ncard__tag" data-about={n.about}>
                    {n.tag[lang]}
                  </span>
                  <span>{n.date}</span>
                </div>
                <h4>{n.title[lang]}</h4>
              </div>
            </article>
          ))}
        </div>

        <p className="disclaimer">{t(ui.demoNames)}</p>
      </section>

      {createPortal(
        <AnimatePresence>
          {opened && (
            <ObjectExpanded
              key={opened.id}
              a={opened}
              mark={mark(opened)}
              onClose={() => setOpen(null)}
              onOpen={() => {
                setOpen(null);
                onAsset(opened.id);
              }}
              onBuy={() => {
                setOpen(null);
                onBuy(opened.id);
              }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
