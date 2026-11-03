import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  FileText,
  Flame,
  ListChecks,
  MapPin,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import type { ObjectItem, Strategy } from "../api/types";
import { api } from "../api/client";
import { useQuery } from "../api/hooks";
import { contractsWord, money, useApp, useT } from "../lib/app";
import { ui } from "../lib/data";
import { ActionChip, EmptyState, ErrorState, Loading, Pill, SectionHead, TxRow } from "../components/kit";
import { HeroBg } from "../components/Hero";
import { AccountIsland } from "../components/Island";
import { IncomeChip } from "../components/Income";
import { ContractsRail } from "../components/ContractsRail";

const MARKS = {
  final: { icon: Timer, label: "markFinal" },
  popular: { icon: Flame, label: "markPopular" },
  choice: { icon: Sparkles, label: "markChoice" },
} as const;

export function Home({
  onAsset,
  onStats,
  onAll,
  onVerification,
  onBrowse,
  onAllNews,
  onTopUp,
  onWithdraw,
  onInvest,
  onDocuments,
  onRequests,
  onSignIn,
  onEarlyExit,
  onProlong,
}: {
  onAsset: (id: string) => void;
  onStats: () => void;
  onAll: () => void;
  onVerification: () => void;
  onBrowse: () => void;
  onAllNews: () => void;
  onTopUp: () => void;
  onWithdraw: () => void;
  onInvest: (id: string) => void;
  onDocuments: () => void;
  onRequests: () => void;
  onSignIn: () => void;
  onEarlyExit: (strategyId: string) => void;
  onProlong: (strategyId: string) => void;
}) {
  const t = useT();
  const { lang, session } = useApp();
  const [open, setOpen] = useState<string | null>(null);

  const objectsQ = useQuery(() => api.getObjects(), []);
  const portfolioQ = useQuery(() => api.getPortfolio(), [session?.phone]);
  const accountQ = useQuery(() => api.getAccount(), [session?.phone]);
  const opsQ = useQuery(() => api.getOperations(), [session?.phone]);
  const newsQ = useQuery(() => api.getNews(), []);

  const objects = objectsQ.data ?? [];
  const portfolio = portfolioQ.data;
  const strategies = portfolio?.strategies ?? [];
  const account = accountQ.data;
  const ops = opsQ.data ?? [];
  const news = (newsQ.data ?? []).slice(0, 2);

  const mineIds = new Set(strategies.map((s) => s.objectId));
  const cards = [...objects]
    .sort((a, b) => {
      const rank = (o: ObjectItem) => (mineIds.has(o.id) ? 3 : o.marks.length ? 2 : 1);
      return rank(b) - rank(a) || b.raised - a.raised;
    })
    .slice(0, 6);

  const opened = open ? objects.find((o) => o.id === open) : null;

  return (
    <div className="screen screen--home">
      <section className="hero">
        <HeroBg />

        <div className="hero__in">
          <AccountIsland
            user={!!session}
            balance={account?.balance ?? 0}
            onTopUp={onTopUp}
            onWithdraw={onWithdraw}
            onLogin={onSignIn}
          />

          <motion.div
            className="balance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="balance__k">{session ? t(ui.portfolio) : t(ui.offerGuest)}</span>
            <span className="balance__v tnum">
              {session ? (
                portfolio ? (
                  money(portfolio.body + portfolio.accrued, 2)
                ) : (
                  "—"
                )
              ) : (
                <>
                  <small>от </small>$100
                </>
              )}
            </span>

            {session ? (
              portfolio && strategies.length > 0 ? (
                <IncomeChip income={portfolio.income} />
              ) : null
            ) : (
              <Pill icon={ShieldCheck}>{`${t(ui.licence)} № 88`}</Pill>
            )}
          </motion.div>

          <div className="cards" role="list">
            {objectsQ.loading && <div className="cards__skel" aria-hidden />}
            {cards.map((a, i) => {
              const mark = a.marks[0];
              const MarkIcon = mark ? MARKS[mark].icon : null;
              return (
                <motion.button
                  key={a.id}
                  className="ocard"
                  data-mark={!!mark}
                  role="listitem"
                  layoutId={`obj-${a.id}`}
                  onClick={() => setOpen(a.id)}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                  type="button"
                >
                  <img className="ocard__img" src={`${import.meta.env.BASE_URL}obj/${a.img}`} alt="" loading="lazy" />
                  <span className="ocard__shade" aria-hidden />
                  {mark && MarkIcon && (
                    <span className="ocard__badge">
                      <span className="mark" data-kind={mark}>
                        <MarkIcon size={11} strokeWidth={2.6} />
                        {t(ui[MARKS[mark].label])}
                      </span>
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
            {session ? (
              <>
                <ActionChip icon={ArrowUpRight} label={t(ui.topUp)} onClick={onTopUp} />
                <ActionChip icon={ArrowLeftRight} label={t(ui.tabMarket)} onClick={onBrowse} />
                <ActionChip icon={ArrowDownLeft} label={t(ui.withdraw)} onClick={onWithdraw} />
              </>
            ) : (
              <>
                <ActionChip icon={ShieldCheck} label={t(ui.guestCtaShort)} onClick={onVerification} />
                <ActionChip icon={ArrowLeftRight} label={t(ui.tabMarket)} onClick={onBrowse} />
                <ActionChip icon={Building2} label={t(ui.manager)} onClick={onVerification} />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="content">
        {session && strategies.length > 0 && (
          <>
            <SectionHead title={t(ui.myObjects)} action={contractsWord(strategies.length, lang)} />
            <ContractsRail
              strategies={strategies}
              objects={Object.fromEntries(objects.map((o) => [o.id, o]))}
              onOpen={onAsset}
              onEarlyExit={onEarlyExit}
              onDocuments={onDocuments}
              onProlong={onProlong}
              onStats={onStats}
            />
          </>
        )}

        {session && (
          <>
            <SectionHead title={t(ui.recent)} action={t(ui.all)} onAction={onAll} />
            {opsQ.loading && <Loading />}
            {opsQ.error && <ErrorState error={opsQ.error} onRetry={opsQ.reload} />}
            {!opsQ.loading && !opsQ.error && (
              <div className="txs">
                {ops.slice(0, 4).map((o) => (
                  <TxRow
                    key={o.id}
                    op={o}
                    title={t(o.title)}
                    sub={t(o.sub)}
                    amount={`${o.amount > 0 ? "+" : "−"}${money(Math.abs(o.amount))}`}
                  />
                ))}
                {ops.length === 0 && <EmptyState title={t(ui.emptyHere)} hint={t(ui.noContractsHint)} />}
              </div>
            )}

            <div className="home__links">
              <button className="home__link" onClick={onDocuments} type="button">
                <FileText size={17} strokeWidth={2} />
                {t(ui.documents)}
                <ChevronRight size={15} strokeWidth={2.4} />
              </button>
              <button className="home__link" onClick={onRequests} type="button">
                <ListChecks size={17} strokeWidth={2} />
                {t(ui.requests)}
                <ChevronRight size={15} strokeWidth={2.4} />
              </button>
            </div>
          </>
        )}

        <SectionHead title={t(ui.newsTitle)} action={t(ui.allNews)} onAction={onAllNews} />
        <div className="news">
          {news.map((n) => (
            <article className="ncard" key={n.id}>
              <div className="ncard__img">
                <img src={`${import.meta.env.BASE_URL}obj/${n.img}`} alt="" loading="lazy" />
              </div>
              <div className="ncard__b">
                <div className="ncard__h">
                  <span className="ncard__tag" data-about={n.about}>
                    {t(n.tag)}
                  </span>
                  <span>{n.date}</span>
                </div>
                <h4>{t(n.title)}</h4>
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
              strategy={strategies.find((s) => s.objectId === opened.id)}
              onClose={() => setOpen(null)}
              onOpen={() => {
                setOpen(null);
                onAsset(opened.id);
              }}
              onInvest={() => {
                setOpen(null);
                onInvest(opened.id);
              }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ObjectExpanded({
  a,
  strategy,
  onClose,
  onOpen,
  onInvest,
}: {
  a: ObjectItem;
  strategy?: Strategy;
  onClose: () => void;
  onOpen: () => void;
  onInvest: () => void;
}) {
  const t = useT();
  const { lang } = useApp();
  const funded = Math.round((a.raised / a.target) * 100);

  return (
    <>
      <motion.div
        className="veil"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <div className="expand" role="dialog" aria-modal="true">
        <motion.div className="expand__card" layoutId={`obj-${a.id}`}>
          <img className="expand__img" src={`${import.meta.env.BASE_URL}obj/${a.img}`} alt="" />
          <span className="expand__shade" aria-hidden />
          <button className="expand__x" onClick={onClose} aria-label={t(ui.close)} type="button">
            <X size={16} strokeWidth={2.4} />
          </button>
          <div className="expand__top">
            <span className="expand__t">{a.name[lang]}</span>
            <span className="expand__loc">
              <MapPin size={12} strokeWidth={2.4} />
              {a.city[lang]}
            </span>
          </div>
        </motion.div>

        <div className="expand__body">
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

          {strategy && (
            <div className="expand__mine">
              <span>{t(ui.paidFact)}</span>
              <b className="tnum">{money(strategy.paid)}</b>
            </div>
          )}

          <div className="expand__foot">
            <button className="btn btn--s btn--sm" onClick={onOpen} type="button">
              {t(ui.details)}
            </button>
            <button className="btn btn--p btn--sm" onClick={onInvest} type="button">
              {a.product === "partnership" ? t(ui.requestToManager) : t(ui.invest)}
            </button>
          </div>

          <p className="expand__note">
            {t(ui.targetRate)} · {funded}% {t(ui.collected)} · {t(ui.rateNotGuaranteed)}
          </p>
        </div>
      </div>
    </>
  );
}
