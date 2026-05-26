/**
 * The three severity chips shown under the headline on /. They explain
 * the friction-log vocabulary (🟢 worked / 🟡 friction / 🔴 blocked)
 * without resorting to prose. Pure markup.
 */
export function SeverityChips() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
      <Chip color="green" label="worked" />
      <Chip color="yellow" label="friction" />
      <Chip color="red" label="blocked" />
    </div>
  );
}

const COLOR: Record<"green" | "yellow" | "red", string> = {
  green: "bg-green-500/15 text-green-300/90 border-green-500/20",
  yellow: "bg-yellow-500/15 text-yellow-200/90 border-yellow-500/20",
  red: "bg-red-500/15 text-red-300/90 border-red-500/20",
};

const DOT: Record<"green" | "yellow" | "red", string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

function Chip({
  color,
  label,
}: {
  color: "green" | "yellow" | "red";
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${COLOR[color]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[color]}`} />
      {label}
    </span>
  );
}
