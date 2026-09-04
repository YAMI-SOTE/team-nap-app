# deploy/ — public VPS deployment

Files for exposing the backend to the public internet **directly from the
VPS** (no Tailscale Funnel, no Cloudflare Tunnel). Caddy terminates TLS
with an automatic Let's Encrypt certificate and reverse-proxies to the
backend; Postgres / Ollama / the raw backend port stop being published.

| File | What it is |
| --- | --- |
| `Caddyfile` | Caddy config. One site, `{$API_DOMAIN}` from the env, `reverse_proxy backend:3000`. WebSocket works automatically. |
| `compose.prod.yaml` | Compose overlay: adds `caddy` (80/443), removes the `ports:` publishing on `backend` / `db` / `ollama`, forces `NODE_ENV=production`. |
| `.env.prod.example` | Copy to the **repo root** as `.env`. Holds `API_DOMAIN`, `NODE_ENV`, `OLLAMA_MODEL`. |

## Use

```bash
# on the VPS, repo root
cp deploy/.env.prod.example .env
$EDITOR .env                      # set API_DOMAIN (+ OLLAMA_MODEL, password)

docker compose -f compose.yaml -f deploy/compose.prod.yaml up -d --build
docker compose -f compose.yaml -f deploy/compose.prod.yaml logs -f caddy
```

Wait for Caddy to log `certificate obtained successfully`, then from any
machine off the VPS:

```bash
curl https://<API_DOMAIN>/api/v1/health     # -> {"status":"ok",...}
```

Full walkthrough (DNS, firewall, verification, teardown, security notes):
[`docs/split-deployment.md` §2 案 C](../docs/split-deployment.md).

## Prerequisites

- An A record for `API_DOMAIN` pointing at the VPS public IP (or use
  `<VPS_IP>.sslip.io`, which needs no DNS setup).
- Inbound TCP **80** and **443** open on the VPS firewall **and** the
  cloud provider's security group. Port 80 is required for the ACME
  HTTP-01 challenge.
- Docker Compose **v2.24.0+** for `ports: !reset []`. On older Compose,
  instead edit `compose.yaml` to change `"5432:5432"` → `"127.0.0.1:5432:5432"`,
  `"11434:11434"` → `"127.0.0.1:11434:11434"`, and remove the backend
  `"3000:3000"` mapping.

## Teardown after judging

```bash
docker compose -f compose.yaml -f deploy/compose.prod.yaml down
sudo ufw deny 80/tcp && sudo ufw deny 443/tcp
```
