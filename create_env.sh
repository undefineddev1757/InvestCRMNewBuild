#!/bin/bash
# Скрипт для создания .env файла

ENV_FILE=".env"

if [ -f "$ENV_FILE" ] && [ -s "$ENV_FILE" ]; then
    echo "ℹ️ .env файл уже существует и не пустой."
    read -r -p "Перезаписать? (y/N): " OVERWRITE
    if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
        echo "Отменено."
        exit 0
    fi
fi

echo "📝 Создаём .env файл..."

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
echo "📍 Файл находится в: $(pwd)/$ENV_FILE"
echo ""
echo "💡 Теперь вы можете отредактировать его и добавить свои значения:"
echo "   - WALLET_API_KEY"
echo "   - POLYGON_API_KEY"
