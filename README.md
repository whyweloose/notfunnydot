# Telegram Subscribe Bot (Node.js)

Простой бот, который просит подписаться на канал и выдаёт ссылку после подтверждения.

- `index.js` — основной бот на `telegraf`.
- Админ-панель встроена в бота: используйте команды ` /admin`, `/addchannel`, `/listchannels`, `/removechannel`.
- `channels.json` — список каналов.

Требования

- Установите `BOT_TOKEN` (токен бота).
- Установите `ADMIN_PASS` (пароль для админ-панели).
- Бот должен иметь возможность вызывать `getChatMember` для проверяемого канала (обычно бот должен быть добавлен в канал).

Установка

```bash
npm install
```

# Запуск

```bash
# Запустить бота
set BOT_TOKEN=your_bot_token
set ADMIN_PASS=your_admin_pass
npm run start

# Админские команды в боте
# Авторизуйтесь в боте: /admin YOUR_PASS
# Добавить канал: /addchannel link|title|content
# Пример: /addchannel https://t.me/mychannel|Подписаться|https://t.me/your_video_link_here
# Посмотреть каналы: /listchannels
# Удалить канал: /removechannel 1
```

Админ-панель

Откройте: `http://localhost:3000/?pass=your_admin_pass` и добавьте каналы. В `channels.json` сохраняется список каналов.

Примечание

Для корректной проверки подписки бот должен иметь возможность вызывать `getChatMember` для канала. Обычно это возможно, если бот добавлен в канал (лучше с ролью администратора).
