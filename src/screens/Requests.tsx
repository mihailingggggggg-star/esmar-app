import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock3, ListChecks, X } from "lucide-react";
import { api } from "../api/client";
import { useQuery } from "../api/hooks";
import { money, shortDate, timeOf, useT } from "../lib/app";
import { ui } from "../lib/data";
import { ErrorState, Loading } from "../components/kit";

/**
 * Заявки клиента: всё, что уходит менеджеру, бухгалтеру и Сергею на подтверждение.
 * Пока заявка «новая», её можно отменить. У досрочного выхода видно место в очереди.
 */
export function Requests({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, error, reload } = useQuery(() => api.getRequests(), []);

  const cancel = async (id: string) => {
    setBusy(id);
    try {
      await api.cancelRequest(id);
      reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div
      className="screen reqs"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="an__top">
        <button className="an__round" onClick={onClose} type="button" aria-label={t(ui.back)}>
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <span className="an__title">{t(ui.requests)}</span>
        <span />
      </header>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (data ?? []).length === 0 && (
        <div className="empty">
          <ListChecks size={22} strokeWidth={1.8} />
          <b>{t(ui.requestEmpty)}</b>
          <span>{t(ui.requestEmptyHint)}</span>
        </div>
      )}

      <div className="reqs__list">
        {(data ?? []).map((r) => (
          <article className="req" key={r.id} data-status={r.status}>
            <div className="req__top">
              <b>{t(r.title)}</b>
              {r.amount !== null && <span className="tnum">{money(r.amount)}</span>}
            </div>
            <span className="req__sub">{t(r.sub)}</span>

            <div className="req__foot">
              <span className="req__status" data-status={r.status}>
                <Clock3 size={12} strokeWidth={2.4} />
                {t(r.statusLabel)}
              </span>
              <span className="req__date">
                {shortDate(r.createdAt)}, {timeOf(r.createdAt)}
              </span>
            </div>

            {r.queue !== null && (
              <span className="req__queue">
                {t(ui.queuePlace)}: {r.queue}
              </span>
            )}

            {r.status === "new" && (
              <button
                className="req__cancel"
                type="button"
                onClick={() => cancel(r.id)}
                disabled={busy === r.id}
              >
                <X size={13} strokeWidth={2.6} />
                {t(ui.cancelRequest)}
              </button>
            )}
          </article>
        ))}
      </div>

      <p className="demo">{t(ui.requestsHint)}</p>
    </motion.div>
  );
}
