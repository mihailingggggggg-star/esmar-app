import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, FileSignature, FileCheck2, Receipt, Loader, AlertCircle } from "lucide-react";
import { api } from "../api/client";
import { useQuery } from "../api/hooks";
import type { DocKind } from "../api/types";
import { shortDate, useT } from "../lib/app";
import { ui } from "../lib/data";
import { ErrorState, Loading } from "../components/kit";

/**
 * Документы клиента: договоры и приложения, отчёты с окном замечаний (10 дней,
 * ДДУ п. 5.3), акты выполненных работ и справки. Отчёты приходят из CRM.
 */
export function Documents({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [kind, setKind] = useState<DocKind | "all">("all");
  const { data, loading, error, reload } = useQuery(() => api.getDocuments(), []);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [objFor, setObjFor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const tabs: { id: DocKind | "all"; label: string; icon: typeof FileText }[] = [
    { id: "all", label: t(ui.catAll), icon: FileText },
    { id: "contract", label: t(ui.docsContracts), icon: FileSignature },
    { id: "report", label: t(ui.docsReports), icon: FileText },
    { id: "act", label: t(ui.docsActs), icon: FileCheck2 },
    { id: "statement", label: t(ui.docsStatements), icon: Receipt },
  ];

  const list = (data ?? []).filter((d) => kind === "all" || d.kind === kind || (kind === "contract" && d.kind === "appendix"));

  const sendObjection = async (id: string) => {
    setBusy(true);
    try {
      await api.objectToReport(id, text);
      setSent((s) => ({ ...s, [id]: true }));
      setObjFor(null);
      setText("");
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="screen docs"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="an__top">
        <button className="an__round" onClick={onClose} type="button" aria-label={t(ui.back)}>
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <span className="an__title">{t(ui.documents)}</span>
        <span />
      </header>

      <div className="docs__tabs" role="tablist">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={kind === id}
            data-on={kind === id}
            onClick={() => setKind(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && list.length === 0 && (
        <div className="empty">
          <b>{t(ui.emptyHere)}</b>
          <span>{t(ui.docsEmptyHint)}</span>
        </div>
      )}

      <div className="docs__list">
        {list.map((d) => (
          <article className="doc" key={d.id} data-status={d.status}>
            <span className="doc__i">
              <FileText size={18} strokeWidth={2} />
            </span>
            <div className="doc__b">
              <b>{t(d.title)}</b>
              <span className="doc__meta">
                {shortDate(d.date)}
                {d.contractNo ? ` · ${d.contractNo}` : ""}
              </span>
              {d.kind === "report" && d.status === "new" && (
                <span className="doc__warn">
                  <AlertCircle size={12} strokeWidth={2.4} />
                  {d.objectionDaysLeft} {t(ui.daysLeft)}
                </span>
              )}
              {d.status === "objection" && <span className="doc__warn">{t(ui.objectionSent)}</span>}
              {sent[d.id] && <span className="doc__warn">{t(ui.objectionSent)}</span>}
            </div>
            <div className="doc__acts">
              <a className="doc__open" href={d.fileUrl} target="_blank" rel="noreferrer">
                PDF
              </a>
              {d.kind === "report" && d.status === "new" && !sent[d.id] && (
                <button className="doc__obj" type="button" onClick={() => setObjFor(objFor === d.id ? null : d.id)}>
                  {t(ui.objection)}
                </button>
              )}
            </div>

            {objFor === d.id && (
              <div className="doc__form">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t(ui.objectionPlaceholder)}
                  rows={3}
                />
                <div className="doc__form-row">
                  <button className="btn btn--s btn--sm" onClick={() => setObjFor(null)} type="button">
                    {t(ui.close)}
                  </button>
                  <button
                    className="btn btn--p btn--sm"
                    onClick={() => sendObjection(d.id)}
                    disabled={busy || text.trim().length < 3}
                    type="button"
                  >
                    {busy ? <Loader size={16} className="spin" /> : t(ui.send)}
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      <p className="demo">{t(ui.objectionHint)}</p>
    </motion.div>
  );
}
