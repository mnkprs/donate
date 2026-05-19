/**
 * Decorative radial-gradient backdrop behind the donate route. Pure visual
 * texture — `aria-hidden` to keep it out of the accessibility tree, fixed
 * positioned at -z-10 so it never traps pointer events. The `data-checkout-mesh`
 * hook lets the route test assert its presence without binding to class names.
 */
export function CheckoutMesh() {
  return (
    <div
      aria-hidden="true"
      data-checkout-mesh=""
      className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,_var(--color-tint)_0%,_transparent_55%)]"
    />
  );
}
