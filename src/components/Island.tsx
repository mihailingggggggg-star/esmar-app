import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { MarkEsmar } from "./Logo";
import { money, useT } from "../lib/app";
import { ui } from "../lib/data";

/**
 * «Динамический остров» вместо шапки: капсула с личным счётом и балансом.
 * Анимация — приём веб-клонов Dynamic Island на framer-motion: пружина на
 * ширину/высоту/радиус + кроссфейд содержимого.
 */
export function AccountIsland({
  user,
  balance,
  onTopUp,
  onWithdraw,
  onLogin,
}: {
  user: boolean;
  balance: number;
  onTopUp: () => void;
  onWithdraw: () => void;
  onLogin: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  /* после входа остров закрываем — иначе он остаётся раскрытым и мешает */
  useEffect(() => {
    if (user) setOpen(false);
  }, [user]);

  const wide = Math.min(322, window.innerWidth - 36);

  return (
    <motion.div
      className="island"
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={t(ui.personal)}
      data-open={open}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
      animate={{ width: open ? wide : 216, height: open ? "auto" : 40, borderRadius: open ? 28 : 999 }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
    >
      <motion.div className="island__row" layout="position">
        <span className="island__mark" aria-hidden>
          <MarkEsmar size={13} />
        </span>
        <span className="island__k">{t(ui.personal)}</span>
        <motion.span
          className="island__v tnum"
          data-off={!user}
          animate={{ opacity: open ? 0 : 1 }}
          transition={{ duration: 0.16 }}
        >
          {user ? money(balance) : "—"}
        </motion.span>
      </motion.div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="more"
            className="island__more"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, delay: open ? 0.06 : 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {user ? (
              <>
                <div className="island__head">
                  <span className="island__acc">•••• 9047</span>
                  <span className="island__chev">
                    <ChevronUp size={13} strokeWidth={2.4} />
                  </span>
                </div>
                <div className="island__big tnum">{money(balance, 2)}</div>
                <div className="island__sub">{t(ui.free)}</div>
                <div className="island__btns">
                  <button className="island__btn island__btn--p" onClick={onTopUp} type="button">
                    {t(ui.topUp)}
                  </button>
                  <button className="island__btn" onClick={onWithdraw} type="button">
                    {t(ui.withdraw)}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="island__guest">
                  <b>{t(ui.islandGuest)}</b>
                  <span>{t(ui.islandGuestSub)}</span>
                </div>
                <button className="island__btn island__btn--p" onClick={onLogin} type="button">
                  {t(ui.signIn)}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
