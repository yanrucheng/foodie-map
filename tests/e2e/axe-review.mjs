import assert from "node:assert/strict";

/** Resolve each incomplete finding with additional evidence; unknowns and execution errors fail. */
export async function reviewIncomplete(page, results) {
  const reviews = [];
  for (const rule of results.incomplete) for (const node of rule.nodes) {
    const checks = [...node.any, ...node.all, ...node.none];
    assert.ok(!rule.error && checks.every((check) => check.id !== "error-occurred"), `axe execution error: ${JSON.stringify({ rule: rule.id, target: node.target, checks })}`);
    const reasons = checks.map((check) => check.data?.messageKey);
    const observation = await page.evaluate(({ selector, rule, reasons }) => {
      if (selector.length !== 1 || typeof selector[0] !== "string") return { resolved: false, reason: "Unsupported shadow/frame target" };
      const node = document.querySelector(selector[0]);
      if (!node) return { resolved: false, reason: "Target disappeared during audit" };
      if (rule === "aria-valid-attr-value" && reasons.every((reason) => reason === "controlsWithinPopup")) {
        const ids = (node.getAttribute("aria-controls") ?? "").split(/\s+/u).filter(Boolean);
        const targets = ids.map((id) => document.getElementById(id));
        const active = node.getAttribute("aria-activedescendant");
        return { resolved: ids.length > 0 && targets.every((target) => target?.getAttribute("role") === node.getAttribute("aria-haspopup")) && (!active || targets.some((target) => target?.contains(document.getElementById(active)))), ids, popupRole: node.getAttribute("aria-haspopup"), active, method: "resolve real ARIA target roles and active-descendant ownership" };
      }
      if (rule !== "color-contrast" || !reasons.every((reason) => ["nonBmp", "bgGradient", "shortTextContent", "elmPartiallyObscured", "elmPartiallyObscuring", "bgOverlap", "imgNode"].includes(reason))) return { resolved: false, reason: "Finding requires a new explicit review" };
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const color = (value) => {
        if (!CSS.supports("color", value)) throw new Error(`Unsupported color: ${value}`);
        context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data; return [r, g, b, a / 255];
      };
      const luminance = (rgb) => rgb.map((value) => { value /= 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      const ancestors = []; for (let el = node; el; el = el.parentElement) ancestors.unshift(el);
      let minimum = [0, 0, 0], maximum = [255, 255, 255];
      const layers = [];
      for (const el of ancestors) {
        const style = getComputedStyle(el);
        if (Number(style.opacity) !== 1) return { resolved: false, reason: "Non-unit opacity requires explicit compositing review", target: el.className, opacity: style.opacity };
        const layer = [color(style.backgroundColor)];
        const composite = (colors) => {
          minimum = minimum.map((value, channel) => Math.min(...colors.map((rgba) => rgba[channel] * rgba[3] + value * (1 - rgba[3]))));
          maximum = maximum.map((value, channel) => Math.max(...colors.map((rgba) => rgba[channel] * rgba[3] + value * (1 - rgba[3]))));
        };
        composite(layer);
        if (style.backgroundImage !== "none") {
          // Channel extrema bound every pixel of a linear gradient explicitly interpolated in sRGB.
          // Both engines serialize an explicit `in srgb` by omitting that default space.
          const space = style.backgroundImage.match(/\bin ([a-z0-9-]+)/u)?.[1] ?? "srgb";
          if (!style.backgroundImage.startsWith("linear-gradient(") || space !== "srgb") return { resolved: false, reason: "Unmodelled background image/interpolation", image: style.backgroundImage };
          const stops = style.backgroundImage.match(/rgba?\([^)]*\)/gu)?.map(color);
          if (!stops?.length || stops.some((stop) => stop[3] !== 1)) return { resolved: false, reason: "Unmodelled gradient stops" };
          composite(stops);
        }
        layers.push({ element: el.className || el.tagName, color: style.backgroundColor, image: style.backgroundImage });
      }
      const style = getComputedStyle(node), foreground = color(style.color);
      const fgMinimum = minimum.map((value, channel) => foreground[channel] * foreground[3] + value * (1 - foreground[3]));
      const fgMaximum = maximum.map((value, channel) => foreground[channel] * foreground[3] + value * (1 - foreground[3]));
      const fgRange = [luminance(fgMinimum), luminance(fgMaximum)], bgRange = [luminance(minimum), luminance(maximum)];
      const ratio = fgRange[0] >= bgRange[1] ? (fgRange[0] + 0.05) / (bgRange[1] + 0.05)
        : bgRange[0] >= fgRange[1] ? (bgRange[0] + 0.05) / (fgRange[1] + 0.05) : 1;
      const fontSize = parseFloat(style.fontSize), weight = parseInt(style.fontWeight, 10);
      const threshold = fontSize >= 24 || fontSize >= 18.66 && weight >= 700 ? 3 : 4.5;
      const rect = node.getBoundingClientRect();
      return { resolved: ratio >= threshold, ratioLowerBound: ratio, threshold, foreground: style.color, backgroundChannelRange: [minimum, maximum], layers,
        geometry: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, method: "conservative sRGB foreground/background bounds; opaque reading surfaces, including gradient extrema" };
    }, { selector: node.target, rule: rule.id, reasons });
    reviews.push({ rule: rule.id, target: node.target, reasons, ...observation });
  }
  return reviews;
}
