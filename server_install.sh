#!/usr/bin/env bash
set -euo pipefail

# One-shot installer: builds and runs the stack via Docker,
# creates .env, seeds passwords/secrets, patches nginx domain,
# runs Prisma migrations.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Требуется утилита: $1" >&2
    exit 1
  fi
}

require_cmd docker
require_cmd bash

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker не запущен. Запустите Docker или Docker Desktop." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "❌ Нужен docker compose v2 (команда \"docker compose\")." >&2
  exit 1
fi

read -r -p "Домен (пример: example.com www.example.com): " DOMAIN
DOMAIN=${DOMAIN:-_}
PRIMARY_DOMAIN=$(printf "%s" "$DOMAIN" | awk '{print $1}')
read -r -p "Email для Let's Encrypt (оставьте пустым для самоподписанного): " LE_EMAIL

POSTGRES_PASSWORD=$(openssl rand -hex 12)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

ENV_FILE="$PROJECT_ROOT/.env"
cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://investcrm_user:${POSTGRES_PASSWORD}@postgres:5432/investcrm?schema=public

NEXTAUTH_URL=https://${DOMAIN% *}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

WALLET_API_URL=http://localhost:3003
WALLET_API_KEY=

EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=

POLYGON_API_KEY=
NEXT_PUBLIC_POLYGON_API_KEY=\${POLYGON_API_KEY}
EOF

echo "✅ Создан .env с сгенерированными секретами."

NGINX_CONF="$PROJECT_ROOT/nginx/conf.d/default.conf"
if [ -f "$NGINX_CONF" ]; then
  cp "$NGINX_CONF" "${NGINX_CONF}.bak"
  sed -i.bak "s/server_name _.*/server_name ${DOMAIN};/" "$NGINX_CONF" || true
  sed -i.bak "s/server_name _;  # Замените на ваш домен, например: example.com www.example.com/server_name ${DOMAIN};/" "$NGINX_CONF" || true
  sed -i.bak "s|ssl_certificate .*|ssl_certificate /etc/nginx/ssl/cert.pem;|" "$NGINX_CONF" || true
  sed -i.bak "s|ssl_certificate_key .*|ssl_certificate_key /etc/nginx/ssl/key.pem;|" "$NGINX_CONF" || true
  echo "✅ Обновлён nginx server_name -> ${DOMAIN}, пока использует самоподписанный SSL"
else
  echo "⚠️ nginx/conf.d/default.conf не найден, пропущено."
fi

SSL_DIR="$PROJECT_ROOT/nginx/ssl"
LE_DIR="$PROJECT_ROOT/nginx/letsencrypt"
CB_DIR="$PROJECT_ROOT/nginx/certbot"
mkdir -p "$SSL_DIR" "$LE_DIR" "$CB_DIR"

if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -subj "/CN=${PRIMARY_DOMAIN:-localhost}" \
    -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem"
  echo "✅ Сгенерирован самоподписанный сертификат (nginx/ssl/cert.pem, key.pem)"
else
  echo "ℹ️ Найдены существующие сертификаты в nginx/ssl, переиспользую."
fi

echo "➡️ docker compose pull..."
docker compose pull

echo "➡️ docker compose up -d postgres..."
docker compose up -d postgres

echo "➡️ Ждём готовность Postgres..."
for _ in {1..30}; do
  if docker compose exec postgres pg_isready -U investcrm_user -d investcrm >/dev/null 2>&1; then
    echo "✅ Postgres готов"
    break
  fi
  sleep 2
done

echo "➡️ Применяем миграции Prisma..."
docker compose run --rm app npx prisma migrate deploy

echo "➡️ Сборка и запуск сервисов..."
docker compose up -d --build

if [ -n "$LE_EMAIL" ] && [ "$DOMAIN" != "_" ]; then
  echo "➡️ Запрашиваем сертификат Let's Encrypt..."
  docker run --rm \
    -v "$LE_DIR:/etc/letsencrypt" \
    -v "$CB_DIR:/var/www/certbot" \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d "$PRIMARY_DOMAIN" \
    -m "$LE_EMAIL" --agree-tos --non-interactive --no-eff-email || true

  if [ -d "$LE_DIR/live/$PRIMARY_DOMAIN" ]; then
    sed -i.bak "s|ssl_certificate /etc/nginx/ssl/cert.pem;|ssl_certificate /etc/letsencrypt/live/${PRIMARY_DOMAIN}/fullchain.pem;|" "$NGINX_CONF" || true
    sed -i.bak "s|ssl_certificate_key /etc/nginx/ssl/key.pem;|ssl_certificate_key /etc/letsencrypt/live/${PRIMARY_DOMAIN}/privkey.pem;|" "$NGINX_CONF" || true
    echo "✅ Получен сертификат Let's Encrypt, обновлён nginx конфиг."
    docker compose exec nginx nginx -s reload || true
  else
    echo "⚠️ Не удалось получить сертификат Let's Encrypt, оставлен самоподписанный."
  fi
else
  echo "ℹ️ Let's Encrypt пропущен (не указан email или домен). Используется самоподписанный."
fi

echo "✅ Готово. Приложение: https://${PRIMARY_DOMAIN}"

