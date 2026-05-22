import { ReceiptView } from "@/components/receipt/ReceiptView";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReceiptPageProps {
  params: Promise<{ txid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ---------------------------------------------------------------------------
// Page — server shell (D4: full client rendering via ReceiptView)
// ---------------------------------------------------------------------------

/**
 * Server shell for `/receipt/[txid]`.
 *
 * Parses the dynamic route param and delegates all data loading + rendering
 * to the `ReceiptView` client component, which calls `useReceipt` via wagmi.
 *
 * `generateMetadata` and `opengraph-image` (Task 8) will be added here as
 * independent server exports — the shell is structured to support them without
 * modification.
 */
export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { txid } = await params;

  return (
    <main>
      <ReceiptView txid={txid} />
    </main>
  );
}
