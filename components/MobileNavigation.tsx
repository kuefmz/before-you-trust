"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SupportLink } from "@/components/SupportLink";

export function MobileNavigation({ supportUrl }: { supportUrl?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="mobile-nav">
      {supportUrl ? (
        <SupportLink className="mobile-nav__support" href={supportUrl}>
          <span aria-hidden="true">☕</span>
          <span>Coffee</span>
        </SupportLink>
      ) : null}

      <button
        aria-controls="mobile-primary-navigation"
        aria-expanded={open}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        className="mobile-nav__toggle"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className="mobile-nav__panel"
        hidden={!open}
        id="mobile-primary-navigation"
      >
        <nav aria-label="Mobile primary navigation">
          <Link href="/how-it-works" onClick={close}>
            How it works
          </Link>
          <Link href="/about" onClick={close}>
            About
          </Link>
          <Link href="/share-your-story" onClick={close}>
            Share your story
          </Link>
          <Link href="/acceptable-use" onClick={close}>
            Acceptable use
          </Link>
          <Link href="/privacy" onClick={close}>
            Privacy
          </Link>
        </nav>
      </div>
    </div>
  );
}
