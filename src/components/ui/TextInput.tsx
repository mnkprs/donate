"use client";

import type { ChangeEvent, ReactNode } from "react";

interface TextInputProps {
  value: string;
  onChange: (next: string) => void;
  type?: "text" | "email" | "number" | "tel";
  placeholder?: string;
  autoComplete?: string;
  id?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  mono?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

const CONTAINER_BASE =
  "flex items-stretch overflow-hidden rounded-md border bg-white transition-colors duration-150";

const CONTAINER_DEFAULT = `${CONTAINER_BASE} border-steel focus-within:border-iris focus-within:ring-2 focus-within:ring-iris/15`;

const CONTAINER_INVALID = `${CONTAINER_BASE} border-urgent focus-within:border-urgent focus-within:ring-2 focus-within:ring-urgent/15`;

const SLOT_BASE =
  "inline-flex items-center justify-center px-3 text-mute font-light tracking-[-0.1px] tabular-nums";

const PREFIX_CLASSES = `${SLOT_BASE} text-[15px] border-r border-rule-soft`;
const SUFFIX_CLASSES = `${SLOT_BASE} text-[13px] border-l border-rule-soft`;

const INPUT_BASE =
  "flex-1 min-w-0 appearance-none bg-transparent px-3 py-2.5 text-[15px] font-light tracking-[-0.1px] tabular-nums text-ink outline-none placeholder:text-steel";

export function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  id,
  prefix,
  suffix,
  mono = false,
  invalid = false,
  describedBy,
}: TextInputProps) {
  const containerClass = invalid ? CONTAINER_INVALID : CONTAINER_DEFAULT;
  const inputClass = mono ? `${INPUT_BASE} font-mono` : INPUT_BASE;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <div className={containerClass}>
      {prefix && <div className={PREFIX_CLASSES}>{prefix}</div>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={inputClass}
      />
      {suffix && <div className={SUFFIX_CLASSES}>{suffix}</div>}
    </div>
  );
}
