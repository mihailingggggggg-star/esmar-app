import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Loader, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { ApiError } from "../api/types";
import { useApp } from "../lib/app";
import { ui, COMPANY } from "../lib/data";
import { useT } from "../lib/app";

/**
 * Вход по телефону и коду из SMS (POST /auth/otp/*). В демо подходит любой
 * код из 6 цифр — бэкенд заменит проверку, экран не меняется.
 */
export function Auth({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useT();
  const { signIn } = useApp();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("+996 ");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agree, setAgree] = useState(true);
  const [secs, setSecs] = useState(0);
  const timer = useRef<number | null>(null);

  const validPhone = phone.replace(/\D/g, "").length >= 12;

  const startTimer = () => {
    setSecs(60);
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setSecs((s) => {
        if (s <= 1 && timer.current) window.clearInterval(timer.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.requestOtp(phone);
      setStep("code");
      startTimer();
    } catch (e) {
      setError(e instanceof ApiError && e.code === "network" ? t(ui.netError) : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await api.verifyOtp(phone, code);
      signIn(session);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError && e.code === "validation" ? t(ui.authCode) : t(ui.netError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="auth"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="auth__bg" aria-hidden />
      <motion.div
        className="auth__card"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <button className="auth__x" onClick={onClose} type="button" aria-label={t(ui.close)}>
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>

        <span className="auth__i">
          <ShieldCheck size={22} strokeWidth={2} />
        </span>
        <h2 className="auth__t">{t(ui.authTitle)}</h2>
        <p className="auth__p">
          {step === "phone" ? t(ui.authAgree) : `${t(ui.authCode)} · ${phone}`}
        </p>

        <AnimatePresence mode="wait" initial={false}>
          {step === "phone" ? (
            <motion.div key="phone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <label className="field">
                <span>{t(ui.authPhone)}</span>
                <input
                  value={phone}
                  inputMode="tel"
                  autoComplete="tel"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+996 555 00 00 00"
                />
              </label>

              <label className="auth__agree">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>
                  {t(ui.authAgree)}{" "}
                  <a href={`${COMPANY.site}/dokumenty`} target="_blank" rel="noreferrer">
                    {t(ui.documents)}
                  </a>
                </span>
              </label>

              {error && <div className="auth__err">{error}</div>}

              <button
                className="btn btn--p"
                onClick={send}
                disabled={!validPhone || !agree || busy}
                type="button"
              >
                {busy ? <Loader size={18} className="spin" /> : t(ui.authSendCode)}
              </button>
            </motion.div>
          ) : (
            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <label className="field">
                <span>{t(ui.authCode)}</span>
                <input
                  value={code}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="tnum auth__code"
                />
              </label>

              <p className="auth__hint">{t(ui.authDemoHint)}</p>
              {error && <div className="auth__err">{error}</div>}

              <button className="btn btn--p" onClick={verify} disabled={code.length !== 6 || busy} type="button">
                {busy ? <Loader size={18} className="spin" /> : t(ui.confirm)}
              </button>

              <button
                className="auth__resend"
                onClick={() => secs === 0 && send()}
                disabled={secs > 0}
                type="button"
              >
                {secs > 0 ? `${t(ui.authResend)} · 0:${String(secs).padStart(2, "0")}` : t(ui.authResend)}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <span className="auth__foot">
          <Check size={12} strokeWidth={3} /> {t(ui.licence)} {COMPANY.license.no} · {COMPANY.license.date}
        </span>
      </motion.div>
    </motion.div>
  );
}
