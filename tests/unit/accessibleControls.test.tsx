// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { SearchBar } from "@/components/SearchBar";
import { BottomSheet } from "@/components/BottomSheet";
import { restaurant } from "./dataFixtures";

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
