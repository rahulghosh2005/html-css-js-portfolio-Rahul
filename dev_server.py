"""Local portfolio preview with automatic refresh: python3 dev_server.py."""

import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RELOAD_SCRIPT = """
<script>
(() => {
    let version;
    setInterval(async () => {
        try {
            const response = await fetch('/__preview_version', { cache: 'no-store' });
            if (!response.ok) return;
            const next = await response.text();
            if (version !== undefined && next !== version) location.reload();
            version = next;
        } catch (_) {}
    }, 800);
})();
</script>
"""


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        route = self.path.split('?', 1)[0]
        if route == '/__preview_version':
            digest = hashlib.sha256()
            for name in ('index.html', 'styles.css', 'app.js'):
                path = ROOT / name
                if path.exists():
                    digest.update(path.read_bytes())
            data = digest.hexdigest().encode()
            content_type = 'text/plain'
        elif route in ('/', '/index.html'):
            html = (ROOT / 'index.html').read_text()
            data = html.replace('</body>', RELOAD_SCRIPT + '</body>').encode()
            content_type = 'text/html; charset=utf-8'
        else:
            return super().do_GET()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        if self.path.split('?', 1)[0] != '/__preview_version':
            super().log_message(format, *args)


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 8000), PreviewHandler)
    print('Portfolio preview: http://localhost:8000 (automatic refresh enabled)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
