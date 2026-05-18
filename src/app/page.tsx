import { PhilotimoReceipt } from "@/components/receipt/PhilotimoReceipt";
import { RECEIPT_BUNDLE_FIXTURE } from "@/lib/fixtures";

export default function Home() {
  return <PhilotimoReceipt bundle={RECEIPT_BUNDLE_FIXTURE} />;
}
