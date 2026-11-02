import { motion } from "framer-motion";

/**
 * Переключатель-сегмент. Общий для настроек, выбора документа при проверке
 * личности и выбора продукта в оферте: подложка едет через layoutId, поэтому
 * в каждом месте ей нужен свой `name`.
 */
export function Seg<V extends string | number>({
  value,
  options,
  onChange,
  name,
  wide,
  small,
}: {
  value: V;
  options: { v: V; label: React.ReactNode }[];
  onChange: (v: V) => void;
  name: string;
  wide?: boolean;
  /** компактный вариант — для шапки карточки */
  small?: boolean;
}) {
  return (
    <div className={`seg ${small ? "seg--sm" : "seg--lg"}${wide ? " seg--full" : ""}`}>
      {options.map((o) => (
        <button key={o.v} data-on={o.v === value} onClick={() => onChange(o.v)} aria-label={String(o.v)}>
          {o.v === value && (
            <motion.span
              className="seg__pill"
              layoutId={`seg-${name}`}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}
