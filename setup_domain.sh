#!/usr/bin/env bash
set -e

# ===========================================
# Автоматическая настройка домена для CRM
# Использование: sudo bash setup_domain.sh invest-platform.top
# ===========================================

DOMAIN="${1:-}"
PROJECT_DIR="${2:-/var/www/crm}"

if [ -z "$DOMAIN" ]; then
    echo "🌐 Введите домен для CRM:"
    read -r DOMAIN
fi

if [ -z "$DOMAIN" ]; then
    echo "❌ Домен не указан!"
    echo "Использование: sudo bash setup_domain.sh your-domain.com"
    exit 1
fi

# Проверка root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Требуются права root. Используйте: sudo bash $0 $DOMAIN"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🌐 НАСТРОЙКА ДОМЕНА: $DOMAIN"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ===========================================
# 1. Определяем структуру nginx
# ===========================================
NGINX_CONF_DIR=""
NGINX_ENABLED_DIR=""

if [ -d "/etc/nginx/sites-available" ]; then
    NGINX_CONF_DIR="/etc/nginx/sites-available"
    NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
elif [ -d "/etc/nginx/conf.d" ]; then
    NGINX_CONF_DIR="/etc/nginx/conf.d"
    NGINX_ENABLED_DIR=""  # conf.d не требует симлинков
else
    # Создаём стандартную структуру
    echo "📁 Создаём структуру директорий nginx..."
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    NGINX_CONF_DIR="/etc/nginx/sites-available"
    NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
    
    # Добавляем include в nginx.conf если его нет
    if ! grep -q "sites-enabled" /etc/nginx/nginx.conf 2>/dev/null; then
        # Добавляем перед последней закрывающей скобкой в http блоке
        sed -i '/http {/a\    include /etc/nginx/sites-enabled/*.conf;' /etc/nginx/nginx.conf 2>/dev/null || true
    fi
fi

echo "✅ Директория nginx: $NGINX_CONF_DIR"

# ===========================================
# 2. Создаём директорию для certbot
# ===========================================
mkdir -p /var/www/certbot
echo "✅ Создана директория /var/www/certbot"

# ===========================================
# 3. Создаём временный конфиг (только HTTP для получения сертификата)
# ===========================================
CONF_FILE="$NGINX_CONF_DIR/${DOMAIN}.conf"

echo "📝 Создаём временный nginx конфиг для получения SSL..."

cat > "$CONF_FILE" <<NGINXEOF
# Временный конфиг для получения SSL сертификата
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'SSL certificate pending...';
        add_header Content-Type text/plain;
    }
}
NGINXEOF

# Создаём симлинк если нужно
if [ -n "$NGINX_ENABLED_DIR" ]; then
    ln -sf "$CONF_FILE" "$NGINX_ENABLED_DIR/${DOMAIN}.conf"
fi

# Проверяем и перезагружаем nginx
nginx -t && systemctl reload nginx
echo "✅ Nginx перезагружен"

# ===========================================
# 4. Получаем SSL сертификат
# ===========================================
echo ""
echo "🔒 Получаем SSL сертификат от Let's Encrypt..."

# Проверяем, есть ли уже сертификат
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "ℹ️ SSL сертификат уже существует"
else
    # Устанавливаем certbot если нет
    if ! command -v certbot >/dev/null 2>&1; then
        echo "📦 Устанавливаем certbot..."
        apt-get update -qq
        apt-get install -y -qq certbot
    fi
    
    # Получаем сертификат
    certbot certonly --webroot \
        -w /var/www/certbot \
        -d "${DOMAIN}" \
        --non-interactive \
        --agree-tos \
        --email "admin@${DOMAIN}" \
        --no-eff-email \
        || {
            echo "⚠️ Не удалось получить сертификат автоматически."
            echo "   Попробуйте вручную: certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN}"
            echo "   Затем запустите этот скрипт снова."
        }
fi

# ===========================================
# 5. Создаём финальный конфиг с SSL
# ===========================================
echo ""
echo "📝 Создаём финальный nginx конфиг..."

cat > "$CONF_FILE" <<NGINXEOF
# Конфигурация для ${DOMAIN}
# Автоматически сгенерировано setup_domain.sh

# HTTP -> HTTPS редирект
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy к приложению
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
        proxy_connect_timeout 75s;
        proxy_buffering off;
    }

    # Статика Next.js - кеширование
    location /_next/static {
        proxy_pass http://127.0.0.1:3001;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    # Uploads
    location /uploads {
        alias ${PROJECT_DIR}/public/uploads;
        expires 30d;
        add_header Cache-Control "public";
    }
}
NGINXEOF

echo "✅ Конфиг создан: $CONF_FILE"

# ===========================================
# 6. Обновляем .env файл
# ===========================================
ENV_FILE="${PROJECT_DIR}/.env"
if [ -f "$ENV_FILE" ]; then
    echo ""
    echo "📝 Обновляем .env файл..."
    
    # Обновляем NEXTAUTH_URL
    if grep -q "^NEXTAUTH_URL=" "$ENV_FILE"; then
        sed -i "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=https://${DOMAIN}|" "$ENV_FILE"
    else
        echo "NEXTAUTH_URL=https://${DOMAIN}" >> "$ENV_FILE"
    fi
    
    echo "✅ NEXTAUTH_URL обновлён на https://${DOMAIN}"
fi

# ===========================================
# 7. Перезапускаем всё
# ===========================================
echo ""
echo "🔄 Перезагружаем nginx..."
nginx -t && systemctl reload nginx

echo ""
echo "🔄 Перезапускаем приложение..."
cd "$PROJECT_DIR"
docker compose restart app 2>/dev/null || true

# ===========================================
# Готово!
# ===========================================
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ ДОМЕН НАСТРОЕН!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🌐 Ваш сайт доступен по адресу:"
echo "   https://${DOMAIN}"
echo ""
echo "📋 Nginx конфиг: $CONF_FILE"
echo "📋 SSL сертификат: /etc/letsencrypt/live/${DOMAIN}/"
echo ""
echo "🔄 Автообновление SSL (добавьте в cron):"
echo "   0 0 1 * * certbot renew --quiet && systemctl reload nginx"
echo ""
echo "═══════════════════════════════════════════════════════════"
