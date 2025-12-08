#!/bin/bash
# Скрипт для проверки статуса приложения и диагностики ошибки 502

echo "═══════════════════════════════════════════════════════════"
echo "🔍 ДИАГНОСТИКА ПРИЛОЖЕНИЯ (502 Error)"
echo "═══════════════════════════════════════════════════════════"

echo ""
echo "1️⃣ Проверка статуса контейнеров..."
docker compose ps

echo ""
echo "2️⃣ Проверка доступности портов на сервере..."
if command -v ss >/dev/null 2>&1; then
    ss -tlnp | grep -E ':(80|443|3000)' || echo "❌ Порты 80, 443 или 3000 не слушаются!"
else
    netstat -tlnp | grep -E ':(80|443|3000)' || echo "❌ Порты 80, 443 или 3000 не слушаются!"
fi

echo ""
echo "3️⃣ Проверка подключения nginx -> app (внутри Docker сети)..."
if docker compose ps | grep -q "investcrm_nginx.*Up"; then
    docker compose exec nginx wget -qO- --timeout=5 http://app:3000 2>&1 | head -5 || echo "❌ Nginx не может подключиться к app:3000"
else
    echo "❌ Контейнер nginx не запущен!"
fi

echo ""
echo "4️⃣ Проверка локального подключения к приложению..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000 || echo "❌ Приложение не отвечает на порту 3000"

echo ""
echo "5️⃣ Проверка локального подключения к nginx (порт 80)..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:80 || echo "❌ Nginx не отвечает на порту 80"

echo ""
echo "6️⃣ Проверка конфигурации nginx..."
if docker compose ps | grep -q "investcrm_nginx.*Up"; then
    docker compose exec nginx nginx -t 2>&1
else
    echo "❌ Nginx не запущен, проверка невозможна"
fi

echo ""
echo "7️⃣ Последние ошибки nginx..."
docker compose logs --tail=10 nginx 2>&1 | grep -i error || echo "Нет ошибок в логах nginx"

echo ""
echo "8️⃣ Последние ошибки приложения..."
docker compose logs --tail=10 app 2>&1 | grep -i error || echo "Нет ошибок в логах app"

echo ""
echo "9️⃣ Проверка firewall (если установлен)..."
if command -v ufw >/dev/null 2>&1; then
    echo "UFW статус:"
    sudo ufw status | head -5
elif command -v firewall-cmd >/dev/null 2>&1; then
    echo "Firewalld открытые порты:"
    sudo firewall-cmd --list-ports 2>/dev/null || echo "Firewalld не настроен"
else
    echo "Firewall не найден или не используется"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📋 РЕКОМЕНДАЦИИ:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Если контейнеры не запущены:"
echo "  docker compose up -d"
echo ""
echo "Если порты не открыты в firewall:"
echo "  sudo ufw allow 80/tcp"
echo "  sudo ufw allow 443/tcp"
echo ""
echo "Если nginx не может подключиться к app:"
echo "  docker compose restart app nginx"
echo ""
echo "Проверка логов в реальном времени:"
echo "  docker compose logs -f"
echo ""
echo "═══════════════════════════════════════════════════════════"
