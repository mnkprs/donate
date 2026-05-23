import { NotFoundScreen } from "@/components/boundary/NotFoundScreen";

/**
 * Global 404 boundary for the App Router.
 *
 * Next renders this whenever a route cannot be resolved or any nested
 * server component calls `notFound()` without a closer boundary. The
 * generic `unknown_route` variant is the right default — segment-level
 * `not-found.tsx` files can render `<NotFoundScreen variant="..." />`
 * with a more specific variant when they want context-aware copy.
 */
export default function NotFound() {
  return <NotFoundScreen variant="unknown_route" />;
}
