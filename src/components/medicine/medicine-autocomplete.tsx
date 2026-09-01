"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
import {
  searchMedicines,
  type MedicineSearchResult,
} from "@/lib/offline/medicine-repository";

export interface MedicineAutocompleteProps {
  value: string;
  onChange: (
    value: string,
    medicineId: string | null,
    medicine?: MedicineSearchResult
  ) => void;
  medicineId: string | null;
  placeholder?: string;
  className?: string;
  onScan?: () => void;
  disabled?: boolean;
}

export function MedicineAutocomplete({
  value,
  onChange,
  medicineId,
  placeholder = "Search medicine...",
  className,
  onScan,
  disabled = false,
}: MedicineAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MedicineSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const selectedRef = useRef<HTMLLIElement>(null);

  // Sync external value changes (e.g. parent resets)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const doSearch = useCallback(async (searchText: string) => {
    if (searchText.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchMedicines(searchText, 10);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error("Medicine search error:", err);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const selectMedicine = useCallback(
    (medicine: MedicineSearchResult) => {
      onChange(medicine.tradeName, medicine.id, medicine);
      setQuery(medicine.tradeName);
      setIsOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectMedicine(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    // Clear ID if user actively edits text
    if (medicineId && newValue !== value) {
      onChange(newValue, null);
    }
  };

  const clearSelection = () => {
    setQuery("");
    onChange("", null);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          {isSearching && (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />
          )}
          <Input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.length >= 2 && suggestions.length > 0) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={isSearching ? "pl-9" : ""}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          />
        </div>
        {onScan && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onScan}
            disabled={disabled}
            className="shrink-0"
            title="Scan barcode"
          >
            <Camera className="h-4 w-4" />
          </Button>
        )}
        {medicineId && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            disabled={disabled}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full min-w-[280px] max-h-[240px] overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {isSearching ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Searching...
            </div>
          ) : suggestions.length === 0 && query.length >= 2 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No medicines found
            </div>
          ) : (
            <ul className="space-y-0.5">
              {suggestions.map((medicine, index) => (
                <li
                  key={medicine.id}
                  ref={index === selectedIndex ? selectedRef : undefined}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={`flex flex-col rounded-sm px-3 py-2 cursor-pointer text-sm transition-colors ${
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => selectMedicine(medicine)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="font-medium text-foreground">
                    {medicine.tradeName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {medicine.genericName}
                    {medicine.manufacturer
                      ? ` \u2022 ${medicine.manufacturer}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}