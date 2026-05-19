"use client";

import { FieldLabel } from "@/components/ui/FieldLabel";
import { TextArea } from "@/components/ui/TextArea";
import { TextInput } from "@/components/ui/TextInput";

interface DonorDetailsProps {
  email: string;
  note: string;
  noteOpen: boolean;
  onEmailChange: (next: string) => void;
  onNoteChange: (next: string) => void;
  onNoteOpenChange: (next: boolean) => void;
  emailError?: string;
}

const EMAIL_INPUT_ID = "donor-email";
const NOTE_INPUT_ID = "donor-note";
const EMAIL_ERROR_ID = "donor-email-error";
const NOTE_REGION_ID = "donor-note-region";

const SECTION_CLASSES = "flex flex-col gap-4";

const HELP_TEXT_CLASSES =
  "mt-1.5 text-[11px] font-normal tracking-[-0.1px] text-mute";

const ERROR_TEXT_CLASSES =
  "mt-1.5 text-[11px] font-normal tracking-[-0.1px] text-urgent";

const TOGGLE_CLASSES =
  "inline-flex w-fit items-center gap-1.5 text-[12px] font-normal tracking-[-0.1px] text-iris transition-colors duration-150 hover:text-iris-hover focus:outline-none focus-visible:underline";

export function DonorDetails({
  email,
  note,
  noteOpen,
  onEmailChange,
  onNoteChange,
  onNoteOpenChange,
  emailError,
}: DonorDetailsProps) {
  const isInvalid = Boolean(emailError);

  return (
    <section className={SECTION_CLASSES}>
      <div>
        <FieldLabel
          htmlFor={EMAIL_INPUT_ID}
          hint="For your receipt link"
        >
          Email for receipt
        </FieldLabel>
        <TextInput
          id={EMAIL_INPUT_ID}
          type="email"
          autoComplete="email"
          value={email}
          onChange={onEmailChange}
          placeholder="you@somewhere.org"
          invalid={isInvalid}
          describedBy={isInvalid ? EMAIL_ERROR_ID : undefined}
        />
        {isInvalid ? (
          <p
            id={EMAIL_ERROR_ID}
            role="alert"
            className={ERROR_TEXT_CLASSES}
          >
            {emailError}
          </p>
        ) : (
          <p className={HELP_TEXT_CLASSES}>
            We send one email with your public receipt link. No newsletters,
            ever.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onNoteOpenChange(!noteOpen)}
        aria-expanded={noteOpen}
        aria-controls={NOTE_REGION_ID}
        className={TOGGLE_CLASSES}
      >
        {noteOpen ? "Hide note" : "Add a note"}
      </button>

      {noteOpen && (
        <div id={NOTE_REGION_ID}>
          <FieldLabel
            htmlFor={NOTE_INPUT_ID}
            hint="Optional · shown on the public receipt"
          >
            Leave a note
          </FieldLabel>
          <TextArea
            id={NOTE_INPUT_ID}
            rows={3}
            value={note}
            onChange={onNoteChange}
            placeholder="For my grandmother, who taught me what philotimo means."
          />
        </div>
      )}
    </section>
  );
}
