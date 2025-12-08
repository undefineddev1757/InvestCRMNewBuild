# CRMInvestBuild — быстрый запуск

## Что требуется
- Docker Desktop (включает docker compose v2)
- Открытые порты 3000 (приложение) и 5434 (Postgres из compose)
- Bash (по умолчанию есть в macOS/Linux)

## Установка одной командой
```bash
chmod +x install_all.sh
./install_all.sh
```
Скрипт:
- проверит Docker,
- создаст `.env`, если его нет (заполните `NEXTAUTH_SECRET` и `JWT_SECRET` сами),
- поднимет Postgres (порт 5434),
- прогонит миграции Prisma,
- соберёт и запустит сервисы.

## Ручной запуск (альтернатива)
1) Подготовьте `.env` (пример создаст скрипт, ключевые поля: `POSTGRES_PASSWORD`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET`).  
2) Подтяните образы и поднимите БД:
```bash
docker compose pull
docker compose up -d postgres
```
3) Примените миграции:
```bash
docker compose run --rm app npx prisma migrate deploy
```
4) Запустите все сервисы:
```bash
docker compose up -d --build
```
5) Откройте http://localhost:3000

## Полезно знать
- Postgres проброшен наружу на `localhost:5434`.  
- Приложение внутри Docker обращается к БД через хост `postgres`.  
- Создать администратора:  
```bash
docker compose run --rm app node scripts/create-admin-docker.js
```
- Логи: `docker compose logs -f`

## Остановка/очистка
```bash
docker compose down          # остановить
docker compose down -v       # остановить и удалить volume с БД
```

