import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppCtx, useApp, type Theme } from "./lib/app";
import type { Lang } from "./lib/data";
import { api } from "./api/client";
import { useQuery } from "./api/hooks";
import type { Profile, Session } from "./api/types";
import { Nav, type Tab } from "./components/Nav";
import { Splash } from "./components/Splash";
import { Home } from "./screens/Home";
import { Market } from "./screens/Market";
import { Profile as ProfileScreen } from "./screens/Profile";
import { Asset } from "./screens/Asset";
import { Auth } from "./screens/Auth";
import { Verification } from "./screens/Verification";
import { Documents } from "./screens/Documents";
import { Requests } from "./screens/Requests";
import { EarlyExit, FeedSheet, Invest, NewsSheet, TopUp, Withdraw } from "./screens/Flows";

const Stats = lazy(() => import("./screens/Stats").then((m) => ({ default: m.Stats })));

const LS = {
  lang: "esmar-lang",
  theme: "esmar-theme",
  session: "esmar-session",
};

function read(key: string, allowed: string[], fallback: string) {
  try {
    const v = localStorage.getItem(key);
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    /* приватный режим — настройка не переживёт перезапуск */
  }
}

/**
 * Корень приложения: тема, язык, сессия клиента. Данные приходят из API-клиента,
 * поэтому экран не знает, моки это или бэкенд.
 */
export default function Root() {
  const [lang, setLang] = useState<Lang>(() => read(LS.lang, ["ru", "ky"], "ru") as Lang);
  const [theme, setTheme] = useState<Theme>(() => read(LS.theme, ["light", "dark"], "light") as Theme);
  const [session, setSession] = useState<Session | null>(() => readJson<Session | null>(LS.session, null));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [version, setVersion] = useState(0);
  const [booting, setBooting] = useState(true);

  const productsQ = useQuery(() => api.getProducts(), []);
  const companyQ = useQuery(() => api.getCompany(), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#fbf7ef" : "#0b0e06");
    write(LS.theme, theme);
    write(LS.lang, lang);
  }, [theme, lang]);

  useEffect(() => write(LS.session, session), [session]);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    let alive = true;
    api
      .getMe()
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfile(null));
    return () => {
      alive = false;
    };
  }, [session, version]);

  const signIn = useCallback((s: Session) => setSession(s), []);
  const signOut = useCallback(() => {
    api.logout();
    setSession(null);
    setProfile(null);
  }, []);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const ctx = useMemo(
    () => ({
      lang,
      setLang,
      theme,
      setTheme,
      session,
      profile,
      signIn,
      signOut,
      products: productsQ.data ?? {},
      company: companyQ.data,
      version,
      bump,
      setProfile,
    }),
    [lang, theme, session, profile, signIn, signOut, productsQ.data, companyQ.data, version, bump]
  );

  return (
    <AppCtx.Provider value={ctx}>
      {booting ? (
        <div className="app">
          <AnimatePresence>
            <Splash key="splash" onDone={() => setBooting(false)} />
          </AnimatePresence>
        </div>
      ) : (
        <Shell />
      )}
    </AppCtx.Provider>
  );
}

function Shell() {
  const { session, profile, bump } = useApp();
  const [tab, setTab] = useState<Tab>("home");
  const [asset, setAsset] = useState<string | null>(null);
  const [topUp, setTopUp] = useState(false);
  const [invest, setInvest] = useState<string | null>(null);
  const [exit, setExit] = useState<string | null>(null);
  const [auth, setAuth] = useState(false);
  const [verification, setVerification] = useState(false);
  const [newsAll, setNewsAll] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [documents, setDocuments] = useState(false);
  const [requests, setRequests] = useState(false);
  const [withdraw, setWithdraw] = useState(false);

  /* Действие, отложенное до входа или проверки личности. */
  const pending = useRef<null | (() => void)>(null);
  const runPending = useCallback(() => {
    const run = pending.current;
    pending.current = null;
    if (run) window.setTimeout(run, 260);
  }, []);

  /** Действия, для которых нужен вход. */
  const gate = useCallback(
    (run: () => void) => {
      if (session) {
        run();
        return;
      }
      pending.current = run;
      setAuth(true);
    },
    [session]
  );

  /** Вложение и вывод дополнительно требуют пройденной проверки личности. */
  const gateVerified = useCallback(
    (run: () => void) => {
      if (!session) {
        pending.current = () => gateVerified(run);
        setAuth(true);
        return;
      }
      if (profile?.kyc === "verified") {
        run();
        return;
      }
      pending.current = run;
      setVerification(true);
    },
    [session, profile]
  );

  return (
    <div className="app">
      <div className="bg" aria-hidden>
        <span />
        <span />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          {tab === "home" && (
            <Home
              onAsset={setAsset}
              onStats={() => setTab("stats")}
              onAll={() => gate(() => setFeedOpen(true))}
              onVerification={() => (session ? setVerification(true) : setAuth(true))}
              onBrowse={() => setTab("market")}
              onAllNews={() => setNewsAll(true)}
              onTopUp={() => gate(() => setTopUp(true))}
              onWithdraw={() => gateVerified(() => setWithdraw(true))}
              onInvest={(id) => gateVerified(() => setInvest(id))}
              onDocuments={() => gate(() => setDocuments(true))}
              onRequests={() => gate(() => setRequests(true))}
              onSignIn={() => setAuth(true)}
              onEarlyExit={(id: string) => gateVerified(() => setExit(id))}
              onProlong={async (id: string) => {
                await api.createRequest({ type: "prolong", note: id });
                bump();
                setRequests(true);
              }}
            />
          )}
          {tab === "market" && <Market onAsset={setAsset} onProfile={() => setTab("profile")} />}
          {tab === "stats" && (
            <Suspense fallback={<div className="screen" />}>
              <Stats onVerification={() => setVerification(true)} onBack={() => setTab("home")} />
            </Suspense>
          )}
          {tab === "profile" && (
            <ProfileScreen
              onVerification={() => setVerification(true)}
              onTopUp={() => gate(() => setTopUp(true))}
              onFeed={() => gate(() => setFeedOpen(true))}
              onBrowse={() => setTab("market")}
              onBack={() => setTab("home")}
              onDocuments={() => gate(() => setDocuments(true))}
              onRequests={() => gate(() => setRequests(true))}
              onSignIn={() => setAuth(true)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <Nav tab={tab} onTab={setTab} onTopUp={() => gate(() => setTopUp(true))} />

      <AnimatePresence>
        {asset && (
          <Asset
            key={asset}
            id={asset}
            onBack={() => setAsset(null)}
            onInvest={() => gateVerified(() => setInvest(asset))}
            onEarlyExit={(strategyId) => gateVerified(() => setExit(strategyId))}
            onManager={() => (session ? setVerification(true) : setAuth(true))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{topUp && <TopUp key="topup" onClose={() => setTopUp(false)} />}</AnimatePresence>
      <AnimatePresence>{withdraw && <Withdraw key="wd" onClose={() => setWithdraw(false)} />}</AnimatePresence>
      <AnimatePresence>
        {invest && <Invest key="inv" objectId={invest} onClose={() => setInvest(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {exit && <EarlyExit key="exit" strategyId={exit} onClose={() => setExit(null)} />}
      </AnimatePresence>
      <AnimatePresence>{newsAll && <NewsSheet key="news" onClose={() => setNewsAll(false)} />}</AnimatePresence>
      <AnimatePresence>{feedOpen && <FeedSheet key="feed" onClose={() => setFeedOpen(false)} />}</AnimatePresence>
      <AnimatePresence>
        {documents && <Documents key="docs" onClose={() => setDocuments(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {requests && <Requests key="req" onClose={() => setRequests(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {auth && (
          <Auth
            key="auth"
            onClose={() => {
              pending.current = null;
              setAuth(false);
            }}
            onDone={() => {
              setAuth(false);
              runPending();
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {verification && (
          <Verification
            key="ver"
            onClose={() => {
              pending.current = null;
              setVerification(false);
            }}
            onBooked={() => {
              setVerification(false);
              runPending();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
