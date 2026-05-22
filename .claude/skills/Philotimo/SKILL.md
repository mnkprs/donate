```markdown
# Philotimo Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches the core development patterns and workflows used in the Philotimo codebase, a TypeScript project built with Next.js. It covers coding conventions, commit styles, testing strategies, and repeatable workflows for feature development, API endpoint creation, security remediation, infrastructure adapter implementation, smart contract TDD, and frontend-contract integration. This guide is designed to help contributors quickly understand and apply the project's standards and processes.

## Coding Conventions

### File Naming

- Use **camelCase** for file and directory names.
  - Example: `userProfile.ts`, `routeHandler.test.ts`

### Import Style

- Use **alias imports** for internal modules.
  - Example:
    ```typescript
    import { getUser } from '@/lib/user';
    ```

### Export Style

- **Mixed**: Both named and default exports are used as appropriate.
  - Example (named export):
    ```typescript
    export function getUser(id: string) { ... }
    ```
  - Example (default export):
    ```typescript
    export default handler;
    ```

### Commit Patterns

- **Conventional commits**: Prefixes include `feat`, `test`, `fix`, `docs`, `refactor`.
- Commit messages average ~69 characters.
  - Example: `feat: add rate limiting to login endpoint`

## Workflows

### TDD Feature Development (Red-Green)
**Trigger:** When adding a new feature, API route, or contract, and following TDD (write failing test/spec first, then implementation).
**Command:** `/tdd-feature`

1. Write a test/spec file for the new feature or contract (RED). Reference the not-yet-implemented module so the test fails.
    ```typescript
    // src/lib/newFeature.test.ts
    import { newFeature } from './newFeature';

    test('should do X', () => {
      expect(newFeature()).toBe('expected');
    });
    ```
2. Implement the feature/module to satisfy the test (GREEN).
    ```typescript
    // src/lib/newFeature.ts
    export function newFeature() {
      return 'expected';
    }
    ```
3. Run tests to ensure they pass.

### API Endpoint Addition
**Trigger:** When implementing a new API route (e.g., POST or GET endpoint) in the Next.js app.
**Command:** `/add-api-endpoint`

1. Create or update the route handler file under `src/app/api/.../route.ts`.
    ```typescript
    // src/app/api/user/route.ts
    import { NextRequest, NextResponse } from 'next/server';

    export async function GET(req: NextRequest) {
      return NextResponse.json({ message: 'Hello, user!' });
    }
    ```
2. Add or update the corresponding test file.
    ```typescript
    // src/app/api/user/route.test.ts
    import { GET } from './route';

    test('GET returns greeting', async () => {
      const res = await GET(/* mock request */);
      expect(res.json()).toEqual({ message: 'Hello, user!' });
    });
    ```
3. Update or add related type definitions in `src/types/`.

### Security Remediation & Hardening
**Trigger:** When a security review or audit identifies issues that need to be fixed.
**Command:** `/security-remediation`

1. Update implementation files to add guards, validation, or logging.
    ```typescript
    // Add input validation
    if (!isValid(input)) {
      throw new Error('Invalid input');
    }
    ```
2. Update or add tests to cover new security cases.
3. Update documentation or review files to record the remediation.

### Infrastructure Adapter Implementation
**Trigger:** When introducing a new infrastructure abstraction (e.g., key-value store, logger) that supports multiple backends.
**Command:** `/add-infra-adapter`

1. Define the interface and in-memory/mock implementation.
    ```typescript
    // src/lib/kv/kvAdapter.ts
    export interface KVAdapter {
      get(key: string): Promise<string | null>;
      set(key: string, value: string): Promise<void>;
    }

    export class InMemoryKV implements KVAdapter {
      private store = new Map<string, string>();
      async get(key: string) { return this.store.get(key) ?? null; }
      async set(key: string, value: string) { this.store.set(key, value); }
    }
    ```
2. Implement the production adapter (e.g., Vercel KV).
3. Add or update tests for both implementations.
4. Wire the adapter into the main application logic.

### Smart Contract Feature TDD
**Trigger:** When adding or modifying smart contract logic or deployment scripts.
**Command:** `/contract-feature-tdd`

1. Write a failing Solidity test (`.t.sol`) referencing the new contract/script.
2. Implement the contract or script in Solidity.
3. Update or add deployment scripts if needed.
4. Update documentation/runbooks as needed.

### Frontend Contract Integration
**Trigger:** When a new contract is deployed or the ABI changes and the frontend must be updated to match.
**Command:** `/frontend-contract-integration`

1. Add or update the contract ABI and address resolution logic in `src/lib/contracts.ts`.
2. Write or update tests to assert ABI hash matches and address resolution works.
3. Update `.env.local.example` and deployment docs as needed.

## Testing Patterns

- **Framework:** [Vitest](https://vitest.dev/)
- **Test file pattern:** `*.test.ts`
- **Placement:** Test files are colocated with implementation or in parallel directories.
- **Example:**
    ```typescript
    // src/lib/foo.test.ts
    import { foo } from './foo';

    test('foo returns bar', () => {
      expect(foo()).toBe('bar');
    });
    ```

## Commands

| Command                        | Purpose                                                        |
|---------------------------------|----------------------------------------------------------------|
| /tdd-feature                   | Start TDD workflow for new features or modules                 |
| /add-api-endpoint              | Guide for adding a new API endpoint and related types/tests     |
| /security-remediation          | Steps for security remediation and hardening                    |
| /add-infra-adapter             | Add a new infrastructure adapter with interface and tests       |
| /contract-feature-tdd          | TDD workflow for smart contract features/scripts                |
| /frontend-contract-integration | Integrate new/updated contract ABIs and addresses in frontend   |
```