import { describe, expect, test } from "vitest";

import {
  INITIAL_FORM_STATE,
  checkoutFormReducer,
  selectAmountError,
  selectEmailError,
  selectPayload,
  selectIsSubmittable,
} from "@/components/checkout/checkoutFormState";

describe("checkoutFormReducer — initial state", () => {
  test("has a zero amount and idle status by default", () => {
    expect(INITIAL_FORM_STATE.amountCents).toBe(0);
    expect(INITIAL_FORM_STATE.customMode).toBe(false);
    expect(INITIAL_FORM_STATE.email).toBe("");
    expect(INITIAL_FORM_STATE.note).toBe("");
    expect(INITIAL_FORM_STATE.noteOpen).toBe(false);
    expect(INITIAL_FORM_STATE.submitted).toBe(false);
    expect(INITIAL_FORM_STATE.status).toBe("idle");
    expect(INITIAL_FORM_STATE.submitError).toBeNull();
  });
});

describe("checkoutFormReducer — field updates", () => {
  test("SET_AMOUNT updates amountCents and preserves the rest", () => {
    const next = checkoutFormReducer(INITIAL_FORM_STATE, {
      type: "SET_AMOUNT",
      cents: 5000,
    });
    expect(next.amountCents).toBe(5000);
    expect(next.email).toBe(INITIAL_FORM_STATE.email);
    expect(next.status).toBe(INITIAL_FORM_STATE.status);
  });

  test("SET_CUSTOM_MODE flips the custom-input toggle", () => {
    const next = checkoutFormReducer(INITIAL_FORM_STATE, {
      type: "SET_CUSTOM_MODE",
      custom: true,
    });
    expect(next.customMode).toBe(true);
  });

  test("SET_EMAIL updates email", () => {
    const next = checkoutFormReducer(INITIAL_FORM_STATE, {
      type: "SET_EMAIL",
      email: "donor@example.org",
    });
    expect(next.email).toBe("donor@example.org");
  });

  test("SET_NOTE updates note", () => {
    const next = checkoutFormReducer(INITIAL_FORM_STATE, {
      type: "SET_NOTE",
      note: "Thank you.",
    });
    expect(next.note).toBe("Thank you.");
  });

  test("SET_NOTE_OPEN reveals or hides the note", () => {
    const open = checkoutFormReducer(INITIAL_FORM_STATE, {
      type: "SET_NOTE_OPEN",
      open: true,
    });
    expect(open.noteOpen).toBe(true);

    const closed = checkoutFormReducer(open, {
      type: "SET_NOTE_OPEN",
      open: false,
    });
    expect(closed.noteOpen).toBe(false);
  });
});

describe("checkoutFormReducer — submit lifecycle", () => {
  test("SUBMIT_ATTEMPT flips submitted=true so errors become visible", () => {
    const next = checkoutFormReducer(INITIAL_FORM_STATE, {
      type: "SUBMIT_ATTEMPT",
    });
    expect(next.submitted).toBe(true);
    expect(next.status).toBe("idle");
  });

  test("SUBMIT_START moves status to 'submitting' and clears prior error", () => {
    const seeded = {
      ...INITIAL_FORM_STATE,
      submitError: "earlier failure",
      status: "error" as const,
    };
    const next = checkoutFormReducer(seeded, { type: "SUBMIT_START" });
    expect(next.status).toBe("submitting");
    expect(next.submitError).toBeNull();
  });

  test("SUBMIT_FAILURE moves status to 'error' with the message", () => {
    const submitting = checkoutFormReducer(INITIAL_FORM_STATE, {
      type: "SUBMIT_START",
    });
    const failed = checkoutFormReducer(submitting, {
      type: "SUBMIT_FAILURE",
      error: "Network unavailable.",
    });
    expect(failed.status).toBe("error");
    expect(failed.submitError).toBe("Network unavailable.");
  });

  test("SUBMIT_FAILURE preserves donor data so they can retry", () => {
    const filled = {
      ...INITIAL_FORM_STATE,
      amountCents: 5000,
      email: "donor@example.org",
      note: "thanks",
      submitted: true,
      status: "submitting" as const,
    };
    const failed = checkoutFormReducer(filled, {
      type: "SUBMIT_FAILURE",
      error: "Boom",
    });
    expect(failed.amountCents).toBe(5000);
    expect(failed.email).toBe("donor@example.org");
    expect(failed.note).toBe("thanks");
  });
});

describe("selectAmountError", () => {
  test("returns undefined when the donor has not attempted to submit yet", () => {
    expect(selectAmountError(INITIAL_FORM_STATE)).toBeUndefined();
  });

  test("returns an error message after submit attempt with zero amount", () => {
    const state = { ...INITIAL_FORM_STATE, submitted: true };
    expect(selectAmountError(state)).toBeDefined();
  });

  test("returns the validateAmount minimum error when amount < $1 after submit", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      amountCents: 50,
      submitted: true,
    };
    expect(selectAmountError(state)).toMatch(/at least/i);
  });

  test("returns undefined for a valid amount after submit attempt", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      amountCents: 5000,
      submitted: true,
    };
    expect(selectAmountError(state)).toBeUndefined();
  });
});

describe("selectEmailError", () => {
  test("returns undefined when not yet submitted", () => {
    expect(selectEmailError(INITIAL_FORM_STATE)).toBeUndefined();
  });

  test("returns an error for an empty email after submit attempt", () => {
    const state = { ...INITIAL_FORM_STATE, submitted: true };
    expect(selectEmailError(state)).toBeDefined();
  });

  test("returns an error for a malformed email after submit attempt", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      email: "not-an-email",
      submitted: true,
    };
    expect(selectEmailError(state)).toMatch(/valid email/i);
  });

  test("returns undefined for a valid email after submit attempt", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      email: "donor@example.org",
      submitted: true,
    };
    expect(selectEmailError(state)).toBeUndefined();
  });
});

describe("selectIsSubmittable", () => {
  test("is false from the initial state because no amount has been entered", () => {
    expect(selectIsSubmittable(INITIAL_FORM_STATE)).toBe(false);
  });

  test("is true once a valid amount is set, even with no email yet", () => {
    const state = { ...INITIAL_FORM_STATE, amountCents: 5000 };
    expect(selectIsSubmittable(state)).toBe(true);
  });

  test("stays true with a valid amount and an invalid email (soft email gate)", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      amountCents: 5000,
      email: "not-an-email",
    };
    expect(selectIsSubmittable(state)).toBe(true);
  });

  test("is false while a submission is in flight", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      amountCents: 5000,
      status: "submitting" as const,
    };
    expect(selectIsSubmittable(state)).toBe(false);
  });

  test("is true again after a failed submit so the donor can retry", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      amountCents: 5000,
      status: "error" as const,
      submitError: "Boom.",
    };
    expect(selectIsSubmittable(state)).toBe(true);
  });
});

describe("selectPayload", () => {
  test("returns null when amount is invalid", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      amountCents: 0,
      email: "donor@example.org",
    };
    expect(selectPayload(state, "pcrf")).toBeNull();
  });

  test("returns null when email is invalid", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      amountCents: 5000,
      email: "bad",
    };
    expect(selectPayload(state, "pcrf")).toBeNull();
  });

  test("returns a normalized payload when both are valid", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      amountCents: 5000,
      email: "  Donor@Example.ORG ",
      note: "hello",
    };
    const payload = selectPayload(state, "pcrf");
    expect(payload).toEqual({
      campaignId: "pcrf",
      grossCents: 5000,
      email: "donor@example.org",
      note: "hello",
    });
  });

  test("omits the note field when the note is empty", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      amountCents: 5000,
      email: "donor@example.org",
    };
    const payload = selectPayload(state, "pcrf");
    expect(payload).not.toBeNull();
    expect(payload?.note).toBeUndefined();
  });

  test("trims and omits whitespace-only notes", () => {
    const state = {
      ...INITIAL_FORM_STATE,
      amountCents: 5000,
      email: "donor@example.org",
      note: "   ",
    };
    const payload = selectPayload(state, "pcrf");
    expect(payload?.note).toBeUndefined();
  });
});
