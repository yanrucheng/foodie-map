import { useState, useCallback, useRef, useEffect, useMemo, useId } from "react";
import type { Restaurant } from "@/types/restaurant";
import { displayName, searchNames } from "@/data/display";

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
  const listId = useId();
  const composing = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Filtered suggestions based on current query. */
  const suggestions = useMemo(() => {
    const raw = query.trim().toLowerCase();
    if (!raw || raw.length < 1) return [];
    return restaurants
      .filter((r) => searchNames(r).some((name) => name.toLowerCase().includes(raw)))
      .slice(0, 20); // Limit for performance
  }, [query, restaurants]);

  /** Handles selecting a restaurant from the list. */
  const handleSelect = useCallback(
    (restaurant: Restaurant) => {
      inputRef.current?.focus({ preventScroll: true });
      setQuery(restaurant.name);
      setIsDropdownOpen(false);
      setHighlightIndex(-1);
      onLocate(restaurant);

    },
    [onLocate]
  );

  /** Handles locate button click — finds exact match or uses first suggestion. */
  const handleLocate = useCallback(() => {
    const raw = query.trim().toLowerCase();
    if (!raw) return;

    // Exact match first
    const exact = restaurants.find((r) => searchNames(r).some((name) => name.toLowerCase() === raw));

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
      if (composing.current || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
      if (e.key === "Escape") {
        e.preventDefault(); setIsDropdownOpen(false); setHighlightIndex(-1); return;
      }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && suggestions.length > 0 && !isDropdownOpen) {
        e.preventDefault(); setIsDropdownOpen(true); setHighlightIndex(0); return;
      }
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
    <div className="top-search floating-card" ref={containerRef}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsDropdownOpen(false); setHighlightIndex(-1);
        }
      }}>
      <div className="search-wrap">
        <input
          ref={inputRef}
          role="combobox" aria-label="搜索餐厅" data-focus-key="search"
          aria-expanded={isDropdownOpen && suggestions.length > 0} aria-haspopup="listbox"
          enterKeyHint="search" autoComplete="off"
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; }}
          placeholder="搜索餐厅名（中 / 英文）"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          aria-autocomplete="list"
          aria-controls={isDropdownOpen && suggestions.length > 0 ? listId : undefined}
          aria-activedescendant={isDropdownOpen && suggestions[highlightIndex] ? `${listId}-${highlightIndex}` : undefined}
        />
        <button type="button" data-focus-key="search-submit" onClick={handleLocate} aria-label="查看餐厅详情并定位" disabled={!query.trim()}>查看</button>
      </div>

      <div className={isDropdownOpen && query.trim() && suggestions.length === 0 ? "search-feedback" : "sr-only"} role="status" aria-atomic="true">
        {isDropdownOpen && query.trim() ? suggestions.length === 0 ? "没有匹配的餐厅，请修改搜索词。" : `找到 ${suggestions.length}${suggestions.length === 20 ? " 条候选，最多显示 20" : " 家餐厅"}，使用上下方向键选择。` : ""}
      </div>
      {/* Custom dropdown */}
      {isDropdownOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id={listId} aria-label="餐厅搜索结果"
          className="search-dropdown"
          role="listbox"
        >
          {suggestions.map((r, i) => (
            <li
              key={r.id}
              id={`${listId}-${i}`}
              className={`search-dropdown-item ${i === highlightIndex ? "highlighted" : ""}`}
              role="option"
              aria-selected={i === highlightIndex}
              onPointerDown={(event) => { pointerStart.current = { x: event.clientX, y: event.clientY }; moved.current = false; }}
              onPointerMove={(event) => {
                if (pointerStart.current && Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) > 8) moved.current = true;
              }}
              onPointerCancel={() => { moved.current = true; }}
              onClick={() => { if (!moved.current) handleSelect(r); pointerStart.current = null; }}
            >
              <span className="search-item-name">{displayName(r)}</span>
              <span className="search-item-en">{r.name_en}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
