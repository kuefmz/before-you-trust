"use client";

import { trackEvent } from "@/lib/client-analytics";

export function SupportLink({
  href,
  className = "button button--support",
  children = "Buy me a coffee",
}: {
  href: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      className={className}
      href={href}
      onClick={() => trackEvent("support_click")}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}
