#!/usr/bin/env bash
set -euo pipefail

# Скрипт для деплоя проекта в /var/crm

DEPLOY_DIR="/var/crm"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Начинаем деплой проекта в ${DEPLOY_DIR}..."

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Этот скрипт требует прав root. Используйте: sudo $0"
    exit 1
fi

# Проверка наличия Docker
if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker не установлен. Установите Docker сначала."
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker не запущен. Запустите Docker."
    exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
    echo "❌ Нужен docker compose v2 (команда \"docker compose\")."
    exit 1
fi

# Создание директории деплоя
echo "📁 Создаём директорию ${DEPLOY_DIR}..."
mkdir -p "${DEPLOY_DIR}"

# Копирование файлов проекта
echo "📦 Копируем файлы проекта..."
rsync -av --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='ngrok.log' \
    --exclude='.DS_Store' \
    "${PROJECT_DIR}/" "${DEPLOY_DIR}/"

# Настройка прав доступа
echo "🔐 Настраиваем права доступа..."
chown -R root:root "${DEPLOY_DIR}"
chmod +x "${DEPLOY_DIR}/server_install.sh" 2>/dev/null || true
chmod +x "${DEPLOY_DIR}/deploy.sh" 2>/dev/null || true

# Проверка наличия .env файла
ENV_FILE="${DEPLOY_DIR}/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "📝 Создаём .env файл..."
    
    read -r -p "Домен (пример: example.com www.example.com): " DOMAIN
    DOMAIN=${DOMAIN:-localhost}
    PRIMARY_DOMAIN=$(printf "%s" "$DOMAIN" | awk '{print $1}')
    
    read -r -p "Email для Let's Encrypt (оставьте пустым для самоподписанного): " LE_EMAIL
    
    POSTGRES_PASSWORD=$(openssl rand -hex 12)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://investcrm_user:${POSTGRES_PASSWORD}@postgres:5432/investcrm?schema=public

NEXTAUTH_URL=https://${PRIMARY_DOMAIN}
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
    echo "✅ Создан .env файл с сгенерированными секретами."
else
    echo "ℹ️ .env файл уже существует, используем его."
    PRIMARY_DOMAIN=$(grep NEXTAUTH_URL "$ENV_FILE" | cut -d'=' -f2 | sed 's|https\?://||' | awk '{print $1}')
fi

# Переход в директорию деплоя
cd "${DEPLOY_DIR}"

# Обновление nginx конфигурации
NGINX_CONF="${DEPLOY_DIR}/nginx/conf.d/default.conf"
if [ -f "$NGINX_CONF" ] && [ -n "${PRIMARY_DOMAIN:-}" ]; then
    echo "🔧 Обновляем конфигурацию nginx..."
    sed -i.bak "s/server_name _.*/server_name ${PRIMARY_DOMAIN};/" "$NGINX_CONF" 2>/dev/null || true
    sed -i.bak "s/server_name _;  # Замените на ваш домен/server_name ${PRIMARY_DOMAIN};/" "$NGINX_CONF" 2>/dev/null || true
fi

# Создание необходимых директорий
echo "📂 Создаём необходимые директории..."
mkdir -p "${DEPLOY_DIR}/nginx/ssl" \
         "${DEPLOY_DIR}/nginx/letsencrypt" \
         "${DEPLOY_DIR}/nginx/certbot" \
         "${DEPLOY_DIR}/nginx/logs" \
         "${DEPLOY_DIR}/public/uploads"

# Генерация самоподписанного SSL сертификата (если не существует)
SSL_CERT="${DEPLOY_DIR}/nginx/ssl/cert.pem"
SSL_KEY="${DEPLOY_DIR}/nginx/ssl/key.pem"
if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
    echo "🔒 Генерируем самоподписанный SSL сертификат..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -subj "/CN=${PRIMARY_DOMAIN:-localhost}" \
        -keyout "$SSL_KEY" -out "$SSL_CERT" 2>/dev/null || true
    echo "✅ SSL сертификат создан."
fi

# Остановка существующих контейнеров (если есть)
echo "🛑 Останавливаем существующие контейнеры..."
docker compose -f "${DEPLOY_DIR}/docker-compose.yml" down 2>/dev/null || true

# Запуск PostgreSQL и ожидание готовности
echo "🐘 Запускаем PostgreSQL..."
docker compose -f "${DEPLOY_DIR}/docker-compose.yml" up -d postgres

echo "⏳ Ждём готовность PostgreSQL..."
for i in {1..30}; do
    if docker compose -f "${DEPLOY_DIR}/docker-compose.yml" exec -T postgres pg_isready -U investcrm_user -d investcrm >/dev/null 2>&1; then
        echo "✅ PostgreSQL готов"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL не запустился за 60 секунд"
        exit 1
    fi
    sleep 2
done

# Применение миграций Prisma
echo "🔄 Применяем миграции Prisma..."
# Сначала собираем образ, чтобы prisma был доступен
docker compose -f "${DEPLOY_DIR}/docker-compose.yml" build app
docker compose -f "${DEPLOY_DIR}/docker-compose.yml" run --rm app ./node_modules/.bin/prisma migrate deploy || {
    echo "⚠️ Ошибка при применении миграций. Продолжаем..."
}

# Сборка и запуск всех сервисов
echo "🔨 Собираем и запускаем все сервисы..."
docker compose -f "${DEPLOY_DIR}/docker-compose.yml" up -d --build

# Ожидание запуска приложения
echo "⏳ Ждём запуск приложения..."
sleep 10

# Проверка статуса
echo "📊 Статус контейнеров:"
docker compose -f "${DEPLOY_DIR}/docker-compose.yml" ps

echo ""
echo "✅ Деплой завершён!"
echo "📍 Приложение доступно по адресу: https://${PRIMARY_DOMAIN:-localhost}"
echo "📁 Файлы проекта находятся в: ${DEPLOY_DIR}"
echo ""
echo "Полезные команды:"
echo "  Просмотр логов: docker compose -f ${DEPLOY_DIR}/docker-compose.yml logs -f"
echo "  Остановка: docker compose -f ${DEPLOY_DIR}/docker-compose.yml down"
echo "  Перезапуск: docker compose -f ${DEPLOY_DIR}/docker-compose.yml restart"
echo "  Обновление: cd ${DEPLOY_DIR} && git pull && docker compose up -d --build"


