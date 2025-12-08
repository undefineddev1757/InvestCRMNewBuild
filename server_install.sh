#!/usr/bin/env bash
set -euo pipefail

# One-shot installer: builds and runs the stack via Docker,
# creates .env, seeds passwords/secrets, patches nginx domain,
# runs Prisma migrations.

# Определяем директорию деплоя
DEPLOY_DIR="${1:-/var/crm}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_DIR="$(pwd)"

# Флаг, что мы уже в директории деплоя (передается через переменную окружения)
if [ -z "${DEPLOYED_FROM:-}" ] && [ "$SOURCE_DIR" != "$DEPLOY_DIR" ]; then
    echo "🚀 Копируем проект в ${DEPLOY_DIR}..."
    
    # Проверка прав root для /var/crm
    if [[ "$DEPLOY_DIR" == /var/* ]] && [ "$EUID" -ne 0 ]; then
        echo "❌ Для деплоя в ${DEPLOY_DIR} требуются права root. Используйте: sudo $0"
        exit 1
    fi
    
    # Создание директории деплоя
    mkdir -p "${DEPLOY_DIR}"
    
    # Копирование файлов (используем cp если rsync недоступен)
    if command -v rsync >/dev/null 2>&1; then
        rsync -av --progress \
            --exclude='.git' \
            --exclude='node_modules' \
            --exclude='.next' \
            --exclude='.env' \
            --exclude='*.log' \
            --exclude='ngrok.log' \
            --exclude='.DS_Store' \
            "${SOURCE_DIR}/" "${DEPLOY_DIR}/"
    else
        echo "⚠️ rsync не найден, используем cp..."
        cp -r "${SOURCE_DIR}"/* "${DEPLOY_DIR}/" 2>/dev/null || true
        cp -r "${SOURCE_DIR}"/.[!.]* "${DEPLOY_DIR}/" 2>/dev/null || true
        # Удаляем ненужные файлы
        rm -rf "${DEPLOY_DIR}/.git" "${DEPLOY_DIR}/node_modules" "${DEPLOY_DIR}/.next" 2>/dev/null || true
    fi
    
    echo "✅ Проект скопирован в ${DEPLOY_DIR}"
    echo "🔄 Запускаем установку из ${DEPLOY_DIR}..."
    
    # Запускаем скрипт из директории деплоя с флагом
    DEPLOYED_FROM="$SOURCE_DIR" exec bash "${DEPLOY_DIR}/server_install.sh" "$DEPLOY_DIR"
fi

# Работаем из директории деплоя
PROJECT_ROOT="${DEPLOY_DIR}"
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

ENV_FILE="$PROJECT_ROOT/.env"

# Проверка наличия .env файла
if [ ! -f "$ENV_FILE" ]; then
    echo "📝 Создаём .env файл с автоматически сгенерированными настройками..."
    
    # Используем переменные окружения или значения по умолчанию
    DOMAIN="${DOMAIN:-localhost}"
    PRIMARY_DOMAIN=$(printf "%s" "$DOMAIN" | awk '{print $1}')
    
    # Генерируем все необходимые секреты
    POSTGRES_PASSWORD=$(openssl rand -hex 12)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://investcrm_user:${POSTGRES_PASSWORD}@postgres:5432/investcrm?schema=public

NEXTAUTH_URL=http://${PRIMARY_DOMAIN}
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
    
    chmod 600 "$ENV_FILE"
    echo "✅ Создан .env файл с автоматически сгенерированными секретами."
    echo "📍 Файл находится в: $ENV_FILE"
    echo "💡 Вы можете отредактировать его и добавить свои значения для WALLET_API_KEY и POLYGON_API_KEY"
else
    echo "ℹ️ .env файл уже существует, используем его."
    PRIMARY_DOMAIN=$(grep NEXTAUTH_URL "$ENV_FILE" | cut -d'=' -f2 | sed 's|https\?://||' | awk '{print $1}' || echo "localhost")
    DOMAIN="${PRIMARY_DOMAIN}"
fi

NGINX_CONF="$PROJECT_ROOT/nginx/conf.d/default.conf"
if [ -f "$NGINX_CONF" ]; then
  # Обновляем server_name только если домен не localhost
  if [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "_" ]; then
    cp "$NGINX_CONF" "${NGINX_CONF}.bak" 2>/dev/null || true
    sed -i.bak "s/server_name _.*/server_name ${DOMAIN};/" "$NGINX_CONF" 2>/dev/null || true
    sed -i.bak "s/server_name _;  # Замените на ваш домен/server_name ${DOMAIN};/" "$NGINX_CONF" 2>/dev/null || true
    echo "✅ Обновлён nginx server_name -> ${DOMAIN}"
  else
    echo "ℹ️ Используется стандартная конфигурация nginx (server_name _)"
  fi
else
  echo "⚠️ nginx/conf.d/default.conf не найден, пропущено."
fi

SSL_DIR="$PROJECT_ROOT/nginx/ssl"
LE_DIR="$PROJECT_ROOT/nginx/letsencrypt"
CB_DIR="$PROJECT_ROOT/nginx/certbot"
mkdir -p "$SSL_DIR" "$LE_DIR" "$CB_DIR" "$PROJECT_ROOT/public/uploads"

if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -subj "/CN=${PRIMARY_DOMAIN:-localhost}" \
    -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" 2>/dev/null
  echo "✅ Сгенерирован самоподписанный SSL сертификат"
else
  echo "ℹ️ Найдены существующие SSL сертификаты, переиспользую."
fi

echo "➡️ Запускаем PostgreSQL..."
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
# Сначала собираем образ, чтобы prisma был доступен
docker compose build app
# Используем env_file чтобы переменные из .env подхватились
docker compose run --rm --env-file .env app ./node_modules/.bin/prisma migrate deploy || {
    echo "⚠️ Ошибка при применении миграций, возможно база данных уже инициализирована. Продолжаем..."
}

echo "➡️ Сборка и запуск сервисов..."
docker compose up -d --build

echo ""
echo "✅ Готово! Все сервисы запущены."
echo ""
echo "📊 Статус контейнеров:"
docker compose ps
echo ""
echo "📍 Приложение доступно по адресу: http://${PRIMARY_DOMAIN}"
echo "💡 Для настройки домена и SSL отредактируйте .env файл и перезапустите:"
echo "   docker compose restart nginx app"
echo ""
echo "📝 Файл .env находится в: $ENV_FILE"
echo "   Вы можете добавить свои значения для:"
echo "   - WALLET_API_KEY"
echo "   - POLYGON_API_KEY"

