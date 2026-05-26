/**
 * Brand mark for the Friction Log Viewer — three severity dots
 * (red / yellow / green) breathing out of phase. Replaces a static
 * logo with something that feels alive without being noisy.
 *
 * Pure markup, no client JS. Respects prefers-reduced-motion via
 * the `animate-breathe` utility's media query in globals.css.
 */
export function FrictionMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex items-center gap-1 ${className}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-red-500 animate-breathe"
        style={{ animationDelay: "0s" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-breathe"
        style={{ animationDelay: "0.45s" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-green-500 animate-breathe"
        style={{ animationDelay: "0.9s" }}
      />
    </span>
  );
}
