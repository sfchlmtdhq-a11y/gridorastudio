import { Link } from "@tanstack/react-router";
import type { MouseEvent } from "react";

export function Logo({ compact, onClick }: { compact?: boolean; onClick?: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  return (
    <Link to="/" onClick={onClick} className="flex items-center gap-2">
      <img src="/gridora-mark.svg" alt="Gridora Studio" className="h-8 w-8 rounded-lg" />
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight">
          Gridora<span className="text-primary"> Studio</span>
        </span>
      )}
    </Link>
  );
}
