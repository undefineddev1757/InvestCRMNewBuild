#!/usr/bin/env bash
set -e

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
RECREATE_DB=false

# Останавливаем все контейнеры перед началом
echo "🛑 Останавливаем существующие контейнеры..."
docker compose down 2>/dev/null || true

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
    
    # Если создаем новый .env, пересоздаем базу данных чтобы пароль совпал
    RECREATE_DB=true
else
    echo "ℹ️ .env файл уже существует, используем его."
    PRIMARY_DOMAIN=$(grep NEXTAUTH_URL "$ENV_FILE" | cut -d'=' -f2 | sed 's|https\?://||' | awk '{print $1}' || echo "localhost")
    DOMAIN="${PRIMARY_DOMAIN}"
    # Не пересоздаём базу данных если .env уже существует
fi

# Пересоздаем базу данных если нужно
if [ "$RECREATE_DB" = true ]; then
    echo "🗑️ Удаляем старую базу данных..."
    docker compose down -v 2>/dev/null || true
    # Ждем немного чтобы volumes освободились
    sleep 2
fi

# Создаём директорию для uploads
mkdir -p "$PROJECT_ROOT/public/uploads"

# ===========================================
# Определяем режим работы nginx
# ===========================================
USE_BUILTIN_NGINX=false

# Проверяем, можно ли использовать встроенный nginx
check_port() {
    ! (ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -q ":$1 "
}

# Можно принудительно задать через переменную: NGINX_MODE=builtin или NGINX_MODE=external
if [ "${NGINX_MODE:-}" = "builtin" ]; then
    USE_BUILTIN_NGINX=true
    echo "ℹ️ Принудительно используем встроенный nginx (NGINX_MODE=builtin)"
elif [ "${NGINX_MODE:-}" = "external" ]; then
    USE_BUILTIN_NGINX=false
    echo "ℹ️ Принудительно используем внешний nginx (NGINX_MODE=external)"
else
    # Автоопределение
    if check_port 80 && check_port 443; then
        USE_BUILTIN_NGINX=true
        echo "✅ Порты 80 и 443 свободны - используем встроенный nginx"
    else
        USE_BUILTIN_NGINX=false
        echo "ℹ️ Порты 80/443 заняты - используем внешний nginx (app на порту 3001)"
    fi
fi

# Настраиваем nginx конфиги если используем встроенный
if [ "$USE_BUILTIN_NGINX" = true ]; then
    # Создаём директории для nginx
    SSL_DIR="$PROJECT_ROOT/nginx/ssl"
    LE_DIR="$PROJECT_ROOT/nginx/letsencrypt"
    CB_DIR="$PROJECT_ROOT/nginx/certbot"
    mkdir -p "$SSL_DIR" "$LE_DIR" "$CB_DIR" "$PROJECT_ROOT/nginx/logs"
    
    # Обновляем server_name в nginx конфиге
    NGINX_CONF="$PROJECT_ROOT/nginx/conf.d/default.conf"
    if [ -f "$NGINX_CONF" ] && [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "_" ]; then
        sed -i.bak "s/server_name _.*/server_name ${DOMAIN};/g" "$NGINX_CONF" 2>/dev/null || true
        echo "✅ Обновлён nginx server_name -> ${DOMAIN}"
    fi
    
    # Генерируем самоподписанный сертификат если нет
    if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -subj "/CN=${PRIMARY_DOMAIN:-localhost}" \
            -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" 2>/dev/null
        echo "✅ Сгенерирован самоподписанный SSL сертификат"
    fi
else
    # App слушает на localhost:3001 (доступен и для встроенного nginx через сеть, и для внешнего)
    
    # Генерируем конфиг для внешнего nginx
    cat > "$PROJECT_ROOT/nginx-site.conf" <<NGINXEOF
# Конфигурация для ${PRIMARY_DOMAIN}
# Скопируйте: cp ${PROJECT_ROOT}/nginx-site.conf /etc/nginx/sites-available/${PRIMARY_DOMAIN}.conf
# Активируйте: ln -sf /etc/nginx/sites-available/${PRIMARY_DOMAIN}.conf /etc/nginx/sites-enabled/
# Проверьте: nginx -t && systemctl reload nginx

server {
    listen 80;
    server_name ${PRIMARY_DOMAIN} www.${PRIMARY_DOMAIN};
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ${PRIMARY_DOMAIN} www.${PRIMARY_DOMAIN};

    # SSL - раскомментируйте после получения сертификата:
    # certbot certonly --webroot -w /var/www/certbot -d ${PRIMARY_DOMAIN}
    ssl_certificate /etc/letsencrypt/live/${PRIMARY_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${PRIMARY_DOMAIN}/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }

    location /_next/static {
        proxy_pass http://127.0.0.1:3001;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }
}
NGINXEOF
    echo "✅ Создан конфиг для внешнего nginx: ${PROJECT_ROOT}/nginx-site.conf"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🚀 ЗАПУСК ВСЕХ СЕРВИСОВ"
echo "═══════════════════════════════════════════════════════════"

echo ""
echo "1️⃣ Запускаем PostgreSQL..."
docker compose up -d postgres

echo ""
echo "2️⃣ Ждём готовность PostgreSQL (максимум 60 секунд)..."
POSTGRES_READY=false
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U investcrm_user -d investcrm >/dev/null 2>&1; then
    echo "✅ PostgreSQL готов!"
    POSTGRES_READY=true
    break
  fi
  echo "   Ожидание... ($i/30)"
  sleep 2
done

if [ "$POSTGRES_READY" = false ]; then
  echo "❌ PostgreSQL не запустился за 60 секунд!"
  echo "Проверьте логи: docker compose logs postgres"
  exit 1
fi

echo ""
echo "3️⃣ Собираем образ приложения..."
docker compose build app

echo ""
echo "4️⃣ Применяем миграции Prisma..."

# Получаем пароль из .env
POSTGRES_PASSWORD=$(grep POSTGRES_PASSWORD "$ENV_FILE" | cut -d'=' -f2)

# Получаем имя собранного образа app
APP_IMAGE=$(docker compose config --images | grep app || echo "crm-app")

# Запускаем миграции через собранный app образ (в нём уже есть OpenSSL и Prisma)
echo "   Запуск prisma migrate deploy..."
docker run --rm \
    --network="investcrm_network" \
    -e DATABASE_URL="postgresql://investcrm_user:${POSTGRES_PASSWORD}@investcrm_postgres:5432/investcrm?schema=public" \
    "${APP_IMAGE}" \
    npx prisma migrate deploy 2>&1

MIGRATE_EXIT_CODE=$?

if [ $MIGRATE_EXIT_CODE -eq 0 ]; then
    echo "✅ Миграции применены успешно"
else
    echo "⚠️ Код выхода миграций: $MIGRATE_EXIT_CODE"
    echo "Проверяем статус базы данных..."
    
    # Проверяем статус
    MIGRATE_STATUS=$(docker run --rm \
        --network="investcrm_network" \
        -e DATABASE_URL="postgresql://investcrm_user:${POSTGRES_PASSWORD}@investcrm_postgres:5432/investcrm?schema=public" \
        "${APP_IMAGE}" \
        npx prisma migrate status 2>&1)
    
    echo "$MIGRATE_STATUS"
    
    # Если база данных актуальна - это ОК
    if echo "$MIGRATE_STATUS" | grep -q "Database schema is up to date"; then
        echo "✅ База данных уже актуальна"
    else
        echo ""
        echo "❌ Критическая ошибка при применении миграций!"
        echo "Проверьте логи выше и .env файл"
        exit 1
    fi
fi

echo ""
echo "5️⃣ Запускаем все сервисы..."
if [ "$USE_BUILTIN_NGINX" = true ]; then
    docker compose --profile with-nginx up -d
else
    docker compose up -d
fi

echo ""
echo "6️⃣ Ждём запуск приложения (10 секунд)..."
sleep 10

echo ""
echo "7️⃣ Проверяем статус контейнеров..."
docker compose ps

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ УСТАНОВКА ЗАВЕРШЕНА!"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$USE_BUILTIN_NGINX" = true ]; then
    echo "🌐 Приложение доступно:"
    echo "   http://${PRIMARY_DOMAIN}"
    echo "   https://${PRIMARY_DOMAIN} (самоподписанный сертификат)"
    echo ""
    echo "🔒 Для получения Let's Encrypt сертификата:"
    echo "   docker compose exec nginx certbot --nginx -d ${PRIMARY_DOMAIN}"
else
    echo "🌐 Приложение слушает на: 127.0.0.1:3001"
    echo ""
    echo "🔧 НАСТРОЙТЕ ВАШ NGINX:"
    echo "   1. Скопируйте конфиг:"
    echo "      cp ${PROJECT_ROOT}/nginx-site.conf /etc/nginx/sites-available/${PRIMARY_DOMAIN}.conf"
    echo ""
    echo "   2. Активируйте:"
    echo "      ln -sf /etc/nginx/sites-available/${PRIMARY_DOMAIN}.conf /etc/nginx/sites-enabled/"
    echo ""
    echo "   3. Получите SSL сертификат:"
    echo "      certbot certonly --webroot -w /var/www/certbot -d ${PRIMARY_DOMAIN}"
    echo ""
    echo "   4. Перезагрузите nginx:"
    echo "      nginx -t && systemctl reload nginx"
fi

echo ""
echo "📝 Файл .env: $ENV_FILE"
echo "   Не забудьте установить NEXTAUTH_URL=https://${PRIMARY_DOMAIN}"
echo ""
echo "📊 Команды:"
echo "   docker compose ps          # статус"
echo "   docker compose logs -f app # логи"
echo "   docker compose restart     # перезапуск"
echo ""
echo "═══════════════════════════════════════════════════════════"

