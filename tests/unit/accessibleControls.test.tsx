// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { SearchBar } from "@/components/SearchBar";
import { BottomSheet } from "@/components/BottomSheet";
import { restaurant } from "./dataFixtures";
import { cuisineStyleMap } from "@/config/cuisineRegistry";

afterEach(cleanup);
describe("P06 search input contract", () => {
  it("does not select during IME composition and selects on the subsequent Enter", () => {
    const onLocate = vi.fn(); const record = restaurant();
    const view = render(<SearchBar restaurants={[record]} onLocate={onLocate} />);
    const input = view.getByRole("combobox", { name: "搜索餐厅" });
    input.focus(); fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "测试" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onLocate).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input); fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(view.getByRole("option").id);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onLocate).toHaveBeenCalledExactlyOnceWith(record);
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });
  it("pointerdown never commits and a cancelled touch gesture cannot select", () => {
    const onLocate = vi.fn();
    const view = render(<SearchBar restaurants={[restaurant()]} onLocate={onLocate} />);
    fireEvent.change(view.getByRole("combobox"), { target: { value: "测试" } });
    const option = view.getByRole("option");
    fireEvent.pointerDown(option); expect(onLocate).not.toHaveBeenCalled();
    fireEvent.pointerCancel(option); fireEvent.click(option); expect(onLocate).not.toHaveBeenCalled();
    fireEvent.pointerDown(option); fireEvent.click(option); expect(onLocate).toHaveBeenCalledTimes(1);
  });
  it("announces no matches and Escape dismisses that state without moving focus", () => {
    const view = render(<SearchBar restaurants={[restaurant()]} onLocate={() => {}} />);
    const input = view.getByRole("combobox"); input.focus();
    fireEvent.change(input, { target: { value: "none" } });
    expect(view.getByRole("status").textContent).toContain("修改搜索词");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(view.getByRole("status").textContent).toBe(""); expect(document.activeElement).toBe(input);
  });
});
it("P06 dialog lock restores the existing body style after unmount and leaves closed sheets inert", () => {
  document.body.style.overflow = "clip";
  const view = render(<BottomSheet isOpen title="筛选" onClose={() => {}}><button>操作</button></BottomSheet>);
  expect(document.body.style.overflow).toBe("hidden");
  expect(view.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
  view.rerender(<BottomSheet isOpen={false} title="筛选" onClose={() => {}}>隐藏内容</BottomSheet>);
  expect(view.queryByRole("dialog")).toBeNull(); expect(document.body.style.overflow).toBe("clip");
  document.body.style.overflow = "";
});
it("P06 every solid cuisine label foreground reaches 4.5:1", () => {
  const luminance = (hex: string) => {
    let raw = hex.slice(1); if (raw.length === 3) raw = raw.split("").map((c) => c + c).join("");
    return [0, 2, 4].map((offset) => parseInt(raw.slice(offset, offset + 2), 16) / 255)
      .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, index) => sum + v * [0.2126, 0.7152, 0.0722][index]!, 0);
  };
  for (const [key, pair] of Object.entries(cuisineStyleMap)) {
    const [low, high] = [luminance(pair.color), luminance(pair.textColor)].sort((a, b) => a - b);
    expect((high! + 0.05) / (low! + 0.05), key).toBeGreaterThanOrEqual(4.5);
  }
});
