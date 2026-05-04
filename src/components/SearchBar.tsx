import { useState, useCallback, useRef } from "react";
import type { Restaurant } from "@/types/restaurant";

interface SearchBarProps {
  restaurants: Restaurant[];
  onLocate: (restaurant: Restaurant) => void;
}

/** Floating search bar with datalist autocomplete and locate button. */
export function SearchBar({ restaurants, onLocate }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /** Finds matching restaurant by zh/en name and triggers fly-to. */
  const handleLocate = useCallback(() => {
    const raw = query.trim().toLowerCase();
    if (!raw) return;

    const match = restaurants.find((r) => {
      const combined = `${r.name_zh} / ${r.name_en}`.toLowerCase();
      return (
        combined === raw ||
        r.name_zh.toLowerCase() === raw ||
        r.name_en.toLowerCase() === raw ||
        r.name.toLowerCase() === raw
      );
    });

    if (match) {
      onLocate(match);
      inputRef.current?.blur();
    }
  }, [query, restaurants, onLocate]);

  /** Triggers locate on Enter key press. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleLocate();
    },
    [handleLocate]
  );

  return (
    <div className="top-search floating-card">
      <div className="search-wrap">
        <input
          ref={inputRef}
          list="restaurantOptions"
          placeholder="搜索餐厅名（中 / 英文）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <datalist id="restaurantOptions">
          {restaurants.map((r) => (
            <option key={r.id} value={`${r.name_zh} / ${r.name_en}`} />
          ))}
        </datalist>
        <button onClick={handleLocate}>定位</button>
      </div>
    </div>
  );
}
