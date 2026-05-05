import { useEffect, useRef } from "react";
import type { Restaurant } from "@/types/restaurant";
import { getGroupStyle, getGroupLabel } from "@/config/cuisineRegistry";

interface MobilePopupCardProps {
  restaurant: Restaurant;
  onClose: () => void;
}

/**
 * Full-width detail card that slides up from the bottom on mobile marker tap.
 * Replaces Leaflet's built-in popup for a touch-friendly, spacious layout.
 */
export function MobilePopupCard({ restaurant, onClose }: MobilePopupCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  /* Close on outside tap (backdrop) */
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [onClose]);

  const groupStyle = getGroupStyle(restaurant.cuisine_group);
  const groupLabel = getGroupLabel(restaurant.cuisine_group);

  return (
    <div className="mobile-popup-overlay">
      <div className="mobile-popup-card" ref={cardRef}>
        {/* Close button */}
        <button className="mobile-popup-close" onClick={onClose} aria-label="关闭">
          ✕
        </button>

        {/* Restaurant name */}
        <h3 className="mobile-popup-name">{restaurant.name_zh}</h3>
        {restaurant.name_en && (
          <p className="mobile-popup-en">{restaurant.name_en}</p>
        )}

        {/* Tags row */}
        <div className="mobile-popup-tags">
          <span
            className="mobile-popup-tag"
            style={{ background: groupStyle.color, color: groupStyle.textColor }}
          >
            {groupLabel}
          </span>
          <span className="mobile-popup-tag">{restaurant.cuisine}</span>
          {restaurant.is_new && (
            <span className="mobile-popup-tag mobile-popup-tag--new">2026 新晋</span>
          )}
        </div>

        {/* Details grid */}
        <div className="mobile-popup-details">
          <div className="mobile-popup-row">
            <span className="mobile-popup-label">区域</span>
            <span className="mobile-popup-value">{restaurant.area}</span>
          </div>
          <div className="mobile-popup-row">
            <span className="mobile-popup-label">地址</span>
            <span className="mobile-popup-value">{restaurant.address || "未提供"}</span>
          </div>
          <div className="mobile-popup-row">
            <span className="mobile-popup-label">人均</span>
            <span className="mobile-popup-value">{restaurant.avg_price_hkd || restaurant.avg_price_cny || restaurant.price_range || "未提供"}</span>
          </div>
          <div className="mobile-popup-row">
            <span className="mobile-popup-label">招牌菜</span>
            <span className="mobile-popup-value">{restaurant.signature_dishes || "未提供"}</span>
          </div>
          {restaurant.geo_source === "district_fallback" && (
            <div className="mobile-popup-row mobile-popup-row--note">
              <span className="mobile-popup-value">⚠️ 区域 fallback（地图位置为近似点）</span>
            </div>
          )}
        </div>

        {/* Michelin link */}
        {restaurant.guide_url && (
          <a
            className="mobile-popup-link"
            href={restaurant.guide_url}
            target="_blank"
            rel="noreferrer"
          >
            查看米其林官方页面 →
          </a>
        )}
      </div>
    </div>
  );
}
