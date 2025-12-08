#!/bin/bash
# Скрипт для проверки статуса приложения

echo "🔍 Проверка статуса контейнеров..."
docker compose ps

echo ""
echo "🔍 Проверка логов nginx..."
docker compose logs --tail=20 nginx

echo ""
echo "🔍 Проверка логов приложения..."
docker compose logs --tail=20 app

echo ""
echo "🔍 Проверка доступности портов..."
netstat -tlnp | grep -E ':(80|443|3000)' || ss -tlnp | grep -E ':(80|443|3000)'

echo ""
echo "🔍 Проверка подключения nginx -> app..."
docker compose exec nginx wget -qO- http://app:3000 | head -20 || echo "❌ Не удалось подключиться к app:3000"

echo ""
echo "🔍 Проверка локального подключения к nginx..."
curl -I http://localhost:80 2>&1 | head -5
curl -I http://localhost:443 2>&1 | head -5

echo ""
echo "🔍 Проверка конфигурации nginx..."
docker compose exec nginx nginx -t

echo ""
echo "✅ Диагностика завершена"
