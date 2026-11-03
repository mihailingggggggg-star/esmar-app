import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  Copy,
  CreditCard,
  FileSignature,
  Loader,
  Percent,
  Stamp,
  Wallet,
} from "lucide-react";
import { api, calculate } from "../api/client";
import { useQuery } from "../api/hooks";
import type { RequestType, Strategy } from "../api/types";
import { ApiError } from "../api/types";
import { copyText, fixed, longDate, money, shortDate, useApp, useT } from "../lib/app";
import { ui } from "../lib/data";
import { Sheet } from "../components/Sheet";

/* ------------------------------------------------------------------ */
/*  Общие куски                                                        */
/* ------------------------------------------------------------------ */

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="dl__row">
      <span>{k}</span>
      <b className={accent ? "accent tnum" : "tnum"}>{v}</b>
    </div>
  );
}

function Success({
  title,
  text,
  onClose,
  icon = <Check size={22} strokeWidth={2.6} />,
}: {
  title: string;
  text: string;
  onClose: () => void;
  icon?: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className="flow__done">
      <motion.span
        className="seal seal--lg"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
      >
        {icon}
      </motion.span>
      <b>{title}</b>
      <p>{text}</p>
      <button className="btn btn--p" onClick={onClose} type="button">
        {t(ui.close)}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Пополнение: реквизиты счёта ДУ + QR + номер клиента                */
/* ------------------------------------------------------------------ */

export function TopUp({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { data, loading, error } = useQuery(() => api.getAccount(), []);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, value: string) => {
    await copyText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Sheet onClose={onClose}>
      <h3 className="sheet__t">{t(ui.topUp)}</h3>

      {loading && <div className="flow__load"><Loader size={18} className="spin" /></div>}
      {error && <div className="note note--dim">{t(ui.netError)}</div>}

      {data && (
        <>
          <div className="flow__qr">
            <QRCodeSVG value={data.requisites.qrPayload} size={116} bgColor="transparent" fgColor="currentColor" />
            <span>{t(ui.scanToPay)}</span>
          </div>

          <div className="dl">
            <Row k={t(ui.clientNo)} v={data.clientNo} accent />
            <Row k={t(ui.bank)} v={t(data.requisites.bank)} />
            <Row k={t(ui.account)} v={data.requisites.account} />
            <Row k="ИНН" v={data.requisites.inn} />
            <Row k="БИК" v={data.requisites.bik} />
          </div>

          <div className="flow__purpose">
            <span>{t(ui.payPurpose)}</span>
            <p>{t(data.requisites.purpose)}</p>
            <button className="flow__copy" type="button" onClick={() => copy("p", t(data.requisites.purpose))}>
              {copied === "p" ? <Check size={13} strokeWidth={2.6} /> : <Copy size={13} strokeWidth={2.2} />}
              {copied === "p" ? t(ui.coped) : t(ui.copy)}
            </button>
          </div>

          <div className="note note--warn">
            <AlertTriangle size={14} strokeWidth={2.2} /> {t(ui.payOnlyOwn)}
          </div>

          <div className="flow__status">
            <span className="flow__dot" />
            {t(ui.awaitingPayment)}
          </div>

          <p className="flow__fine">{t(ui.topUpHint)}</p>

          <button className="btn btn--p" onClick={onClose} type="button">
            {t(ui.close)}
          </button>
        </>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Вывод: сумма + подтверждённые счета, до 3 рабочих дней              */
/* ------------------------------------------------------------------ */

export function Withdraw({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { bump } = useApp();
  const accountQ = useQuery(() => api.getAccount(), []);
  const meQ = useQuery(() => api.getMe(), []);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accounts = (meQ.data?.bankAccounts ?? []).filter((b) => b.status === "confirmed");
  const cents = Math.round(Number(amount.replace(/\D/g, "") || 0) * 100);
  const available = accountQ.data?.available ?? 0;
  const invalid = cents <= 0 || cents > available || !accountId;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.createRequest({ type: "withdraw", amount: cents, bankAccountId: accountId ?? undefined });
      bump();
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? t(ui.netError) : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Sheet onClose={onClose}>
        <Success title={t(ui.requestSent)} text={t(ui.withdrawTerm)} onClose={onClose} />
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <h3 className="sheet__t">{t(ui.withdrawTitle)}</h3>
      <p className="flow__avail">
        {t(ui.available)}: <b className="tnum">{money(available)}</b>
      </p>

      <div className="flow__amount">
        <input
          value={amount}
          inputMode="numeric"
          placeholder="0"
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 12))}
          className="tnum"
        />
        <span>$</span>
      </div>

      <div className="field__k">{t(ui.savedAccounts)}</div>
      <div className="flow__accs">
        {accounts.map((b) => (
          <button
            key={b.id}
            className="flow__acc"
            data-on={accountId === b.id}
            onClick={() => setAccountId(b.id)}
            type="button"
          >
            <CreditCard size={17} strokeWidth={2} />
            <span>
              <b>{t(b.bank)}</b>
              <i>{b.masked}</i>
            </span>
            {accountId === b.id && <Check size={15} strokeWidth={3} />}
          </button>
        ))}
        {accounts.length === 0 && (
          <div className="note note--dim">{t(ui.noAccounts)}</div>
        )}
      </div>

      <div className="note note--dim">{t(ui.withdrawTerm)}</div>
      {error && <div className="auth__err">{error}</div>}

      <button className="btn btn--p" onClick={submit} disabled={invalid || busy} type="button">
        {busy ? <Loader size={18} className="spin" /> : t(ui.requestWithdraw)}
      </button>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Вложение: оферта с расчётом по ДДУ                                 */
/* ------------------------------------------------------------------ */

export function Invest({ objectId, onClose }: { objectId: string; onClose: () => void }) {
  const t = useT();
  const { bump } = useApp();
  const objectQ = useQuery(() => api.getObject(objectId), [objectId]);
  const productsQ = useQuery(() => api.getProducts(), []);
  const [amount, setAmount] = useState("1000");
  const [sign, setSign] = useState<"office" | "scan" | "notary">("office");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const o = objectQ.data;
  const cents = Math.round(Number(amount.replace(/\D/g, "") || 0) * 100);

  const calc = useMemo(() => {
    if (!o) return null;
    return calculate(
      { product: o.product, amount: cents, handoverDate: o.handoverDate },
      o.target
    );
  }, [o, cents]);

  const min = o?.min ?? 100_00;
  const invalid = !o || cents < min || !calc;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.createRequest({
        type: (o?.product === "partnership" ? "partnership" : "invest") as RequestType,
        amount: cents,
        objectId: objectId,
        note: sign,
      });
      bump();
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? t(ui.netError) : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Sheet onClose={onClose}>
        <Success
          title={t(ui.requestAccepted)}
          text={t(ui.requestAcceptedHint)}
          onClose={onClose}
          icon={<Stamp size={22} strokeWidth={2} />}
        />
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <h3 className="sheet__t">
        {o?.product === "partnership" ? t(ui.requestToManager) : t(ui.invest)} · {o ? t(o.name) : ""}
      </h3>

      {objectQ.loading && <div className="flow__load"><Loader size={18} className="spin" /></div>}
      {objectQ.error && <div className="note note--dim">{t(ui.netError)}</div>}

      {o && calc && o.product !== "partnership" && (
        <>
          <div className="flow__amount">
            <input
              value={amount}
              inputMode="numeric"
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 12))}
              className="tnum"
            />
            <span>$</span>
          </div>
          <div className="flow__hint">
            {t(ui.minTicket)}: {money(min)} · {t(ui.noMax)}
          </div>

          <div className="dl">
            <Row k={t(ui.targetRateLabel)} v={`${fixed(calc.rate, calc.rate % 1 ? 2 : 0)}% ${t(ui.perYear)}`} accent />
            <Row k={t(ui.term)} v={`${calc.months} ${t(ui.monthsShort)}`} />
            <Row k={t(ui.endDate)} v={shortDate(calc.endDate)} />
            <Row k={t(ui.shareVolume)} v={`${fixed(calc.sharePct, 2)}%`} />
            <Row k={t(ui.calcIncome)} v={money(calc.income)} accent />
          </div>

          <div className="field__k">{t(ui.signingMethod)}</div>
          <div className="flow__sign">
            {(
              [
                ["office", t(ui.signOffice), Building2],
                ["scan", t(ui.signScan), FileSignature],
                ["notary", t(ui.signNotary), Stamp],
              ] as const
            ).map(([id, label, Icon]) => (
              <button key={id} type="button" data-on={sign === id} onClick={() => setSign(id)}>
                <Icon size={16} strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>

          <div className="note note--dim">{t(ui.rateNotGuaranteed)}</div>
          {error && <div className="auth__err">{error}</div>}

          <button className="btn btn--p" onClick={submit} disabled={invalid || busy} type="button">
            {busy ? <Loader size={18} className="spin" /> : t(ui.submitRequest)}
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>

          <p className="flow__fine">{t(ui.offerNote)}</p>
        </>
      )}

      {o && o.product === "partnership" && (
        <>
          <div className="dl">
            <Row k={t(ui.rate)} v={t(productsQ.data?.partnership?.rateNote ?? ui.targetRate)} accent />
            <Row k={t(ui.term)} v={t(ui.termIndividually)} />
            <Row k={t(ui.minTicket)} v={money(o.min)} />
          </div>
          <div className="note note--dim">{t(ui.partnershipOnly)}</div>
          <button className="btn btn--p" onClick={submit} disabled={busy} type="button">
            {busy ? <Loader size={18} className="spin" /> : t(ui.requestToManager)}
          </button>
        </>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Досрочный выход: расчёт по ДДУ и заявление                         */
/* ------------------------------------------------------------------ */

export function EarlyExit({ strategyId, onClose }: { strategyId: string; onClose: () => void }) {
  const t = useT();
  const { bump } = useApp();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const strategyQ = useQuery(() => api.getStrategy(strategyId), [strategyId]);
  const quoteQ = useQuery(() => api.getEarlyExitQuote(strategyId), [strategyId]);
  const objectQ = useQuery(() => (strategyQ.data ? api.getObject(strategyQ.data.objectId) : Promise.resolve(null)), [strategyQ.data?.objectId]);

  const s: Strategy | null = strategyQ.data;
  const q = quoteQ.data;

  const submit = async () => {
    setBusy(true);
    try {
      await api.createRequest({ type: "early_exit", amount: q?.quote.refund, note: strategyId });
      bump();
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Sheet onClose={onClose}>
        <Success title={t(ui.requestSent)} text={t(ui.earlyExitHint)} onClose={onClose} />
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <h3 className="sheet__t">{t(ui.earlyExit)}</h3>

      {strategyQ.loading && <div className="flow__load"><Loader size={18} className="spin" /></div>}

      {s && q && (
        <>
          <div className="flow__obj">
            <span className="flow__obj-i"><Wallet size={18} strokeWidth={2} /></span>
            <span>
              <b>{objectQ.data ? t(objectQ.data.name) : s.objectId}</b>
              <i>
                {t(ui.contractNo)} {s.no}
              </i>
            </span>
          </div>

          {!q.available ? (
            <div className="note note--warn">
              <Percent size={14} strokeWidth={2.2} /> {t(ui.earlyExitLocked)} {longDate(q.availableAt)} (ДДУ, Прил. №2 п. 10.2)
            </div>
          ) : (
            <>
              <div className="dl">
                <Row k={t(ui.body)} v={money(q.quote.amount)} />
                <Row k={t(ui.recalcIncome)} v={money(q.quote.recalculated)} />
                <Row k={t(ui.alreadyPaid)} v={`− ${money(q.quote.paid)}`} />
                <Row k={t(ui.tax)} v={`− ${money(q.quote.tax)}`} />
                <Row k={t(ui.toRefund)} v={money(q.quote.refund)} accent />
              </div>

              <div className="note note--dim">{t(ui.earlyExitHint)}</div>
              <button className="btn btn--p" onClick={submit} disabled={busy} type="button">
                {busy ? <Loader size={18} className="spin" /> : t(ui.submitEarlyExit)}
              </button>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Лента операций и новости                                           */
/* ------------------------------------------------------------------ */

export function FeedSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { data, loading, error } = useQuery(() => api.getOperations(), []);

  return (
    <Sheet onClose={onClose}>
      <h3 className="sheet__t">{t(ui.history)}</h3>
      {loading && <div className="flow__load"><Loader size={18} className="spin" /></div>}
      {error && <div className="note note--dim">{t(ui.netError)}</div>}
      <div className="txs">
        {(data ?? []).map((o) => (
          <div className="tx" key={o.id} data-pending={o.status === "pending"}>
            <span className="tx__i" data-tone={o.amount > 0 ? "up" : undefined}>
              {o.amount > 0 ? <Check size={16} strokeWidth={2.6} /> : <ArrowRight size={16} strokeWidth={2.4} />}
            </span>
            <span className="tx__b">
              <span className="tx__t">{t(o.title)}</span>
              <span className="tx__s">
                {t(o.sub)} · {shortDate(o.date)}
              </span>
            </span>
            <span className={`tx__a tnum ${o.amount > 0 ? "up" : ""}`}>
              {o.amount > 0 ? "+" : "−"}
              {money(Math.abs(o.amount))}
            </span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

export function NewsSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { data } = useQuery(() => api.getNews(), []);
  const [full, setFull] = useState<string | null>(null);

  return (
    <Sheet onClose={onClose}>
      <h3 className="sheet__t">{t(ui.newsTitle)}</h3>
      {(data ?? []).map((n) => (
        <article className="newsitem" key={n.id} data-full={full === n.id}>
          <div className="newsitem__top">
            <span className="ncard__tag">{t(n.tag)}</span>
            <span>{n.date}</span>
          </div>
          <h4>{t(n.title)}</h4>
          <p data-clamp={full !== n.id}>{t(n.text)}</p>
          <div className="newsitem__acts">
            <button type="button" onClick={() => setFull(full === n.id ? null : n.id)}>
              {full === n.id ? t(ui.collapse) : t(ui.readMore)}
            </button>
            <a href={n.url} target="_blank" rel="noreferrer">
              {t(ui.readSourceShort)}
            </a>
          </div>
        </article>
      ))}
    </Sheet>
  );
}
