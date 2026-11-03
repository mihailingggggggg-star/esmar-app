import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  Globe,
  Landmark,
  ListChecks,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Sprout,
  Sun,
  Moon,
} from "lucide-react";
import { api } from "../api/client";
import { useQuery } from "../api/hooks";
import { daysWord, fixed, money, useApp, useT } from "../lib/app";
import { COMPANY, ui } from "../lib/data";
import { Seg } from "../components/Seg";
import { Loading } from "../components/kit";

/**
 * Личный кабинет: данные клиента, статус проверки, менеджер, банковские счета
 * для вывода, автовывод по «Ренте», документы и заявки, реквизиты компании.
 */
export function Profile({
  onVerification,
  onTopUp,
  onFeed,
  onBrowse,
  onBack,
  onDocuments,
  onRequests,
  onSignIn,
}: {
  onVerification: () => void;
  onTopUp: () => void;
  onFeed: () => void;
  onBrowse: () => void;
  onBack: () => void;
  onDocuments: () => void;
  onRequests: () => void;
  onSignIn: () => void;
}) {
  const t = useT();
  const { lang, setLang, theme, setTheme, session, profile, setProfile, signOut, bump } = useApp();
  const [busy, setBusy] = useState(false);

  const analyticsQ = useQuery(() => api.getAnalytics(), [session?.phone]);
  const accountQ = useQuery(() => api.getAccount(), [session?.phone]);
  const strategiesQ = useQuery(() => api.getStrategies(), [session?.phone]);

  const a = analyticsQ.data;
  const strategies = strategiesQ.data ?? [];
  const first = strategies.length
    ? strategies.map((s) => new Date(`${s.startDate}T00:00:00`).getTime()).sort((x, y) => x - y)[0]
    : null;
  const daysIn = first ? Math.max(1, Math.floor((Date.now() - first) / 86_400_000) + 1) : 0;

  const toggleAuto = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const next = await api.patchMe({ autoWithdrawRent: !profile.autoWithdrawRent });
      setProfile({ ...profile, ...next });
    } finally {
      setBusy(false);
    }
  };

  const addAccount = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      await api.addBankAccount({
        bank: { ru: "Банк клиента", ky: "Кардардын банкы" },
        masked: "•••• 0000",
        currency: "USD",
        owner: profile.name,
      });
      bump();
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <div className="screen">
        <header className="pf__bar">
          <button className="pf__pill" onClick={onBack} type="button">
            <ArrowLeft size={15} strokeWidth={2.4} /> {t(ui.close)}
          </button>
        </header>
        <div className="pf__guest">
          <span className="pf__ring">
            <ShieldCheck size={26} strokeWidth={1.8} />
          </span>
          <h1>{t(ui.pfGuest)}</h1>
          <p>{t(ui.kycWhyShort)}</p>
          <button className="btn btn--p" onClick={onSignIn} type="button">
            {t(ui.signIn)}
          </button>
          <button className="btn btn--s" onClick={onBrowse} type="button">
            {t(ui.tabMarket)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className="pf__bar">
        <button className="pf__pill" onClick={onBack} type="button">
          <ArrowLeft size={15} strokeWidth={2.4} /> {t(ui.close)}
        </button>
        <button className="pf__pill pf__pill--icons" onClick={onFeed} type="button" aria-label={t(ui.history)}>
          <ListChecks size={15} strokeWidth={2.2} />
        </button>
      </header>

      <div className="pf__tools">
        <button className="pf__tool" onClick={() => setTheme(theme === "light" ? "dark" : "light")} type="button" aria-label={t(ui.theme)}>
          {theme === "light" ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
        </button>
        <button className="pf__tool" onClick={onVerification} type="button" aria-label={t(ui.kycTitle)}>
          <Settings size={17} strokeWidth={2} />
        </button>
        <span className="pf__money">
          <span className="pf__money-i">
            <CreditCard size={15} strokeWidth={2.2} />
          </span>
          <b className="tnum">{money(accountQ.data?.balance ?? 0)}</b>
          <button className="pf__add" onClick={onTopUp} type="button" aria-label={t(ui.topUp)}>
            <Plus size={17} strokeWidth={2.6} />
          </button>
        </span>
      </div>

      <span className="pf__ava">
        <span className="pf__ring">
          {profile?.name
            .split(" ")
            .filter(Boolean)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)}
        </span>
      </span>
      <h1 className="pf__name">{profile?.name}</h1>
      <span className="pf__handle">{profile?.phone}</span>

      <button className="pf__kyc" data-kyc={profile?.kyc ?? "none"} onClick={onVerification} type="button">
        <ShieldCheck size={15} strokeWidth={2.2} />
        {profile?.kyc === "verified" ? t(ui.kycVerified) : profile?.kyc === "pending" ? t(ui.kycPending) : t(ui.kycNone)}
        <ChevronRight size={14} strokeWidth={2.2} />
      </button>

      <div className="pf__stats">
        <div>
          <span className="pf__si">
            <Sprout size={15} strokeWidth={2.2} />
          </span>
          <b className="tnum">{a ? `${fixed(a.avgRate)}%` : "—"}</b>
          <span>{t(ui.pfYield)}</span>
        </div>
        <div>
          <span className="pf__si">
            <Building2 size={15} strokeWidth={2.2} />
          </span>
          <b className="tnum">{strategies.length}</b>
          <span>{t(ui.pfContractsLabel)}</span>
        </div>
        <div>
          <span className="pf__si">
            <FileText size={15} strokeWidth={2.2} />
          </span>
          <b className="tnum">{daysIn}</b>
          <span>
            {daysWord(daysIn)} {t(ui.pfDaysIn)}
          </span>
        </div>
      </div>

      <div className="pf__duo">
        <div className="pf__card">
          <span className="pf__face" aria-hidden>
            <Sprout size={17} strokeWidth={2.2} />
            <i className="pf__on" />
          </span>
          <b>{t(ui.manager)}</b>
          <span className="pf__sub">{profile?.manager.name}</span>
          <a className="pf__link" href={`https://wa.me/${COMPANY.whatsapp}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </div>

        <div className="pf__card">
          <span className="pf__cardico" aria-hidden>
            <Landmark size={17} strokeWidth={2} />
          </span>
          <b>{t(ui.bankAccounts)}</b>
          <div className="pf__accs">
            {(profile?.bankAccounts ?? []).map((b) => (
              <span key={b.id} className="pf__acc" data-status={b.status}>
                {t(b.bank)} · {b.masked}
                {b.status === "pending" && <i>{t(ui.accountPending)}</i>}
              </span>
            ))}
          </div>
          <button className="pf__addacc" onClick={addAccount} disabled={busy} type="button">
            <Plus size={13} strokeWidth={2.6} /> {t(ui.addAccount)}
          </button>
        </div>
      </div>

      <div className="pf__switch">
        <span>
          <b>{t(ui.autoWithdraw)}</b>
          <i>{t(ui.autoWithdrawHint)}</i>
        </span>
        <button
          className="switch"
          data-on={profile?.autoWithdrawRent}
          onClick={toggleAuto}
          disabled={busy}
          type="button"
          role="switch"
          aria-checked={profile?.autoWithdrawRent}
          aria-label={t(ui.autoWithdraw)}
        >
          <span />
        </button>
      </div>

      <div className="pf__list">
        <button className="pf__row" onClick={onDocuments} type="button">
          <span className="pf__row-i">
            <FileText size={16} strokeWidth={2} />
          </span>
          {t(ui.documents)}
          <ChevronRight size={16} strokeWidth={2.2} />
        </button>
        <button className="pf__row" onClick={onRequests} type="button">
          <span className="pf__row-i">
            <ListChecks size={16} strokeWidth={2} />
          </span>
          {t(ui.requests)}
          <ChevronRight size={16} strokeWidth={2.2} />
        </button>

        <div className="pf__row pf__row--seg">
          <span className="pf__row-i">
            <Globe size={16} strokeWidth={2} />
          </span>
          <span className="pf__row-t">{t(ui.lang)}</span>
          <Seg
            name="lang"
            small
            value={lang}
            onChange={(v) => setLang(v as "ru" | "ky")}
            options={[
              { v: "ru", label: "RU" },
              { v: "ky", label: "KG" },
            ]}
          />
        </div>

        <div className="pf__legal">
          <span>{t(ui.legalAddress)}</span>
          <b>{t(COMPANY.legalAddress)}</b>
          <span>{t(ui.officeAddress)}</span>
          <b>{t(COMPANY.address)}</b>
          <span>{t(ui.licence)}</span>
          <b>
            {COMPANY.license.no} · {COMPANY.license.date}
          </b>
          <span>{COMPANY.legal}</span>
          <b>{COMPANY.phone}</b>
        </div>
      </div>

      {analyticsQ.loading && <Loading />}

      <button
        className="pf__out"
        onClick={() => {
          signOut();
          onBack();
        }}
        type="button"
      >
        <LogOut size={15} strokeWidth={2.2} />
        {t(ui.signOut)}
      </button>
    </motion.div>
  );
}
