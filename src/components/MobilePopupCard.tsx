import { DialogSurface } from "./DialogSurface";
import type { Restaurant } from "@/types/restaurant";
import { getGroupStyle, getGroupLabel, type CuisineGroup } from "@/config/cuisineRegistry";
import { type SpatialContext } from "@/data/contract";
import { restaurantFacts } from "@/data/display";

interface MobilePopupCardProps {
  restaurant: Restaurant;
  groups?: CuisineGroup[];
  spatialContext?: SpatialContext;
  onClose: () => void;
  modal?: boolean;
}

/**
 * Full-width detail card that slides up from the bottom on mobile marker tap.
 * Replaces Leaflet's built-in popup for a touch-friendly, spacious layout.
 */
export function MobilePopupCard({ restaurant, onClose, groups, spatialContext, modal = true }: MobilePopupCardProps) {
  const groupStyle = getGroupStyle(restaurant.cuisine_group);
  const facts = restaurantFacts(restaurant, getGroupLabel(restaurant.cuisine_group, groups), spatialContext);

  return (
    <DialogSurface label={`餐厅详情：${facts.name}`} className={`mobile-popup-overlay ${modal ? "" : "desktop-detail"}`} onClose={onClose} modal={modal}>
      {modal && <div className="detail-backdrop" aria-hidden="true" onClick={onClose} />}
      <div className="mobile-popup-card">
        {/* Close button */}
        <button className="mobile-popup-close" onClick={onClose} aria-label="关闭餐厅详情">
          ✕
        </button>

        {/* Restaurant name */}
        <h2 className="mobile-popup-name">{facts.name}</h2>
        {facts.secondaryName && (
          <p className="mobile-popup-en">{facts.secondaryName}</p>
        )}

        {/* Tags row */}
        <div className="mobile-popup-tags">
          {facts.tags.map((tag, index) => (
            <span key={index} className="mobile-popup-tag"
              style={index === 0 ? { background: groupStyle.color, color: groupStyle.textColor } : undefined}>
              {tag}
            </span>
          ))}
        </div>

        {/* Details grid */}
        <div className="mobile-popup-details">
          {facts.details.map(([label, value]) => (
            <div className="mobile-popup-row" key={label}>
              <span className="mobile-popup-label">{label}</span>
              <span className="mobile-popup-value">{value}</span>
            </div>
          ))}
        </div>

        {/* Michelin link */}
        {facts.guideUrl && (
          <a
            className="mobile-popup-link"
            href={facts.guideUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看米其林官方页面 →
          </a>
        )}
      </div>
    </DialogSurface>
  );
}
