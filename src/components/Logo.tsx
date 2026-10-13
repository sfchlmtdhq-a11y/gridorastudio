import { Link } from "@tanstack/react-router";

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-8 w-8 grid-cols-2 gap-0.5 rounded-lg bg-primary p-1.5">
        <span className="rounded-[2px] bg-primary-foreground" />
        <span className="rounded-[2px] bg-primary-foreground/40" />
        <span className="rounded-[2px] bg-primary-foreground/40" />
        <span className="rounded-[2px] bg-primary-foreground" />
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight">
          Gridora<span className="text-primary"> Studio</span>
        </span>
      )}
    </Link>
  );
}
