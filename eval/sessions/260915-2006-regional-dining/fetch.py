"""Save explicitly selected public sources; no discovery or automatic labeling."""
import concurrent.futures
import datetime
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
import urllib.request


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("script", "style"):
            self.hidden += 1
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag in ("p", "div", "br", "li", "h1", "h2", "h3", "tr"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def capture(target):
    out = Path(__file__).parent / "outputs" / "sources"
    out.mkdir(parents=True, exist_ok=True)
    dest = out / (target["key"] + ".json")
    if dest.exists():
        return {"key": target["key"], "cached": True}
    result = {**target, "captured_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        req = urllib.request.Request(target["url"], headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=25) as response:
            raw = response.read()
            result.update(status=response.status, final_url=response.url,
                          sha256=hashlib.sha256(raw).hexdigest())
            html_path = out / (target["key"] + ".html")
            html_path.write_bytes(raw)
            charset = response.headers.get_content_charset() or "utf-8"
            parser = Page()
            parser.feed(raw.decode(charset, errors="replace"))
            result["text"] = "\n".join(s.strip() for s in "".join(parser.parts).splitlines() if s.strip())
            result["links"] = list(dict.fromkeys(parser.links))
            result["local_capture"] = str(html_path)
    except Exception as exc:
        result["error"] = str(exc)
    dest.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return {k: v for k, v in result.items() if k in ("key", "status", "error", "final_url")}


if __name__ == "__main__":
    targets = json.loads(Path(sys.argv[1]).read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for result in pool.map(capture, targets):
            print(json.dumps(result, ensure_ascii=False), flush=True)
