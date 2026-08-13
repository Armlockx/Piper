"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { groupCatalogModels, type CatalogModel } from "@/lib/llm/catalog";

type Props = {
  value: string;
  onChange: (modelId: string) => void;
  models: CatalogModel[];
  placeholder: string;
  disabled?: boolean;
};

export function ModelPicker({ value, onChange, models, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filteredGroups = useMemo(() => {
    const q = value.trim().toLowerCase();
    const filtered = q
      ? models.filter(
          (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
        )
      : models;
    return groupCatalogModels(filtered);
  }, [models, value]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <Input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="mt-1 mb-3"
        autoComplete="off"
      />
      {open && !disabled && (
        <div className="absolute z-20 mt-[-0.5rem] w-full max-h-56 overflow-y-auto border-2 border-white/15 bg-black">
          {filteredGroups.length === 0 ? (
            <p className="px-3 py-2 font-mono text-xs text-white/40">—</p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.family}>
                <p className="sticky top-0 bg-black px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-neon-magenta">
                  {group.family}
                </p>
                {group.models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="block w-full px-3 py-1.5 text-left font-mono text-xs text-white/80 hover:bg-white/5 hover:text-neon-cyan"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                  >
                    <span className="block truncate">{m.id}</span>
                    {m.name !== m.id && (
                      <span className="block truncate text-white/40">{m.name}</span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
