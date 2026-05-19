import type { ReactNode } from "react";

interface FieldLabelProps {
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
}

const CONTAINER_CLASSES = "flex items-baseline justify-between mb-1.5";

const LABEL_CLASSES = "text-xs font-normal tracking-[-0.1px] text-ink";

const HINT_CLASSES = "text-[11px] font-normal tracking-[-0.1px] text-mute";

export function FieldLabel({ htmlFor, hint, children }: FieldLabelProps) {
  return (
    <div className={CONTAINER_CLASSES}>
      <label htmlFor={htmlFor} className={LABEL_CLASSES}>
        {children}
      </label>
      {hint && <span className={HINT_CLASSES}>{hint}</span>}
    </div>
  );
}
