"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { normalizeHex } from "@/lib/color";

export type ColorSwatch = {
  /** `#rrggbb` */
  color: string;
  label: string;
};

/**
 * A hex color field: a swatch + hex button that opens a Popover with a hex
 * `Input` (committing on a valid hex per `normalizeHex`) and a grid of theme
 * and Team swatches.
 */
export function ColorField({
  name,
  value,
  onValueChange,
  swatches,
  id,
  "aria-label": ariaLabel,
}: {
  name?: string;
  /** `#rrggbb` */
  value: string;
  onValueChange: (hex: string) => void;
  swatches: ColorSwatch[];
  id?: string;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);

  function commit(input: string) {
    const normalized = normalizeHex(input);
    if (!normalized) {
      setError("Use a hex color like #1a2b3c.");
      return;
    }
    setError(null);
    setDraft(normalized);
    onValueChange(normalized);
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) {
          setDraft(value);
          setError(null);
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            id={id}
            aria-label={ariaLabel}
            type="button"
            variant="outline"
            className="h-11 justify-start gap-2 sm:h-9"
          />
        }
      >
        <span
          aria-hidden
          className="border-border size-5 shrink-0 rounded-full border"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono text-sm">{value}</span>
      </PopoverTrigger>
      <PopoverContent className="w-64 max-w-[calc(100vw-2rem)]">
        <div className="flex flex-col gap-2">
          <Input
            value={draft}
            onChange={(event) => {
              const typed = event.target.value;
              setDraft(typed);
              const normalized = normalizeHex(typed);
              if (normalized) {
                setError(null);
                onValueChange(normalized);
              }
            }}
            onBlur={(event) => commit(event.target.value)}
            aria-label="Hex color"
            placeholder="#1a2b3c"
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div className="grid grid-cols-6 gap-1.5">
            {swatches.map((swatch) => (
              <button
                key={swatch.color}
                type="button"
                aria-label={swatch.label}
                className="border-border size-11 shrink-0 rounded-md border"
                style={{ backgroundColor: swatch.color }}
                onClick={() => {
                  setDraft(swatch.color);
                  setError(null);
                  onValueChange(swatch.color);
                }}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
      {name && <input type="hidden" name={name} value={value} />}
    </Popover>
  );
}
