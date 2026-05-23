// @ts-check
/**
 * One-time Endaoment org lookup for charity onboarding.
 *
 * Queries Endaoment's org search endpoint by EIN for the three curated
 * charities and prints, per org, the matched record plus every on-chain
 * address found in it - so you can copy the right testnet (Base Sepolia)
 * Org Entity address into the app.
 *
 * DEFAULT ENVIRONMENT = DEV / SANDBOX (`api.dev.endaoment.org`).
 *   Per Endaoment's design, testnet Org contracts for real 501(c)(3)s are
 *   sandbox mock-ups. The dev DB mirrors the production directory, so
 *   searching by EIN returns a testnet Org contract you can safely route to.
 *
 * Run (dev/sandbox - for the testnet demo):
 *   node scripts/fetch-endaoment-orgs.mjs
 *
 * Run against production (mainnet addresses, real entities):
 *   ENDAOMENT_API_URL=https://api.endaoment.org node scripts/fetch-endaoment-orgs.mjs
 *
 * Endpoint: GET /v2/orgs/search?searchTerm={ein}   (searchTerm accepts EIN)
 * Docs: https://docs.endaoment.org/developers/api/organizations/search-organizations
 *
 * Where the result goes:
 *   - Sepolia Org address  -> src/lib/endaoment/orgs.ts  ENDAOMENT_ORG_ADDRESSES[ein][baseSepolia.id]
 *   - mainnet Org address   -> src/lib/endaoment/snapshot.json  [ein].mainnetAddress
 */

const DEV_BASE = "https://api.dev.endaoment.org";
const API = process.env.ENDAOMENT_API_URL ?? DEV_BASE;
const SEARCH_PATH = "/v2/orgs/search";
const TIMEOUT_MS = 10_000;
const EVM_ADDRESS_RE = /0x[a-fA-F0-9]{40}/g;

/** The three curated charities, EINs matched to src/lib/campaigns.ts. */
const ORGS = [
  { id: "pcrf", label: "Palestine Children's Relief Fund", ein: "93-1057665" },
  { id: "wck", label: "World Central Kitchen", ein: "27-3521132" },
  { id: "directrelief", label: "Direct Relief", ein: "95-1831116" },
];

/** Strip formatting so "93-1057665" and "931057665" compare equal. */
const digits = (/** @type {string} */ ein) => ein.replace(/\D/g, "");

/**
 * Search orgs by EIN and return the array of result records. Tolerant of the
 * exact response envelope (bare array, or `{ organizations|data|results: [] }`)
 * since the search schema is not pinned here.
 * @param {string} ein
 */
async function searchByEin(ein) {
  const url = `${API}${SEARCH_PATH}?searchTerm=${encodeURIComponent(digits(ein))}&count=25`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`HTTP ${res.status} - ${body}`);
  }

  const json = await res.json();
  if (Array.isArray(json)) return json;
  const arr = Object.values(json ?? {}).find((v) => Array.isArray(v));
  return Array.isArray(arr) ? arr : [];
}

/** Pick the record whose EIN matches exactly (digit-normalized). */
function pickExact(results, ein) {
  const want = digits(ein);
  return (
    results.find((r) => r && typeof r.ein === "string" && digits(r.ein) === want) ?? null
  );
}

/** Every distinct 0x address in the record, with the keys it appeared under. */
function findAddresses(record) {
  /** @type {Map<string, Set<string>>} */
  const hits = new Map();
  const walk = (val, path) => {
    if (val == null) return;
    if (typeof val === "string") {
      for (const m of val.match(EVM_ADDRESS_RE) ?? []) {
        if (!hits.has(m)) hits.set(m, new Set());
        hits.get(m).add(path || "(root)");
      }
      return;
    }
    if (typeof val === "object") {
      for (const [k, v] of Object.entries(val)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(record, "");
  return hits;
}

async function main() {
  const isDev = API === DEV_BASE;
  console.log(`\nEndaoment org search - API: ${API}  ${isDev ? "(DEV / SANDBOX - testnet)" : "(PRODUCTION - mainnet)"}\n`);

  let failures = 0;
  for (const org of ORGS) {
    console.log(`- ${org.label} (${org.ein})`);
    try {
      const results = await searchByEin(org.ein);
      const match = pickExact(results, org.ein);
      if (!match) {
        failures += 1;
        console.log(`    NO EXACT EIN MATCH in ${results.length} result(s).`);
        if (results.length > 0) {
          console.log(`    names returned: ${results.map((r) => r?.name).filter(Boolean).slice(0, 5).join(" | ")}`);
        }
        console.log("");
        continue;
      }
      const addrs = findAddresses(match);
      if (addrs.size === 0) {
        console.log("    matched, but NO 0x address in the record. Full record below:");
        console.log("    " + JSON.stringify(match));
      } else {
        console.log(`    matched "${match.name}". Addresses found (pick the Base Sepolia Org Entity):`);
        for (const [addr, paths] of addrs) {
          console.log(`      ${addr}   <- ${[...paths].join(", ")}`);
        }
      }
      console.log("");
    } catch (err) {
      failures += 1;
      console.log(`    FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  console.log("-".repeat(64));
  console.log(
    "\nNext: the addresses above are tagged with the JSON key they came from, so\n" +
      "you can tell a chain-specific deployment from other addresses. Drop the\n" +
      "Base Sepolia Org Entity into src/lib/endaoment/orgs.ts:\n" +
      "\n" +
      "  export const ENDAOMENT_ORG_ADDRESSES = {\n" +
      '    "93-1057665": { [baseSepolia.id]: "0x..." },  // PCRF\n' +
      "    ...\n" +
      "  };\n" +
      "\nThen `getCharity` resolves a non-null address and the Verified-by-Endaoment\n" +
      "badge can pass on Sepolia. Paste the output and wire it in (TDD).\n",
  );

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exit(1);
});
