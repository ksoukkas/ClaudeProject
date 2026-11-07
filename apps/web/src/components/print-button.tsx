"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui";

/**
 * Opens the browser print dialog. "Save as PDF" there is how the memo is
 * exported for now; there is no server-side PDF rendering yet.
 */
export function PrintButton(props: Omit<ComponentProps<typeof Button>, "onClick">) {
  return <Button {...props} onClick={() => window.print()} />;
}
