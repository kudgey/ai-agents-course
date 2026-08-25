#!/bin/bash
# Подвійний клік — сайт курсу відкриється у браузері.
# Інтернет не потрібен: сервер локальний, усі схеми й шрифти лежать поруч.
# Щоб зупинити — закрийте це вікно Терміналу або натисніть Ctrl+C.

cd "$(dirname "$0")" || exit 1
export npm_config_cache="$HOME/.npm-cache-course"
PORT=4173

echo "Курс «Прикладні ШІ-агенти»"
echo "Піднімаю локальний сервер…"

if [ ! -d node_modules ]; then
  echo "Перший запуск: встановлюю залежності (одноразово, кілька хвилин)…"
  npm install --silent || { echo "Не вдалося встановити залежності"; read -r; exit 1; }
fi

if [ ! -d .vitepress/dist ]; then
  echo "Збираю сайт (одноразово)…"
  npm run build --silent || { echo "Не вдалося зібрати"; read -r; exit 1; }
fi

npx vitepress preview . --port "$PORT" &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT

for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://localhost:$PORT/"; then break; fi
  sleep 0.4
done

echo "Готово: http://localhost:$PORT"
open "http://localhost:$PORT/"
echo
echo "Вікно можна згорнути. Закриття вікна зупиняє сервер."
wait $SERVER
