import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, MapPin, Search, SlidersHorizontal, TrendingUp } from "lucide-react";
import { api } from "../api/client";
import { useQuery } from "../api/hooks";
import type { ObjectItem } from "../api/types";
import { money, useApp, useT } from "../lib/app";
import { ui } from "../lib/data";
import { EmptyState, ErrorState, Loading } from "../components/kit";

/**
 * Каталог: поиск, фильтр «только с открытым сбором», чипы продуктов и сетка
 * карточек. Ставка в карточке — расчётная на сегодня (её считает бэкенд),
 * поэтому у девелопмента она снижается по мере приближения сдачи.
 */
export function Market({ onAsset, onProfile }: { onAsset: (id: string) => void; onProfile: () => void }) {
  const t = useT();
  const { lang, products } = useApp();
  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [product, setProduct] = useState<string>("all");

  const { data, loading, error, reload } = useQuery(() => api.getObjects(), []);
  const objects = data ?? [];

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return objects.filter((o) => {
      if (openOnly && o.status !== "open") return false;
      if (product !== "all" && o.product !== product && !(o.extra ?? []).includes(product as never)) return false;
      if (!q) return true;
      return (
        o.name[lang].toLowerCase().includes(q) ||
        o.city[lang].toLowerCase().includes(q) ||
        o.address[lang].toLowerCase().includes(q) ||
        (products[o.product]?.name[lang] ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, query, openOnly, product, lang, products]);

  return (
    <div className="screen">
      <div className="cat__top">
        <div>
          <h1 className="cat__t1">{t(ui.catTitle1)}</h1>
          <h1 className="cat__t2">{t(ui.catTitle2)}</h1>
        </div>
        <button className="cat__ava" onClick={onProfile} type="button" aria-label={t(ui.tabProfile)}>
          {t(ui.catAva)}
        </button>
      </div>

      <div className="cat__search">
        <span className="cat__search-i">
          <Search size={17} strokeWidth={2.2} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(ui.searchShort)}
          aria-label={t(ui.searchShort)}
        />
        <button
          className="cat__filter"
          data-on={openOnly}
          onClick={() => setOpenOnly((v) => !v)}
          aria-label={t(ui.catOpenOnly)}
          aria-pressed={openOnly}
          type="button"
        >
          <SlidersHorizontal size={16} strokeWidth={2.2} />
        </button>
      </div>

      <div className="pills pills--cat">
        <button className="pill" data-on={product === "all"} onClick={() => setProduct("all")} type="button">
          {t(ui.catAll)}
        </button>
        {Object.values(products).map((p) => (
          <button
            key={p.id}
            className="pill"
            data-on={product === p.id}
            onClick={() => setProduct(p.id)}
            type="button"
          >
            {t(p.name)}
          </button>
        ))}
      </div>

      <div className="cat__head">
        <h2>{openOnly ? t(ui.catOpenOnly) : t(ui.catAvailable)}</h2>
        <span className="cat__count tnum">{list.length}</span>
      </div>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && list.length === 0 && <EmptyState title={t(ui.catEmpty)} hint={t(ui.catEmptyHint)} />}

      <div className="cat__grid">
        {list.map((o, i) => (
          <motion.button
            key={o.id}
            className="pcard"
            onClick={() => onAsset(o.id)}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i, 6) * 0.03, ease: [0.22, 1, 0.36, 1] }}
            type="button"
          >
            <img className="pcard__img" src={`${import.meta.env.BASE_URL}obj/${o.img}`} alt="" loading="lazy" />
            <span className="pcard__shade" aria-hidden />
            <span className="pcard__check">
              <Check size={12} strokeWidth={3.2} />
            </span>
            <span className="pcard__price tnum">
              {o.rate}% <i>{t(ui.perYear)}</i>
            </span>
            <span className="pcard__fund tnum">
              <TrendingUp size={11} strokeWidth={2.6} />
              {Math.round((o.raised / o.target) * 100)}%
            </span>
            <span className="pcard__n">{o.name[lang]}</span>
            <span className="pcard__loc">
              <MapPin size={11} strokeWidth={2.4} />
              {o.city[lang]} · {o.term[lang]}
            </span>
            <span className="pcard__min tnum">{money(o.min)}</span>
          </motion.button>
        ))}
      </div>

      <p className="demo">{t(ui.rateNotGuaranteed)}</p>
    </div>
  );
}

export type { ObjectItem };
