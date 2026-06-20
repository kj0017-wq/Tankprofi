import json
import mimetypes
import os
import pathlib
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
SECRET = ROOT / "functions" / ".secret.local"
PORT = int(os.environ.get("PORT", "8080"))


def read_api_key():
    if "TANKERKOENIG_API_KEY" in os.environ:
        return os.environ["TANKERKOENIG_API_KEY"]
    if SECRET.exists():
        for line in SECRET.read_text(encoding="utf-8").splitlines():
            if line.startswith("TANKERKOENIG_API_KEY="):
                return line.split("=", 1)[1].strip()
    return ""


API_KEY = read_api_key()


def fetch_json(url, headers=None):
    request = urllib.request.Request(url, headers=headers or {"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ("/api/geocode.php", "/api/geocode"):
            return self.handle_geocode(parsed)
        if parsed.path in ("/api/reverse.php", "/api/reverse"):
            return self.handle_reverse(parsed)
        if parsed.path in ("/api/search.php", "/api/search"):
            return self.handle_search(parsed)
        if parsed.path in ("/api/history.php", "/api/history"):
            return self.send_json({"items": []})
        return self.serve_static(parsed.path)

    def handle_geocode(self, parsed):
        params = urllib.parse.parse_qs(parsed.query)
        query = (params.get("q", [""])[0] or "").strip()
        if not query:
            return self.send_json({"error": "Missing parameter: q"}, 422)
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
            "q": query,
            "format": "jsonv2",
            "addressdetails": "1",
            "countrycodes": "de",
            "limit": "6",
        })
        data = fetch_json(url, {"Accept": "application/json", "User-Agent": "Tankprofi/1.0 local"})
        items = [{
            "label": item.get("display_name", ""),
            "lat": float(item.get("lat", 0)),
            "lng": float(item.get("lon", 0)),
            "type": item.get("type", ""),
        } for item in data]
        return self.send_json({"items": items})

    def handle_reverse(self, parsed):
        params = urllib.parse.parse_qs(parsed.query)
        lat = (params.get("lat", [""])[0] or "").strip()
        lng = (params.get("lng", [""])[0] or "").strip()
        if not lat or not lng:
            return self.send_json({"error": "Missing coordinates."}, 422)
        url = "https://nominatim.openstreetmap.org/reverse?" + urllib.parse.urlencode({
            "lat": lat,
            "lon": lng,
            "format": "jsonv2",
            "addressdetails": "1",
            "zoom": "18",
        })
        data = fetch_json(url, {"Accept": "application/json", "User-Agent": "Tankprofi/1.0 local"})
        label = data.get("display_name") or "Aktueller Standort"
        return self.send_json({"label": label})

    def handle_search(self, parsed):
        if not API_KEY:
            return self.send_json({"error": "TANKERKOENIG_API_KEY is missing."}, 500)
        params = urllib.parse.parse_qs(parsed.query)
        fuel = (params.get("fuel", ["e10"])[0] or "e10").lower()
        if fuel not in ("e10", "e5", "diesel"):
            fuel = "e10"
        lat = params.get("lat", [""])[0]
        lng = params.get("lng", [""])[0]
        radius = params.get("radius", ["5"])[0]
        limit = max(5, min(100, int(float(params.get("limit", ["25"])[0]))))
        only_open = params.get("open", ["0"])[0] == "1"
        only_priced = params.get("priced", ["1"])[0] != "0"
        url = "https://creativecommons.tankerkoenig.de/json/list.php?" + urllib.parse.urlencode({
            "lat": lat,
            "lng": lng,
            "rad": radius,
            "sort": "price",
            "type": fuel,
            "apikey": API_KEY,
        })
        data = fetch_json(url)
        if not data.get("ok"):
            return self.send_json({"error": data.get("message", "Tankerkoenig request failed.")}, 502)
        stations = [self.normalize_station(item, fuel) for item in data.get("stations", [])]
        if only_open:
            stations = [item for item in stations if item["is_open"]]
        if only_priced:
            stations = [item for item in stations if item["price"] is not None]
        stations.sort(key=lambda item: (item["price"] if item["price"] is not None else 999, item["distance"]))
        stations = stations[:limit]
        return self.send_json({"fuel": fuel, "count": len(stations), "stations": stations})

    def normalize_station(self, item, fuel):
        price = item.get("price")
        return {
            "tankerkoenig_id": item.get("id", ""),
            "name": item.get("name", ""),
            "brand": item.get("brand", ""),
            "street": item.get("street", ""),
            "house_number": item.get("houseNumber", ""),
            "postcode": item.get("postCode", ""),
            "city": item.get("place", ""),
            "lat": float(item.get("lat", 0)),
            "lng": float(item.get("lng", 0)),
            "distance": float(item.get("dist", 0)),
            "is_open": bool(item.get("isOpen")),
            "fuel_type": fuel,
            "price": float(price) if isinstance(price, (int, float)) else None,
            "last_update": "",
        }

    def serve_static(self, request_path):
        safe_path = "/index.html" if request_path == "/" else urllib.parse.unquote(request_path)
        file_path = (PUBLIC / safe_path.lstrip("/")).resolve()
        if not str(file_path).startswith(str(PUBLIC.resolve())) or not file_path.exists() or file_path.is_dir():
            self.send_response(404)
            self.end_headers()
            return
        body = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(file_path.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    server.serve_forever()
