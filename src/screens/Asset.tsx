import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronDown,
  Coins,
  Heart,
  MapPin,
  Share2,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { api } from "../api/client";
import { useQuery } from "../api/hooks";
import { fixed, money, useApp, useT } from "../lib/app";
import { COMPANY, stages as stageList, ui } from "../lib/data";
import { ErrorState, Loading } from "../components/kit";

/**
 * Карточка объекта: галерея, расчётная ставка на сегодня, срок, этапы, риски,
 * документы и липкая панель с действиями. Для Партнёрства вместо вложения —
 * заявка менеджеру (расчётов в приложении нет).
 */
export function Asset({
  id,
  onBack,
  onInvest,
  onEarlyExit,
  onManager,
}: {
  id: string;
  onBack: () => void;
  onInvest: () => void;
  onEarlyExit: (strategyId: string) => void;
  onManager: () => void;
}) {
  const t = useT();
  const { lang, session } = useApp();
  const [full, setFull] = useState(false);
  const [idx, setIdx] = useState(0);
  const [fav, setFav] = useState(false);
  const gal = useRef<HTMLDivElement>(null);

  const objectQ = useQuery(() => api.getObject(id), [id]);
  const portfolioQ = useQuery(() => api.getPortfolio(), [session?.phone]);
  const docQ = useQuery(() => api.getDocuments(), [session?.phone]);

  const a = objectQ.data;
  const mine = useMemo(
    () => (portfolioQ.data?.strategies ?? []).filter((s) => s.objectId === id),
    [portfolioQ.data, id]
  );

  const slides = useMemo(() => {
    if (!a) return [];
    const list = a.photos?.length ? a.photos : [a.img];
    return list.map((src) => ({ src, pos: "50% 50%", scale: 1 }));
  }, [a]);

  const onGalScroll = () => {
    const el = gal.current;
    if (!el) return;
    setIdx(Math.min(slides.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
  };

  const share = async () => {
    const url = `${COMPANY.site}/katalog/${id}`;
    try {
      if (navigator.share) await navigator.share({ title: a ? t(a.name) : "ESMAR", url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* пользователь отменил */
    }
  };

  if (objectQ.loading) return <div className="screen"><Loading /></div>;
  if (objectQ.error || !a) return <div className="screen"><ErrorState error={objectQ.error ?? { code: "network", name: "ApiError", message: "" } as never} onRetry={objectQ.reload} /></div>;

  const funded = Math.round((a.raised / a.target) * 100);
  const cur = Math.min(Math.max(a.stage - 1, 0), stageList.length - 1);
  const consultOnly = a.product === "partnership";
  const docs = (docQ.data ?? []).filter((d) => d.kind === "act" || d.kind === "appendix").slice(0, 3);

  return (
    <motion.div
      className="det"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="dt__scroll">
        <div className="dt__hero">
          <div className="dt__gal" ref={gal} onScroll={onGalScroll}>
            {slides.map((s, i) => (
              <div className="dt__slide" key={i}>
                <img src={`${import.meta.env.BASE_URL}obj/${s.src}`} alt="" style={{ objectPosition: s.pos }} />
              </div>
            ))}
          </div>

          <div className="dt__top">
            <button className="dt__round" onClick={onBack} type="button" aria-label={t(ui.back)}>
              <ArrowLeft size={18} strokeWidth={2.2} />
            </button>
            <div className="dt__acts">
              <button className="dt__round" onClick={share} type="button" aria-label={t(ui.shareAction)}>
                <Share2 size={17} strokeWidth={2.2} />
              </button>
              <button
                className="dt__round"
                onClick={() => setFav((v) => !v)}
                data-on={fav}
                type="button"
                aria-label={t(ui.favorite)}
              >
                <Heart size={17} strokeWidth={2.2} fill={fav ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          {slides.length > 1 && (
            <span className="dt__count tnum">
              {idx + 1}/{slides.length}
            </span>
          )}
        </div>

        <div className="dt__sheet">
          <div className="dt__title">
            <div>
              <h2>{t(a.name)}</h2>
              <span className="dt__loc">
                <MapPin size={13} strokeWidth={2.2} />
                {t(a.city)}, {t(a.address)}
              </span>
            </div>
            <div className="dt__rate">
              <b className="tnum">{fixed(a.rate, a.rate % 1 ? 2 : 0)}%</b>
              <span>
                {t(ui.targetRate)} · {t(ui.perYear)}
              </span>
            </div>
          </div>

          <div className="dt__facts">
            <div>
              <CalendarDays size={19} strokeWidth={1.9} />
              <b>{a.term[lang]}</b>
              <span>{t(ui.term)}</span>
            </div>
            <div>
              <Wallet size={19} strokeWidth={1.9} />
              <b>{a.payout[lang]}</b>
              <span>{t(ui.payout)}</span>
            </div>
            <div>
              <Coins size={19} strokeWidth={1.9} />
              <b className="tnum">{money(a.min)}</b>
              <span>{t(ui.minShort)}</span>
            </div>
            <div>
              <Building2 size={19} strokeWidth={1.9} />
              <b className="tnum">{a.progress}%</b>
              <span>{t(ui.readiness)}</span>
            </div>
          </div>

          <div className="dt__price">
            <div>
              <span>{t(ui.minTicket)}</span>
              <b className="tnum">{money(a.min)}</b>
            </div>
            {consultOnly ? (
              <button className="dt__cta" onClick={onManager} type="button">
                {t(ui.requestToManager)}
              </button>
            ) : (
              <button className="dt__cta" onClick={onInvest} type="button">
                {t(ui.invest)}
              </button>
            )}
          </div>

          {!consultOnly && <p className="dt__fine">{t(ui.rateNotGuaranteed)}</p>}

          <h2 className="dt__h2">{t(ui.aboutProperty)}</h2>
          <p className="dt__about" data-full={full}>
            {t(a.about)}
          </p>
          <button className="dt__more" onClick={() => setFull((v) => !v)} type="button">
            {full ? t(ui.collapse) : t(ui.readMore)}
            <ChevronDown size={14} strokeWidth={2.4} data-full={full} />
          </button>

          <h2 className="dt__h2">{t(ui.risks)}</h2>
          <div className="dt__risk">
            <ShieldAlert size={17} strokeWidth={2} />
            <p>{t(a.risks)}</p>
          </div>

          {a.product === "development" && (
            <>
              <h2 className="dt__h2">{t(ui.buildProgress)}</h2>
              <div className="dt__chips">
                {stageList.map((s, i) => (
                  <span className="dt__chip" data-on={i === cur} data-done={i < cur} key={i}>
                    <b>{i + 1}</b>
                    {t(s)}
                  </span>
                ))}
              </div>
              <div className="dt__chips dt__chips--info">
                <span className="dt__chip dt__chip--info">{t(a.handover)}</span>
                <span className="dt__chip dt__chip--info tnum">
                  {funded}% {t(ui.collected)}
                </span>
                <span className="dt__chip dt__chip--info tnum">{money(a.target)}</span>
              </div>
            </>
          )}

          <div className="dt__fund">
            <div className="dt__fund-h">
              <span>{t(ui.progress)}</span>
              <b className="tnum">{funded}%</b>
            </div>
            <div className="progress">
              <i style={{ width: `${Math.min(100, funded)}%` }} />
            </div>
            <div className="dt__fund-f">
              <span className="tnum">
                {money(a.raised)} / {money(a.target)}
              </span>
              <span>{t(a.handover)}</span>
            </div>
          </div>

          {docs.length > 0 && (
            <>
              <h2 className="dt__h2">{t(ui.documents)}</h2>
              <div className="dt__docs">
                {docs.map((d) => (
                  <a key={d.id} className="dt__doc" href={d.fileUrl} target="_blank" rel="noreferrer">
                    {t(d.title)}
                    <ArrowRight size={14} strokeWidth={2.2} />
                  </a>
                ))}
              </div>
            </>
          )}

          <p className="demo">{t(ui.demoNames)}</p>
        </div>
      </div>

      <div className="dt__bar">
        <div className="dt__bar-l">
          <span>{mine.length ? t(ui.paidFact) : t(ui.minTicket)}</span>
          <b className="tnum">
            {mine.length ? money(mine.reduce((s, x) => s + x.paid, 0)) : money(a.min)}
          </b>
        </div>
        <div className="dt__bar-r">
          {mine.length > 0 && (
            <button className="dt__ghost" onClick={() => onEarlyExit(mine[0].id)} type="button">
              {t(ui.earlyExit)}
            </button>
          )}
          {consultOnly ? (
            <button className="dt__cta dt__cta--bar" onClick={onManager} type="button">
              {t(ui.requestToManager)}
              <ArrowRight size={15} strokeWidth={2.4} />
            </button>
          ) : (
            <button className="dt__cta dt__cta--bar" onClick={onInvest} type="button">
              {t(ui.invest)}
              <ArrowRight size={15} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
