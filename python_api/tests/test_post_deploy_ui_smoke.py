from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


def load_ui_smoke_module():
    repo_root = Path(__file__).resolve().parents[2]
    module_path = repo_root / "scripts" / "post-deploy-ui-smoke.py"
    spec = importlib.util.spec_from_file_location("post_deploy_ui_smoke", module_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


ui_smoke = load_ui_smoke_module()


class FakeLocator:
    def __init__(self, page: "FakePage") -> None:
        self.page = page

    def inner_text(self) -> str:
        return self.page.current_text


class FakePage:
    def __init__(self, texts: list[str]) -> None:
        self.texts = texts
        self.index = 0
        self.wait_calls: list[int] = []

    @property
    def current_text(self) -> str:
        return self.texts[self.index]

    def locator(self, selector: str) -> FakeLocator:
        assert selector == "#root"
        return FakeLocator(self)

    def wait_for_timeout(self, delay_ms: int) -> None:
        self.wait_calls.append(delay_ms)
        if self.index < len(self.texts) - 1:
            self.index += 1


def test_stabilize_root_text_waits_for_second_page_bootstrap() -> None:
    page = FakePage(
        [
            "본문으로 바로 이동\nMalSori\n🇰🇷\n한국어",
            "본문으로 바로 이동\nMalSori\n🇰🇷\n한국어",
            "본문으로 바로 이동\nMalSori\n🇰🇷\n한국어\n전사 목록\n필터 초기화\n파일 전사와 실시간 전사 결과를 확인합니다.",
        ]
    )

    root_text = ui_smoke._stabilize_root_text(page, min_root_text_length=40, max_attempts=4, delay_ms=250)

    assert len(root_text) >= 40
    assert page.wait_calls == [250, 250]


def test_stabilize_root_text_returns_immediately_when_root_is_ready() -> None:
    page = FakePage(
        ["본문으로 바로 이동\nMalSori\n🇰🇷\n한국어\n전사 목록\n필터 초기화\n파일 전사와 실시간 전사 결과를 확인합니다."]
    )

    root_text = ui_smoke._stabilize_root_text(page, min_root_text_length=40, max_attempts=4, delay_ms=250)

    assert len(root_text) >= 40
    assert page.wait_calls == []
