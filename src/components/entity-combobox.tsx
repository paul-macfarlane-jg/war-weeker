"use client";

import { cn } from "cn";
import * as React from "react";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";

export type EntityComboboxItem = {
  id: string;
  label: string;
  /** Shown muted next to the label, and included in the search. */
  detail?: string;
};

type CommonProps = {
  items: EntityComboboxItem[];
  name?: string;
  placeholder?: string;
  /** Shown when no item matches the typed query. */
  emptyText?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  "aria-label"?: string;
};

type SingleProps = CommonProps & {
  multiple?: false;
  /** The selected item's id, or `""` when nothing is selected. */
  value: string;
  onValueChange: (id: string) => void;
};

type MultipleProps = CommonProps & {
  multiple: true;
  value: string[];
  onValueChange: (ids: string[]) => void;
};

export type EntityComboboxProps = SingleProps | MultipleProps;

function matchesQuery(item: EntityComboboxItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    item.label.toLowerCase().includes(needle) ||
    (item.detail ?? "").toLowerCase().includes(needle)
  );
}

function isSameItem(a: EntityComboboxItem, b: EntityComboboxItem) {
  return a.id === b.id;
}

function EntityComboboxItemRow({ item }: { item: EntityComboboxItem }) {
  return (
    <>
      <span>{item.label}</span>
      {item.detail && (
        <span className="text-muted-foreground text-xs">{item.detail}</span>
      )}
    </>
  );
}

/**
 * A searchable combobox over Teams, Participants, or Competitions. Filters
 * by a case-insensitive substring of the label or detail. In single mode it
 * behaves like a themed select; in multiple mode selections show as
 * removable chips.
 */
export function EntityCombobox(props: EntityComboboxProps) {
  const {
    items,
    name,
    placeholder,
    emptyText = "No matches.",
    disabled,
    required,
    id,
    "aria-label": ariaLabel,
  } = props;
  const itemsById = React.useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const anchorRef = useComboboxAnchor();

  if (props.multiple) {
    const selected = props.value
      .map((itemId) => itemsById.get(itemId))
      .filter((item): item is EntityComboboxItem => Boolean(item));

    return (
      <Combobox
        items={items}
        multiple
        value={selected}
        onValueChange={(next) =>
          props.onValueChange(next.map((item) => item.id))
        }
        isItemEqualToValue={isSameItem}
        itemToStringLabel={(item) => item.label}
        itemToStringValue={(item) => item.id}
        filter={matchesQuery}
        disabled={disabled}
        required={required}
      >
        <ComboboxChips ref={anchorRef} className="h-auto min-h-11 sm:min-h-9">
          {selected.map((item) => (
            <ComboboxChip key={item.id} aria-label={item.label}>
              {item.label}
            </ComboboxChip>
          ))}
          <ComboboxChipsInput
            id={id}
            aria-label={ariaLabel}
            placeholder={selected.length === 0 ? placeholder : undefined}
            disabled={disabled}
          />
        </ComboboxChips>
        <ComboboxContent
          anchor={anchorRef}
          className="max-w-[calc(100vw-2rem)]"
        >
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(item: EntityComboboxItem) => (
              <ComboboxItem
                key={item.id}
                value={item}
                className={cn("min-h-11 sm:min-h-9")}
              >
                <EntityComboboxItemRow item={item} />
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
        {name &&
          selected.map((item) => (
            <input key={item.id} type="hidden" name={name} value={item.id} />
          ))}
      </Combobox>
    );
  }

  const selectedItem = itemsById.get(props.value) ?? null;

  return (
    <Combobox
      items={items}
      value={selectedItem}
      onValueChange={(item) => props.onValueChange(item?.id ?? "")}
      isItemEqualToValue={isSameItem}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.id}
      filter={matchesQuery}
      disabled={disabled}
      required={required}
    >
      <ComboboxInput
        id={id}
        aria-label={ariaLabel}
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 sm:h-9"
      />
      <ComboboxContent className="max-w-[calc(100vw-2rem)]">
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: EntityComboboxItem) => (
            <ComboboxItem
              key={item.id}
              value={item}
              className={cn("min-h-11 sm:min-h-9")}
            >
              <EntityComboboxItemRow item={item} />
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
      {name && <input type="hidden" name={name} value={props.value} />}
    </Combobox>
  );
}
