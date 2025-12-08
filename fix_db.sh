#!/bin/bash
# Скрипт для исправления проблемы с базой данных

set -e

cd "$(dirname "$0")" || exit 1

echo "🔧 Исправление проблемы с базой данных..."

# Проверяем наличие .env
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "Создайте его с помощью: ./create_env.sh"
    exit 1
fi

# Читаем пароль из .env
POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" .env | cut -d'=' -f2)

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ POSTGRES_PASSWORD не найден в .env файле!"
    exit 1
fi

echo "📝 Пароль из .env: ${POSTGRES_PASSWORD:0:10}..."

# Останавливаем контейнеры
echo "🛑 Останавливаем контейнеры..."
docker compose down

# Проверяем, существует ли volume с базой данных
if docker volume ls | grep -q "crm_postgres_data"; then
    echo "⚠️ Найдена существующая база данных."
    read -r -p "Пересоздать базу данных? (y/N): " RECREATE
    if [[ "$RECREATE" =~ ^[Yy]$ ]]; then
        echo "🗑️ Удаляем старую базу данных..."
        docker compose down -v
        echo "✅ База данных удалена"
    else
        echo "ℹ️ Обновляем пароль в существующей базе данных..."
        # Запускаем postgres временно
        docker compose up -d postgres
        
        # Ждем готовности
        echo "⏳ Ждём готовность PostgreSQL..."
        for _ in {1..30}; do
            if docker compose exec postgres pg_isready -U investcrm_user -d investcrm >/dev/null 2>&1; then
                echo "✅ Postgres готов"
                break
            fi
            sleep 2
        done
        
        # Обновляем пароль
        echo "🔐 Обновляем пароль пользователя..."
        docker compose exec postgres psql -U postgres -c "ALTER USER investcrm_user WITH PASSWORD '${POSTGRES_PASSWORD}';" || {
            echo "⚠️ Не удалось обновить пароль. Пересоздаём базу данных..."
            docker compose down -v
            RECREATE="y"
        }
    fi
fi

# Если база данных была удалена или не существует, создаем новую
if [ ! "$(docker volume ls | grep crm_postgres_data)" ] || [[ "${RECREATE:-}" =~ ^[Yy]$ ]]; then
    echo "🆕 Создаём новую базу данных..."
    docker compose up -d postgres
    
    echo "⏳ Ждём готовность PostgreSQL..."
    for _ in {1..30}; do
        if docker compose exec postgres pg_isready -U investcrm_user -d investcrm >/dev/null 2>&1; then
            echo "✅ Postgres готов"
            break
        fi
        sleep 2
    done
fi

# Применяем миграции
echo "🔄 Применяем миграции Prisma..."
docker compose build app
docker compose run --rm --env-file .env app ./node_modules/.bin/prisma migrate deploy

# Запускаем все сервисы
echo "🚀 Запускаем все сервисы..."
docker compose up -d

echo ""
echo "✅ Готово! Проверяем статус..."
sleep 5
docker compose ps

echo ""
echo "📊 Логи приложения (последние 20 строк):"
docker compose logs --tail=20 app
