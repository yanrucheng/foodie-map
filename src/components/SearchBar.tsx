import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Restaurant } from "@/types/restaurant";

interface SearchBarProps {
  restaurants: Restaurant[];
  onLocate: (restaurant: Restaurant) => void;
}

/**
 * Search bar with custom React-controlled filterable dropdown.
 * Replaces native <datalist> for consistent cross-browser/mobile behavior.
 * Implements ARIA listbox pattern with keyboard navigation.
 */
export function SearchBar({ restaurants, onLocate }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Filtered suggestions based on current query. */
  const suggestions = useMemo(() => {
    const raw = query.trim().toLowerCase();
    if (!raw || raw.length < 1) return [];
    return restaurants
      .filter((r) => {
        const combined = `${r.name_zh} / ${r.name_en}`.toLowerCase();
        return (
          combined.includes(raw) ||
          r.name_zh.toLowerCase().includes(raw) ||
          r.name_en.toLowerCase().includes(raw) ||
          r.name.toLowerCase().includes(raw)
        );
      })
      .slice(0, 20); // Limit for performance
  }, [query, restaurants]);

  /** Handles selecting a restaurant from the list. */
  const handleSelect = useCallback(
    (restaurant: Restaurant) => {
      setQuery(`${restaurant.name_zh} / ${restaurant.name_en}`);
      setIsDropdownOpen(false);
      setHighlightIndex(-1);
      onLocate(restaurant);
      inputRef.current?.blur();
    },
    [onLocate]
  );

  /** Handles locate button click — finds exact match or uses first suggestion. */
  const handleLocate = useCallback(() => {
    const raw = query.trim().toLowerCase();
    if (!raw) return;

    // Exact match first
    const exact = restaurants.find((r) => {
      const combined = `${r.name_zh} / ${r.name_en}`.toLowerCase();
      return (
        combined === raw ||
        r.name_zh.toLowerCase() === raw ||
        r.name_en.toLowerCase() === raw ||
        r.name.toLowerCase() === raw
      );
    });

    if (exact) {
      handleSelect(exact);
      return;
    }

    // Fall back to first suggestion
    if (suggestions.length > 0) {
      handleSelect(suggestions[0]!);
    }
  }, [query, restaurants, suggestions, handleSelect]);

  /** Keyboard navigation for the dropdown. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isDropdownOpen || suggestions.length === 0) {
        if (e.key === "Enter") handleLocate();
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIndex >= 0 && suggestions[highlightIndex]) {
            handleSelect(suggestions[highlightIndex]);
          } else {
            handleLocate();
          }
          break;
        case "Escape":
          setIsDropdownOpen(false);
          setHighlightIndex(-1);
          break;
      }
    },
    [isDropdownOpen, suggestions, highlightIndex, handleSelect, handleLocate]
  );

  /** Scroll highlighted item into view. */
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  /** Close dropdown when clicking outside. */
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  /** Open dropdown when typing. */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setHighlightIndex(-1);
    setIsDropdownOpen(val.trim().length > 0);
  }, []);

  /** Open dropdown on focus if there's a query. */
  const handleFocus = useCallback(() => {
    if (query.trim().length > 0) {
      setIsDropdownOpen(true);
    }
  }, [query]);

  return (
    <div className="top-search floating-card" ref={containerRef}>
      <div className="search-wrap" role="combobox" aria-expanded={isDropdownOpen} aria-haspopup="listbox">
        <input
          ref={inputRef}
          placeholder="搜索餐厅名（中 / 英文）"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          aria-autocomplete="list"
          aria-controls="search-listbox"
          aria-activedescendant={highlightIndex >= 0 ? `search-option-${highlightIndex}` : undefined}
        />
        <button onClick={handleLocate} aria-label="定位餐厅">定位</button>
      </div>

      {/* Custom dropdown */}
      {isDropdownOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id="search-listbox"
          className="search-dropdown"
          role="listbox"
        >
          {suggestions.map((r, i) => (
            <li
              key={r.id}
              id={`search-option-${i}`}
              className={`search-dropdown-item ${i === highlightIndex ? "highlighted" : ""}`}
              role="option"
              aria-selected={i === highlightIndex}
              onPointerDown={() => handleSelect(r)}
            >
              <span className="search-item-name">{r.name_zh}</span>
              <span className="search-item-en">{r.name_en}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
