#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict

from playwright.sync_api import Browser, Error, Page, sync_playwright


@dataclass
class PageLoadResult:
    path: str
    status: int
    root_text_length: int
    page_errors: list[str]
    console_errors: list[str]


def _rect_overlap(a: Dict[str, float], b: Dict[str, float]) -> bool:
    return not (
        a["x"] + a["width"] <= b["x"]
        or b["x"] + b["width"] <= a["x"]
        or a["y"] + a["height"] <= b["y"]
        or b["y"] + b["height"] <= a["y"]
    )


def _open_page(
    browser: Browser,
    base_url: str,
    path: str,
    *,
    mobile: bool = False,
) -> tuple[Page, PageLoadResult]:
    if mobile:
        context = browser.new_context(
            viewport={"width": 412, "height": 915},
            user_agent=(
                "Mozilla/5.0 (Linux; Android 14; Pixel 7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Mobile Safari/537.36"
            ),
        )
    else:
        context = browser.new_context(
            viewport={"width": 1366, "height": 900},
        )
    page = context.new_page()
    page_errors: list[str] = []
    console_errors: list[str] = []

    page.on("pageerror", lambda error: page_errors.append(str(error)))

    def on_console(msg: Any) -> None:
        if msg.type == "error":
            console_errors.append(msg.text)

    page.on("console", on_console)

    response = page.goto(f"{base_url}{path}", wait_until="networkidle", timeout=60_000)
    page.wait_for_timeout(900)
    root_text = page.locator("#root").inner_text().strip()

    result = PageLoadResult(
        path=path,
        status=response.status if response is not None else 0,
        root_text_length=len(root_text),
        page_errors=page_errors,
        console_errors=console_errors,
    )
    return page, result


def _assert_page_health(result: PageLoadResult) -> None:
    if result.status != 200:
        raise RuntimeError(f"{result.path}: expected HTTP 200, got {result.status}")
    if result.root_text_length < 40:
        raise RuntimeError(
            f"{result.path}: root text too short ({result.root_text_length}), possible blank screen"
        )
    if result.page_errors:
        raise RuntimeError(f"{result.path}: pageerror detected: {result.page_errors[0]}")
    if result.console_errors:
        raise RuntimeError(f"{result.path}: console error detected: {result.console_errors[0]}")


def _check_mobile_overlap(page: Page) -> Dict[str, Any]:
    geometry = page.evaluate(
        """
        () => {
          const toRect = (rect) => ({
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          });

          const quickFab = document.querySelector('.MuiSpeedDial-fab');
          const quickFabRect = quickFab ? toRect(quickFab.getBoundingClientRect()) : null;

          let stickyRect = null;
          const nodes = Array.from(document.querySelectorAll('*'));
          for (const node of nodes) {
            const style = window.getComputedStyle(node);
            if (style.position !== 'sticky') continue;
            const rect = node.getBoundingClientRect();
            const buttonCount = node.querySelectorAll('button,a,[role="button"]').length;
            if (
              buttonCount >= 2 &&
              rect.width > 140 &&
              rect.height > 36 &&
              rect.bottom > window.innerHeight - 220
            ) {
              stickyRect = {
                ...toRect(rect),
                buttonCount,
              };
              break;
            }
          }

          return {
            quickFabRect,
            stickyRect,
          };
        }
        """
    )

    quick_fab_rect = geometry.get("quickFabRect")
    sticky_rect = geometry.get("stickyRect")
    result: Dict[str, Any] = {
        "quick_fab_found": quick_fab_rect is not None,
        "sticky_cta_found": sticky_rect is not None,
        "overlap": None,
    }
    if quick_fab_rect is None or sticky_rect is None:
        result["skipped_reason"] = "missing_quick_fab_or_sticky_cta"
        return result

    overlap = _rect_overlap(quick_fab_rect, sticky_rect)
    result["overlap"] = overlap
    return result


def run(base_url: str, screenshot_dir: Path) -> Dict[str, Any]:
    summary: Dict[str, Any] = {
        "base_url": base_url,
        "desktop_routes": {},
        "mobile": {},
        "checks": {},
    }
    screenshot_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for path in ("/", "/settings", "/realtime"):
                page, result = _open_page(browser, base_url, path, mobile=False)
                try:
                    _assert_page_health(result)
                    summary["desktop_routes"][path] = {
                        "status": result.status,
                        "root_text_length": result.root_text_length,
                        "page_error_count": len(result.page_errors),
                        "console_error_count": len(result.console_errors),
                    }
                    if path == "/realtime":
                        clicked = page.evaluate(
                            """
                            () => {
                              const buttons = Array.from(
                                document.querySelectorAll('button[aria-label]')
                              );
                              const candidate = buttons.find((button) => {
                                const label = button.getAttribute('aria-label') || '';
                                return /(open|열기|開く)/i.test(label) &&
                                       /(settings|설정|設定)/i.test(label);
                              });
                              if (!candidate) return false;
                              candidate.click();
                              return true;
                            }
                            """
                        )
                        page.wait_for_timeout(250)
                        summary["checks"]["realtime_settings_toggle"] = {
                            "clicked": bool(clicked),
                        }
                finally:
                    shot = screenshot_dir / f"desktop-{path.strip('/').replace('/', '-') or 'root'}.png"
                    page.screenshot(path=str(shot), full_page=True)
                    page.context.close()

            mobile_page, mobile_result = _open_page(browser, base_url, "/", mobile=True)
            try:
                _assert_page_health(mobile_result)
                overlap_result = _check_mobile_overlap(mobile_page)
                summary["mobile"] = {
                    "status": mobile_result.status,
                    "root_text_length": mobile_result.root_text_length,
                    "page_error_count": len(mobile_result.page_errors),
                    "console_error_count": len(mobile_result.console_errors),
                    **overlap_result,
                }
                if overlap_result.get("overlap") is True:
                    raise RuntimeError("mobile: sticky CTA overlaps Quick Action FAB")
            finally:
                shot = screenshot_dir / "mobile-root.png"
                mobile_page.screenshot(path=str(shot), full_page=True)
                mobile_page.context.close()
        finally:
            browser.close()

    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Post-deploy UI smoke checks for malsori.")
    parser.add_argument(
        "--base-url",
        default="https://malsori.ancom.duckdns.org",
        help="Base URL to verify",
    )
    parser.add_argument(
        "--screenshot-dir",
        default="/tmp/malsori-ui-smoke",
        help="Directory to write screenshots",
    )
    args = parser.parse_args()

    try:
        summary = run(args.base_url.rstrip("/"), Path(args.screenshot_dir))
    except Error as exc:
        print(f"[FAIL] Playwright error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # pragma: no cover - defensive
        print(f"[FAIL] UI smoke failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"UI smoke checks passed for {args.base_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
