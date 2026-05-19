"use client";

import { useReducer, type FormEvent } from "react";

import { AmountSelector } from "@/components/checkout/AmountSelector";
import {
  INITIAL_FORM_STATE,
  checkoutFormReducer,
  selectAmountError,
  selectEmailError,
  selectIsSubmittable,
  selectPayload,
} from "@/components/checkout/checkoutFormState";
import { DonorDetails } from "@/components/checkout/DonorDetails";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PillButton } from "@/components/ui/PillButton";
import { calculateBreakdown } from "@/lib/checkout/fees";
import type { CheckoutPayload } from "@/types/checkout";

interface CheckoutFormProps {
  /** Campaign id used to stamp the outgoing payload (404 already enforced in the route). */
  campaignId: string;
  /** Hands the validated payload off to the on-ramp. Rejecting surfaces the error region. */
  onSubmit: (payload: CheckoutPayload) => Promise<void>;
}

const FORM_LAYOUT =
  "grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)] md:items-start";
const FIELDS_COLUMN = "flex flex-col gap-6";
const SUMMARY_COLUMN = "flex flex-col gap-4";

const ERROR_REGION =
  "rounded-lg border border-urgent/40 bg-urgent/5 px-4 py-3";
const ERROR_TITLE =
  "text-[13px] font-medium tracking-[-0.1px] text-urgent";
const ERROR_BODY =
  "mt-1 text-[12px] font-normal tracking-[-0.1px] text-ink/80";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  return "Unexpected error.";
}

export function CheckoutForm({ campaignId, onSubmit }: CheckoutFormProps) {
  const [state, dispatch] = useReducer(checkoutFormReducer, INITIAL_FORM_STATE);

  const amountError = selectAmountError(state);
  const emailError = selectEmailError(state);
  const isSubmittable = selectIsSubmittable(state);
  const breakdown = calculateBreakdown(state.amountCents);
  const summaryState = state.status === "submitting" ? "submitting" : "ready";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    dispatch({ type: "SUBMIT_ATTEMPT" });

    const payload = selectPayload(state, campaignId);
    if (!payload) return;

    dispatch({ type: "SUBMIT_START" });
    try {
      await onSubmit(payload);
      dispatch({ type: "SUBMIT_SUCCESS" });
    } catch (error: unknown) {
      dispatch({ type: "SUBMIT_FAILURE", error: errorMessage(error) });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={FORM_LAYOUT}>
      <div className={FIELDS_COLUMN}>
        <AmountSelector
          valueCents={state.amountCents}
          customMode={state.customMode}
          onValueChange={(cents) => dispatch({ type: "SET_AMOUNT", cents })}
          onCustomModeChange={(custom) =>
            dispatch({ type: "SET_CUSTOM_MODE", custom })
          }
          error={amountError}
        />

        <DonorDetails
          email={state.email}
          note={state.note}
          noteOpen={state.noteOpen}
          onEmailChange={(email) => dispatch({ type: "SET_EMAIL", email })}
          onNoteChange={(note) => dispatch({ type: "SET_NOTE", note })}
          onNoteOpenChange={(open) =>
            dispatch({ type: "SET_NOTE_OPEN", open })
          }
          emailError={emailError}
        />

        {state.submitError && (
          <div role="alert" className={ERROR_REGION}>
            <p className={ERROR_TITLE}>We couldn’t complete your donation.</p>
            <p className={ERROR_BODY}>
              {state.submitError} — your card was not charged. Please try again.
            </p>
          </div>
        )}

        <PillButton
          type="submit"
          variant="primary"
          size="lg"
          disabled={!isSubmittable}
        >
          {state.status === "submitting" ? "Processing payment" : "Donate"}
        </PillButton>
      </div>

      <div className={SUMMARY_COLUMN}>
        <OrderSummary breakdown={breakdown} state={summaryState} />
      </div>
    </form>
  );
}
