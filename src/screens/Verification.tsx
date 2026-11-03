import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, Loader, PhoneCall, Video } from "lucide-react";
import { api } from "../api/client";
import { ApiError } from "../api/types";
import { useApp, useT } from "../lib/app";
import { ui } from "../lib/data";

/**
 * Проверка личности в v1: заявку и анкету (Прил. №4) оформляет менеджер на
 * встрече или по видеозвонку. Приложение показывает статус и даёт записаться.
 * Автоматическая проверка с камерой — во второй версии (Sumsub).
 */
export function Verification({ onClose, onBooked }: { onClose: () => void; onBooked: () => void }) {
  const t = useT();
  const { profile } = useApp();
  const [step, setStep] = useState<"status" | "form" | "done">("status");
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "+996 ");
  const [amount, setAmount] = useState("");
  const [format, setFormat] = useState<"office" | "video" | "call">("office");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kyc = profile?.kyc ?? "none";
  const verified = kyc === "verified";

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.createLead({
        name: name.trim(),
        phone,
        amount: amount ? Math.round(Number(amount.replace(/\D/g, "")) * 100) : null,
        format,
        time,
        source: "app",
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof ApiError ? t(ui.netError) : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen ver">
      <header className="an__top">
        <button className="an__round" onClick={onClose} type="button" aria-label={t(ui.back)}>
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <span className="an__title">{t(ui.kycTitle)}</span>
        <span />
      </header>

      <div className="ver__status" data-kyc={kyc}>
        <span className="ver__i">
          {verified ? (
            <CheckCircle2 size={22} strokeWidth={2} />
          ) : kyc === "pending" ? (
            <Clock3 size={22} strokeWidth={2} />
          ) : (
            <CalendarClock size={22} strokeWidth={2} />
          )}
        </span>
        <div>
          <b>
            {verified
              ? t(ui.kycVerified)
              : kyc === "pending"
                ? t(ui.kycPending)
                : kyc === "rejected"
                  ? t(ui.kycRejected)
                  : t(ui.kycNone)}
          </b>
          <span>{verified ? t(ui.kycWhy) : t(ui.kycWhyShort)}</span>
        </div>
      </div>

      {step === "status" && (
        <div className="ver__body">
          {!verified && (
            <ul className="ver__list">
              <li>{t(ui.verStep1)}</li>
              <li>{t(ui.verStep2)}</li>
              <li>{t(ui.verStep3)}</li>
            </ul>
          )}

          {verified ? (
            <>
              <p className="ver__fine">{t(ui.kycVerifiedHint)}</p>
              <button className="btn btn--s" onClick={onClose} type="button">
                {t(ui.close)}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn--p" onClick={() => setStep("form")} type="button">
                {t(ui.bookMeeting)}
              </button>
              <button className="btn btn--s" onClick={onClose} type="button">
                {t(ui.later)}
              </button>
            </>
          )}
        </div>
      )}

      {step === "form" && (
        <div className="ver__body">
          <label className="field">
            <span>{t(ui.yourName)}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t(ui.kycNamePh)} />
          </label>
          <label className="field">
            <span>{t(ui.yourPhone)}</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </label>
          <label className="field">
            <span>{t(ui.wantedAmount)}</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="1 000"
              className="tnum"
            />
          </label>

          <div className="field">
            <span>{t(ui.meetingFormat)}</span>
            <div className="ver__formats" role="tablist">
              {(
                [
                  ["office", t(ui.fmtOffice), CalendarClock],
                  ["video", t(ui.fmtVideo), Video],
                  ["call", t(ui.fmtCall), PhoneCall],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={format === id}
                  data-on={format === id}
                  onClick={() => setFormat(id)}
                >
                  <Icon size={17} strokeWidth={2} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>{t(ui.meetingTime)}</span>
            <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="Пн–Пт, 10:00–18:00" />
          </label>

          {error && <div className="auth__err">{error}</div>}

          <button
            className="btn btn--p"
            onClick={send}
            disabled={busy || name.trim().length < 2 || phone.replace(/\D/g, "").length < 12}
            type="button"
          >
            {busy ? <Loader size={18} className="spin" /> : t(ui.bookMeeting)}
          </button>
          <p className="ver__fine">{t(ui.kycAgree)}</p>
        </div>
      )}

      {step === "done" && (
        <motion.div className="ver__body ver__done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="seal">
            <CheckCircle2 size={26} strokeWidth={2} />
          </span>
          <b>{t(ui.meetingSent)}</b>
          <p>{t(ui.meetingSentHint)}</p>
          <button className="btn btn--p" onClick={onBooked} type="button">
            {t(ui.close)}
          </button>
        </motion.div>
      )}
    </div>
  );
}
