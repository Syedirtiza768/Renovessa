# Deployment — Ubuntu + Docker + Nginx + Certbot

> **Domain:** `renovessa.com`  
> **Status:** Implemented (manual server deploy)

## Architecture

```text
Internet → Nginx (80/443, TLS) → 127.0.0.1:7090 → Docker app
                                      ↓
                              Docker PostgreSQL (internal network only)
```

- The app container binds to **localhost only** in production (`docker-compose.prod.yml`).
- Nginx runs on the **host** (not in Docker) and proxies to the app.
- Certbot obtains and renews Let's Encrypt certificates for Nginx.

## Prerequisites

| Item | Notes |
|------|--------|
| Ubuntu 22.04 or 24.04 LTS | Other Debian-based distros work with the same packages |
| DNS | `A` record `renovessa.com` → server public IP |
| DNS | `A` or `CNAME` `www.renovessa.com` → same IP (recommended) |
| Ports | 22 (SSH), 80 and 443 open in cloud firewall / security group |
| Git | Repo cloned on the server |

## 1. Server packages

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx ufw

# Docker (official convenience script)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
# Log out and back in so docker runs without sudo
```

Optional firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 2. Application directory

```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot

cd /opt   # or your preferred path
sudo git clone <your-repo-url> renovessa
sudo chown -R "$USER":"$USER" renovessa
cd renovessa
```

## 3. Production environment

```bash
cp .env.production.example .env
nano .env
```

Set strong values:

```bash
openssl rand -base64 32   # use for AUTH_SECRET
openssl rand -base64 24   # use for POSTGRES_PASSWORD
```

| Variable | Production value |
|----------|------------------|
| `POSTGRES_PASSWORD` | Long random string |
| `AUTH_SECRET` | Long random string (different from DB password) |
| `NEXT_PUBLIC_APP_URL` | `https://renovessa.com` |
| `RUN_SEED` | `false` (use `true` only once for demo data, then `false`) |

## 4. Start Docker stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Verify the app responds locally:

```bash
curl -sI http://127.0.0.1:7090 | head -5
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f app
```

## 5. Nginx reverse proxy

```bash
sudo cp deploy/nginx/renovessa.com.conf /etc/nginx/sites-available/renovessa.com
sudo ln -sf /etc/nginx/sites-available/renovessa.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
```

Test over HTTP (before TLS):

```bash
curl -sI http://renovessa.com | head -5
```

## 6. TLS with Certbot

DNS must already resolve to this server.

```bash
sudo certbot --nginx -d renovessa.com -d www.renovessa.com
```

Follow the prompts (email, terms, redirect HTTP → HTTPS recommended).

Renewal is automatic via systemd timer:

```bash
sudo certbot renew --dry-run
```

## 7. Post-deploy checks

- [ ] `https://renovessa.com` loads the site
- [ ] Login and cookies work (depends on `NEXT_PUBLIC_APP_URL` matching the public URL)
- [ ] `docker compose ... ps` shows `db` and `app` healthy
- [ ] `RUN_SEED` is `false` in `.env` for production

## Updates (redeploy)

```bash
cd /opt/renovessa
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Database schema is applied on container start (`db push` in `docker-entrypoint.sh`).

## Logs and maintenance

```bash
# App logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f app

# Nginx
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log

# Restart app only
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart app
```

## Rollback

1. Check out the previous git commit on the server.
2. Rebuild: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
3. If a migration is incompatible, restore PostgreSQL from backup before redeploying.

Back up the database volume before major upgrades:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec db \
  pg_dump -U renovessa renovessa > backup-$(date +%F).sql
```

## Troubleshooting

| Symptom | Check |
|---------|--------|
| 502 Bad Gateway | App not listening — see **502 Bad Gateway** below |

### 502 Bad Gateway

Nginx returns 502 when nothing answers on `127.0.0.1:7090`. On the server:

```bash
cd /opt/renovessa
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs app --tail 80
curl -v http://127.0.0.1:7090/api/health
sudo ss -tlnp | grep 7090
```

| `docker ps` shows | Action |
|-------------------|--------|
| `app` missing or `Restarting` | Read `logs app` — often DB not ready or `db push` failed |
| `app` Up but curl fails | Rebuild with `HOSTNAME=0.0.0.0` in compose; `up -d --build` |
| Port 7090 used by non-Docker process | `docker compose down`; stop conflicting process |
| `address already in use` but `ss` shows nothing | **Duplicate port mappings** — base `7090:7090` + prod `127.0.0.1:7090:7090` merged; remove `ports` from base `docker-compose.yml` or use `ports: !reset` in prod (fixed in repo) |
| `app` never becomes healthy | Wait 90s after start; check Prisma errors in logs |

Fix and restart:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
| Certbot fails | DNS propagation, port 80 reachable from internet |
| Wrong redirects / auth | `NEXT_PUBLIC_APP_URL=https://renovessa.com` in `.env`, rebuild app |
| DB connection errors | `POSTGRES_PASSWORD` in `.env` matches `DATABASE_URL` credentials |

See also `docs/operations/TROUBLESHOOTING.md`.

## Files in repo

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Base stack (db + app) |
| `docker-compose.prod.yml` | Production overrides (localhost bind, secrets, no default seed) |
| `.env.production.example` | Template for server `.env` |
| `deploy/nginx/renovessa.com.conf` | Nginx HTTP proxy (Certbot adds HTTPS) |
| `deploy/nginx/renovessa.com.ssl.conf.example` | Manual SSL reference |
