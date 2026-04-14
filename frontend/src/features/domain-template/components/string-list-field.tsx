"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface StringListFieldProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  description?: string;
  required?: boolean;
  error?: string;
}

/**
 * 文字列リスト編集用の再利用コンポーネント。
 * 優先観点、避けたい問い方、などで使用。
 */
export function StringListField({
  label,
  values,
  onChange,
  placeholder,
  description,
  required,
  error,
}: StringListFieldProps) {
  function handleItemChange(index: number, value: string) {
    const next = [...values];
    next[index] = value;
    onChange(next);
  }

  function handleRemove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function handleAdd() {
    onChange([...values, ""]);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </legend>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <ul className="space-y-2">
        {values.map((value, index) => (
          <li key={index} className="flex gap-2">
            <input
              type="text"
              value={value}
              placeholder={placeholder}
              onChange={(e) => handleItemChange(index, e.target.value)}
              className="flex-1 border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 shrink-0"
              onClick={() => handleRemove(index)}
              aria-label={`${label} の ${index + 1} 件目を削除`}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11"
        onClick={handleAdd}
      >
        <Plus className="size-4" aria-hidden />
        追加
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
