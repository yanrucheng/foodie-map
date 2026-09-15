// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, renderHook, waitFor } from "@testing-library/react";
import { useGuideData } from "@/hooks/useGuideData";
import { SearchBar } from "@/components/SearchBar";
import { MobilePopupCard } from "@/components/MobilePopupCard";
import { createRestaurantMarker } from "@/components/RestaurantMarker";
import { restaurant } from "./dataFixtures";

afterEach(cleanup);
const response = (data: unknown) => ({ ok: true, json: async () => data });

describe("runtime data consumption (P02-R1/R6)", () => {
  it.each([{ price: {} }, { serving_form: "unknown" }, { dining_category: "sweet" }])("clears invalid results through the existing error channel: %j", async (invalid) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response([restaurant()])).mockResolvedValueOnce(response([{ ...restaurant(), ...invalid }])));
    const { result, rerender } = renderHook(({ file }) => useGuideData(file), { initialProps: { file: "/valid.json" } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([restaurant()]);
    rerender({ file: "/bad.json" });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toEqual([]);
  });
  it("rejects duplicate IDs and accepts an empty successful array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response([restaurant(), restaurant()])).mockResolvedValueOnce(response([])));
    const { result, rerender } = renderHook(({ file }) => useGuideData(file), { initialProps: { file: "/duplicate.json" } });
    await waitFor(() => expect(result.current.error).toContain("Duplicate"));
    rerender({ file: "/empty.json" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull(); expect(result.current.data).toEqual([]);
  });
  it("searches a name without translations or coordinates", () => {
    const onLocate = vi.fn(); const record = restaurant();
    const view = render(<SearchBar restaurants={[record]} onLocate={onLocate} />);
    fireEvent.change(view.getByPlaceholderText("搜索餐厅名（中 / 英文）"), { target: { value: "测试" } });
    fireEvent.click(view.getByRole("option"));
    expect(onLocate).toHaveBeenCalledWith(record);
    expect(view.baseElement.textContent).not.toMatch(/undefined|null/);
  });
});

describe("existing card field adaptation (P02-R5)", () => {
  it("omits unavailable lines and links on the mobile card", () => {
    const view = render(<MobilePopupCard restaurant={restaurant({ address_en: "Known address", name_en: null, price: " ", signature_dishes: "" })} onClose={() => {}} />);
    expect(view.getByText("测试餐厅")).toBeTruthy(); expect(view.getByText("Known address")).toBeTruthy();
    expect(view.queryByText("价格")).toBeNull(); expect(view.queryByText("招牌菜")).toBeNull(); expect(view.queryByRole("link")).toBeNull();
    expect(view.baseElement.textContent).not.toMatch(/undefined|null|未提供|未核验/);
  });
  it("displays source price text and currency in both layouts and escapes markup", () => {
    const record = restaurant({ name: "<img src=x onerror=alert(1)>", lat: 22.3, lon: 114.1, price: "約 200–400", currency: "HKD" });
    const view = render(<MobilePopupCard restaurant={record} onClose={() => {}} />);
    expect(view.getByText("HKD 約 200–400")).toBeTruthy(); expect(view.baseElement.querySelector("img")).toBeNull();
    const marker = createRestaurantMarker(record);
    const html = String(marker?.getPopup()?.getContent());
    expect(html).toContain("HKD 約 200–400"); expect(html).toContain("&lt;img"); expect(html).not.toContain("<img");
    expect(html).not.toContain("招牌菜"); expect(html).not.toContain("人均");
    marker?.remove();
  });
  it("does not create a marker for an unavailable position", () => {
    expect(createRestaurantMarker(restaurant())).toBeNull();
    expect(createRestaurantMarker(restaurant({ lat: 22.3, lon: 114.1, geocode_success: false }))).toBeNull();
  });
  it("preserves Japanese yen price wording in both detail layouts", () => {
    const record = restaurant({ name: "日本語の店名", lat: 35.68, lon: 139.76, price: "12,000–18,000（税・サービス料込）", currency: "JPY" });
    const view = render(<MobilePopupCard restaurant={record} onClose={() => {}} />);
    expect(view.getByText("JPY 12,000–18,000（税・サービス料込）")).toBeTruthy();
    const marker = createRestaurantMarker(record);
    expect(String(marker?.getPopup()?.getContent())).toContain("JPY 12,000–18,000（税・サービス料込）");
    marker?.remove();
  });
});
