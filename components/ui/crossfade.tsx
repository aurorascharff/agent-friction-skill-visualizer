import { ViewTransition } from "react";

/**
 * Wraps Suspense content so the reveal from skeleton → real content
 * crossfades instead of hard-cutting. Server component (no `'use client'`)
 * — React's `<ViewTransition>` works in server components.
 *
 * The skill calls this out as a primitive used around every Suspense
 * child for smooth streaming reveals.
 */
export function Crossfade({ children }: { children: React.ReactNode }) {
  return <ViewTransition>{children}</ViewTransition>;
}
