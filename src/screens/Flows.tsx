import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ring } from "ldrs/react";
import "ldrs/react/Ring.css";
import { assetById, assetProducts, COMPANY, news, products, ui, type ProductId } from "../lib/data";
import {
  developmentRate,
  fixed,
  money,
  shortDate,
  termIncome,
  termLabel,
  termination,
  useApp,
  useT,
} from "../lib/app";
import { Sheet } from "../components/Sheet";
import { PushConfirm } from "../components/Push";
import { Seg } from "../components/Seg";
import { TxRow } from "../components/kit";
import { eventDate, feed } from "../lib/feed";
import { MarkEsmar } from "../components/Logo";
import {
  IcBell,
  IcCheck,
  IcOut,
  IcRefresh,
  IcSeal,
} from "../components/Icons";

const nf = (v: number) => v.toLocaleString("ru-RU");

/** Нумерация договоров: ES-2026-0114. Счётчик живёт на уровне модуля. */
let seq = 1100 + Math.floor(Math.random() * 700);
const nextContractNo = () => `ES-${new Date().getFullYear()}-${String(seq++).slice(-4)}`;
const digits = (s: string) => Number(s.replace(/\D/g, "")) || 0;
const spaced = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/* ------------------------------------------------------------- пополнение */

export function TopUp({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { lang, cash, setCash } = useApp();
  const [amount, setAmount] = useState("100");
  const [done, setDone] = useState(false);
  const value = digits(amount);

  return (
    <Sheet onClose={onClose}>
      {done ? (
        <Success
          title={t(ui.done)}
          text={
            lang === "ky"
              ? `${money(value)} жеке эсепке түштү.`
              : `${money(value)} зачислены на личный счёт.`
          }
          onClose={onClose}
        />
      ) : (
        <>
          <h3 className="sheet__t">{t(ui.topUp)}</h3>

          <div className="stack">
            <div className="mbank">
              <div>
                <b>{t(ui.fromMbank)}</b>
                <span>+996 222 111 114</span>
              </div>
              <span className="mbank__mark" aria-hidden>
                <MarkEsmar size={22} />
              </span>
            </div>

            <div style={{ padding: "0 4px" }}>
              <div style={{ fontSize: 12.5, color: "var(--txt-3)", fontWeight: 600, marginBottom: 6 }}>
                {t(ui.toAccount)}
              </div>
              <div className="tnum" style={{ fontSize: 20, fontWeight: 800 }}>
                {money(cash)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12.5, color: "var(--txt-3)", fontWeight: 600, marginBottom: 8 }}>
                {t(ui.topUpAmount)}
              </div>
              <div className="amount">
                <input
                  value={spaced(amount)}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  className="tnum"
                  aria-label={t(ui.amount)}
                />
                <span>$</span>
              </div>
            </div>

            <div className="chips">
              {[100, 500, 1000, 5000].map((v) => (
                <button key={v} data-on={value === v} onClick={() => setAmount(String(v))} className="tnum">
                  {nf(v)}
                </button>
              ))}
            </div>

            <div className="note note--dim">{t(ui.noFee)}</div>
            <div className="note">
              <IcCheck /> {t(ui.fast)}
            </div>

            <button
              className="btn btn--p"
              disabled={value <= 0}
              onClick={() => {
                setCash(cash + value);
                setDone(true);
              }}
            >
              {t(ui.confirm)}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

/* --------------------------------------------------------------- покупка */

type DealStep = "amount" | "offer" | "push" | "done";

export function Deal({ id, onClose }: { id: string; onClose: () => void }) {
  const a = assetById(id);
  const t = useT();
  const { lang, addContract } = useApp();

  const opts = useMemo(() => assetProducts(a), [a]);
  const [product, setProduct] = useState<ProductId>(a.product);
  const [months, setMonths] = useState(a.product === "rent" ? 12 : 24);
  const [step, setStep] = useState<DealStep>("amount");
  const [amount, setAmount] = useState(String(Math.max(a.min, 1000)));
  const [no, setNo] = useState("");

  const value = digits(amount);
  const rate = product === "development" ? developmentRate(months) : a.rate;
  const min = products[product].min;
  const tooSmall = value < min;
  const sharePct = (value / a.target) * 100;

  const openDate = new Date();
  const maturityDate = new Date(openDate);
  maturityDate.setMonth(maturityDate.getMonth() + months);

  /* «Доход за срок» — ровно то, что начислит договор: та же формула, что в accrued() */
  const income = termIncome({
    no: "",
    assetId: a.id,
    product,
    amount: value,
    rate,
    opened: openDate.toISOString().slice(0, 10),
    months,
    signed: false,
  });

  const sign = () => {
    const code = nextContractNo();
    setNo(code);
    setStep("push");
  };

  const signed = () => {
    addContract({
      no,
      assetId: a.id,
      product,
      amount: value,
      rate,
      opened: openDate.toISOString().slice(0, 10),
      months,
      signed: true,
    });
    setStep("done");
  };

  return (
    <>
      <Sheet
        onClose={() => {
          if (step === "push") return;
          if (step === "done") onClose();
          else setStep("amount");
        }}
      >
        {step === "done" ? (
          <ContractDone no={no} assetId={a.id} amount={value} rate={rate} months={months} onClose={onClose} />
        ) : (
          <>
            <h3 className="sheet__t">
              {t(ui.buy)} · {a.name[lang]}
            </h3>

            <div className="stack">
              {opts.length > 1 && step === "amount" && (
                <div style={{ alignSelf: "flex-start" }}>
                  <Seg
                    name="deal-product"
                    value={product}
                    onChange={(p) => {
                      setProduct(p);
                      setMonths(p === "rent" ? 12 : 24);
                    }}
                    options={opts.map((p) => ({ v: p, label: products[p].name[lang] }))}
                  />
                </div>
              )}

              {step === "amount" && product === "partnership" && (
                <>
                  <div className="dl" style={{ padding: "0 4px" }}>
                    <Row k={t(ui.rate)} v={`${products.partnership.rate}% ${t(ui.perYear)}`} accent />
                    <Row k={t(ui.term)} v={products.partnership.term[lang]} />
                    <Row k={t(ui.minTicket)} v={money(products.partnership.min)} />
                  </div>
                  <div className="note note--dim">{t(ui.partnershipOnly)}</div>
                  <a
                    className="btn btn--p"
                    href={`https://wa.me/${COMPANY.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t(ui.contactManager)}
                  </a>
                </>
              )}

              {step === "amount" && product !== "partnership" && (
                <>
                  <div className="dl" style={{ padding: "0 4px" }}>
                    <Row k={t(ui.rate)} v={`${rate}% ${t(ui.perYear)}`} accent />
                    <Row k={t(ui.minTicket)} v={money(min)} />
                    <Row k={t(ui.payout)} v={products[product].payout[lang]} />
                  </div>

                  <div className="amount">
                    <input
                      value={spaced(amount)}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 9))}
                      inputMode="numeric"
                      className="tnum"
                      aria-label={t(ui.amount)}
                    />
                    <span>$</span>
                  </div>

                  <div className="chips">
                    {[500, 1000, 2500, 5000].map((v) => (
                      <button key={v} data-on={value === v} onClick={() => setAmount(String(v))} className="tnum">
                        {nf(v)}
                      </button>
                    ))}
                  </div>

                  {product === "development" && (
                    <>
                      <div className="field__k">{t(ui.term)}</div>
                      <div className="chips">
                        {[12, 24, 36].map((m) => (
                          <button key={m} data-on={months === m} onClick={() => setMonths(m)}>
                            {termLabel(m, lang)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="dl" style={{ padding: "4px 4px 0" }}>
                    <Row k={t(ui.share)} v={`${fixed(sharePct, 2)}%`} />
                    <Row k={t(ui.calcIncome)} v={money(Math.round(income))} accent />
                  </div>

                  {tooSmall ? (
                    <div className="note note--dim">
                      {t(ui.minTicketErr)} — {money(min)}
                    </div>
                  ) : (
                    <div className="note note--dim">{t(ui.offerNote)}</div>
                  )}

                  <button className="btn btn--p" disabled={tooSmall} onClick={() => setStep("offer")}>
                    {t(ui.confirm)}
                  </button>
                </>
              )}

              {step === "offer" && product !== "partnership" && (
                <>
                  <div className="offer">
                    <div className="offer__h">
                      <MarkEsmar size={20} />
                      <b>{t(ui.offer)}</b>
                      <span className="badge">{products[product].name[lang]}</span>
                    </div>

                    <div className="dl">
                      <Row k={t(ui.amount)} v={money(value)} accent />
                      <Row k={t(ui.rate)} v={`${rate}% ${t(ui.perYear)}`} />
                      <Row k={t(ui.term)} v={termLabel(months, lang)} />
                      <Row k={t(ui.payout)} v={products[product].payout[lang]} />
                      <Row k={t(ui.openDate)} v={shortDate(openDate.toISOString())} />
                      <Row k={t(ui.maturity)} v={shortDate(maturityDate.toISOString())} />
                      <Row k={t(ui.share)} v={`${fixed(sharePct, 2)}%`} />
                    </div>

                    <p className="offer__note">{t(ui.offerNote)}</p>
                  </div>

                  <button className="btn btn--p" onClick={sign}>
                    {t(ui.acceptOffer)}
                  </button>
                  <button className="btn btn--s btn--sm" onClick={() => setStep("amount")}>
                    {t(ui.back)}
                  </button>
                </>
              )}

              {step === "push" && (
                <div className="wait">
                  <Ring size={42} stroke={3} color="var(--brand-lit)" bgOpacity={0.18} />
                  <b>{t(ui.signing)}</b>
                  <p>{t(ui.signingSub)}</p>
                  <div className="note" style={{ textAlign: "left", width: "100%" }}>
                    <IcBell />
                    <span>
                      {t(ui.signNote)}
                    </span>
                  </div>
                  <button className="linkbtn" onClick={() => setStep("offer")}>
                    <IcRefresh size={15} /> {t(ui.back)}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </Sheet>

      <AnimatePresence>
        {step === "push" && (
          <PushConfirm
            contractNo={no || "—"}
            assetName={a.name[lang]}
            amount={value}
            rate={rate}
            productLabel={products[product].name[lang]}
            onSigned={signed}
            onCancel={() => setStep("offer")}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ContractDone({
  no,
  assetId,
  amount,
  rate,
  months,
  onClose,
}: {
  no: string;
  assetId: string;
  amount: number;
  rate: number;
  months: number;
  onClose: () => void;
}) {
  const t = useT();
  const { lang } = useApp();
  const a = assetById(assetId);
  return (
    <div className="wait">
      <motion.span
        className="seal seal--lg"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 15 }}
      >
        <MarkEsmar size={34} />
        <i>
          <IcCheck size={13} />
        </i>
      </motion.span>

      <b>{t(ui.signed)}</b>
      <p className="tnum">
        {no} · {a.name.ru}
      </p>

      <div className="dl" style={{ width: "100%" }}>
        <Row k={t(ui.amount)} v={money(amount)} accent />
        <Row k={t(ui.rate)} v={`${rate}%`} />
        <Row k={t(ui.term)} v={termLabel(months, lang)} />
      </div>

      <p className="wait__fine">{t(ui.signedNote)}</p>
      <button className="btn btn--p" onClick={onClose}>
        {t(ui.done)}
      </button>
    </div>
  );
}

/* ----------------------------------------------------------- расторжение */

export function Terminate({ assetId, onClose }: { assetId?: string; onClose: () => void }) {
  const t = useT();
  const { lang, contracts, removeContract } = useApp();
  const now = new Date();

  const mine = contracts.filter((c) => !assetId || c.assetId === assetId);
  const [pick, setPick] = useState(mine[0]?.no ?? "");
  const [reason, setReason] = useState(0);
  const [step, setStep] = useState<"form" | "push" | "done">("form");

  const c = mine.find((x) => x.no === pick) ?? mine[0];

  const reasons = [
    { ru: "Нужны средства", ky: "Каражат керек" },
    { ru: "Меняю стратегию", ky: "Стратегияны алмаштырам" },
    { ru: "Другое", ky: "Башка" },
  ];

  if (!c) {
    return (
      <Sheet onClose={onClose}>
        <div className="wait">
          <b>{t(ui.noContract)}</b>
          <p>{t(ui.noContractHint)}</p>
          <button className="btn btn--s" onClick={onClose}>
            {t(ui.done)}
          </button>
        </div>
      </Sheet>
    );
  }

  const a = assetById(c.assetId);
  const term = termination(c, now);

  return (
    <>
      <Sheet
        onClose={() => {
          if (step === "push") return;
          onClose();
        }}
      >
        {step === "done" ? (
          <Success title={t(ui.termDone)} text={t(ui.termDoneNote)} onClose={onClose} />
        ) : (
          <>
            <h3 className="sheet__t">
              {t(ui.terminate)} · {a.name[lang]}
            </h3>

            <div className="stack">
              {mine.length > 1 && (
                <div className="chips" style={{ flexWrap: "wrap" }}>
                  {mine.map((x) => (
                    <button
                      key={x.no}
                      data-on={x.no === pick}
                      onClick={() => setPick(x.no)}
                      className="tnum"
                      style={{ flex: "1 1 45%", fontSize: 12, paddingInline: 8 }}
                    >
                      {x.no}
                    </button>
                  ))}
                </div>
              )}

              <div className="dl" style={{ padding: "0 4px" }}>
                <Row k={t(ui.contractNo)} v={c.no} />
                <Row k={t(ui.body)} v={money(c.amount)} />
                <Row k={t(ui.termFee)} v={money(term.fee)} />
                <Row k={t(ui.termAmount)} v={money(Math.round(term.refund))} accent />
                <Row k={t(ui.returnTerm)} v={t(ui.termDays)} />
              </div>

              <div className="note note--dim">{term.note[lang]}</div>

              <div className="field__k">{t(ui.termReason)}</div>
              <div className="chips">
                {reasons.map((r, i) => (
                  <button key={i} data-on={reason === i} onClick={() => setReason(i)}>
                    {r[lang]}
                  </button>
                ))}
              </div>

              <button className="btn btn--p" onClick={() => setStep("push")}>
                {t(ui.termSubmit)}
              </button>
            </div>
          </>
        )}
      </Sheet>

      <AnimatePresence>
        {step === "push" && (
          <PushConfirm
            contractNo={c.no}
            assetName={a.name[lang]}
            amount={Math.round(term.refund)}
            rate={c.rate}
            productLabel={t(ui.terminate)}
            onSigned={() => {
              removeContract(c.no);
              setStep("done");
            }}
            onCancel={() => setStep("form")}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* --------------------------------------------------------------- мелочи */

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="dl__row">
      <span>{k}</span>
      <b className={`tnum ${accent ? "brand" : ""}`}>{v}</b>
    </div>
  );
}

function Success({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const t = useT();
  return (
    <div className="wait">
      <motion.span
        className="seal seal--ok"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 18 }}
      >
        <IcCheck size={28} />
      </motion.span>
      <b>{title}</b>
      <p>{text}</p>
      <button className="btn btn--s" onClick={onClose}>
        {t(ui.done)}
      </button>
    </div>
  );
}

/** История операций: подписания, начисления, выплаты. */
export function FeedSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { lang, contracts } = useApp();
  const events = feed(contracts);

  return (
    <Sheet onClose={onClose}>
      <h3 className="sheet__t">{t(ui.history)}</h3>

      <div className="txs" style={{ marginBottom: 16 }}>
        {events.map((e) => (
          <TxRow
            key={e.id}
            kind={e.kind}
            title={e.title[lang]}
            sub={`${e.sub[lang]} · ${eventDate(e.date, lang)}`}
            amount={`${e.amount > 0 ? "+" : "−"}${money(Math.abs(e.amount))}`}
            tone={e.amount > 0 ? "up" : undefined}
          />
        ))}

        {events.length === 0 && (
          <div className="empty">
            <b>{t(ui.noContractsYet)}</b>
            <span>{t(ui.noContractsHint)}</span>
          </div>
        )}
      </div>

      <button className="btn btn--s" onClick={onClose}>
        {t(ui.done)}
      </button>
    </Sheet>
  );
}

export function DemoStub({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { lang } = useApp();
  return (
    <Sheet onClose={onClose}>
      <div className="wait">
        <span className="badge badge--brand">{t(ui.demoBadge)}</span>
        <p style={{ fontSize: 15.5, color: "var(--txt-2)", maxWidth: "28ch" }}>{t(ui.soon)}</p>
        <div className="dl" style={{ width: "100%" }}>
          <Row k={t(ui.offer)} v={t(ui.documents)} />
          <Row k={t(ui.license)} v="№ 88 · 07.08.2026" />
        </div>
        <p className="wait__fine">
          {lang === "ky"
            ? "Толук документтер esmar.kg сайтында жеткиликтүү."
            : "Полные документы доступны на сайте esmar.kg."}
        </p>
        <button className="btn btn--s" onClick={onClose}>
          {t(ui.done)}
        </button>
      </div>
    </Sheet>
  );
}

/** Все новости — лист из главного экрана и из карточки объекта. */
export function NewsSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { lang } = useApp();
  /* На телефоне карточка свёрнута до трёх строк: заголовок + начало статьи,
     остальное по тапу. Иначе один материал занимает весь экран. */
  const [full, setFull] = useState<number | null>(null);
  return (
    <Sheet onClose={onClose}>
      <h3 className="sheet__t">{t(ui.newsTitle)}</h3>
      <div className="news">
        {news.map((n, i) => (
          <div className="glass ncard" style={{ borderRadius: 20 }} key={i} data-full={full === i}>
            <div className="ncard__img">
              <img src={`${import.meta.env.BASE_URL}obj/${n.img}`} alt="" loading="lazy" />
            </div>
            <div className="ncard__b">
              <div className="ncard__h">
                <span className="ncard__tag" data-about={n.about}>
                  {n.tag[lang]}
                </span>
                <span>
                  {n.date} · {n.source}
                </span>
              </div>
              <h4>{n.title[lang]}</h4>
              <p>{n.text[lang]}</p>
              <div className="ncard__acts">
                <button
                  className="ncard__more"
                  type="button"
                  onClick={() => setFull(full === i ? null : i)}
                >
                  {full === i ? t(ui.collapse) : t(ui.readMore)}
                </button>
                <a href={n.url} target="_blank" rel="noreferrer">
                  {t(ui.readSourceShort)} <IcOut />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn btn--s" onClick={onClose}>
          {t(ui.done)}
        </button>
      </div>
    </Sheet>
  );
}

/** Заглушка «договор на подписи» — используется в профиле и на главной. */
export function ContractStub({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <Sheet onClose={onClose}>
      <div className="wait">
        <span className="seal">
          <IcSeal size={26} />
        </span>
        <b>{t(ui.offer)}</b>
        <p>{t(ui.signNote)}</p>
        <button className="btn btn--s" onClick={onClose}>
          {t(ui.done)}
        </button>
      </div>
    </Sheet>
  );
}

