"use client";

import type { ChangeEvent } from "react";

interface TextAreaProps {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}

const BASE_CLASSES =
  "w-full appearance-none rounded-md border bg-white px-3 py-2.5 text-[15px] font-light tracking-[-0.1px] text-ink resize-y outline-none transition-colors duration-150 placeholder:text-steel";

const DEFAULT_CLASSES = `${BASE_CLASSES} border-steel focus:border-iris focus:ring-2 focus:ring-iris/15`;

const INVALID_CLASSES = `${BASE_CLASSES} border-urgent focus:border-urgent focus:ring-2 focus:ring-urgent/15`;

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
  id,
  invalid = false,
  describedBy,
}: TextAreaProps) {
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
  }

  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={invalid ? INVALID_CLASSES : DEFAULT_CLASSES}
    />
  );
}
