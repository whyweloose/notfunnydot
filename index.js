const fs = require('fs');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = '7826581383:AAEhwu2xliX2jOgz3Hzual2uhH8fWWBxprU';
if (!BOT_TOKEN) {
  console.error('Please set BOT_TOKEN environment variable');
  process.exit(1);
}

const ADMIN_PASS = 'whyweloose';
const DATA_DIR = path.join(__dirname, 'data');
const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const SCENARIOS_FILE = path.join(DATA_DIR, 'scenarios.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PENDING_FILE = path.join(DATA_DIR, 'pendingBroadcasts.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function loadChannels() {
  try {
    return JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8')) || [];
  } catch (e) {
    return [];
  }
}

function saveChannels(list) {
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function loadAdmins() {
  try {
    return JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8')) || [];
  } catch (e) {
    return [];
  }
}

function saveAdmins(list) {
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function addAdmin(userId) {
  const admins = loadAdmins();
  if (!admins.includes(userId)) {
    admins.push(userId);
    saveAdmins(admins);
  }
}

function isAdmin(userId) {
  const admins = loadAdmins();
  return admins.includes(userId);
}

function loadScenarios() {
  try {
    return JSON.parse(fs.readFileSync(SCENARIOS_FILE, 'utf8')) || [];
  } catch (e) {
    return [];
  }
}

function saveScenarios(list) {
  fs.writeFileSync(SCENARIOS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) || {};
  } catch (e) {
    return {};
  }
}

function saveUsers(map) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(map, null, 2), 'utf8');
}

function loadPending() {
  try {
    return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8')) || {};
  } catch (e) {
    return {};
  }
}

function savePending(obj) {
  fs.writeFileSync(PENDING_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) || {};
  } catch (e) {
    return {};
  }
}

function saveSettings(obj) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  const user = ctx.from;
  const name = user.first_name || user.username || 'друг';

  const users = loadUsers();
  users[user.id] = users[user.id] || { id: user.id, username: user.username || null, selectedScenario: null };
  saveUsers(users);

  const settings = loadSettings();
  const userSelected = users[user.id].selectedScenario;
  const activeScenario = userSelected || settings.activeScenario || null;

  let channels = [];
  if (activeScenario) {
    const scenarios = loadScenarios();
    const sc = scenarios.find(s => s.name === activeScenario);
    if (sc) channels = sc.channels || [];
  }

  if (!channels.length) {
    const text = `👋 Приветствую, ${name}\n📺 Каналы для выбранного сценария не настроены. Обратитесь к администратору.`;
    return ctx.reply(text);
  }

  const text = `👋 Приветствую, ${name}\n📺 Чтобы посмотреть полное видео тебе нужно подписаться на наш телеграм канал`;

  const buttons = channels.map(ch => [Markup.button.url(ch.title || 'Подписаться', ch.link)]);
  buttons.push([Markup.button.callback('✅ Подтвердить', 'confirm')]);

  await ctx.reply(text, Markup.inlineKeyboard(buttons));
});

bot.command('admin', (ctx) => {
  const parts = ctx.message.text.split(' ').filter(Boolean);
  const pass = parts[1];
  if (pass && pass === ADMIN_PASS) {
    addAdmin(ctx.from.id);
    return ctx.reply('Авторизация успешна. Вы теперь админ бота. Доступны команды: /createscenario, /listscenarios, /removescenario, /setscenario, /addchannel, /listchannels, /removechannel, /broadcast');
  }
  return ctx.reply('Неправильный пароль. Используйте: /admin YOUR_PASS');
});

bot.command('addchannel', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Только админы могут добавлять каналы. Авторизуйтесь через /admin');
  const args = ctx.message.text.slice('/addchannel'.length).trim();
  if (!args) return ctx.reply('Использование: /addchannel SCENARIO link|title|content');
  const firstSpace = args.indexOf(' ');
  if (firstSpace === -1) return ctx.reply('Использование: /addchannel SCENARIO link|title|content');
  const scenarioName = args.slice(0, firstSpace).trim();
  const rest = args.slice(firstSpace + 1).trim();
  const parts = rest.split('|').map(s => s.trim());
  const linkRaw = parts[0];
  let username = linkRaw;
  if (username.startsWith('https://t.me/')) username = username.replace('https://t.me/', '');
  if (username.startsWith('http://t.me/')) username = username.replace('http://t.me/', '');
  if (!username.startsWith('@')) username = '@' + username;
  const title = parts[1] || 'Подписаться';
  const content = parts[2] || '';

  const scenarios = loadScenarios();
  let sc = scenarios.find(s => s.name === scenarioName);
  if (!sc) {
    sc = { name: scenarioName, channels: [] };
    scenarios.push(sc);
  }
  sc.channels.push({ id: username, link: `https://t.me/${username.replace('@','')}`, title, content });
  saveScenarios(scenarios);
  return ctx.reply(`Канал добавлен в сценарий ${scenarioName}: ${title} — ${username}`);
});

bot.command('listchannels', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Только админы. Авторизуйтесь через /admin');
  const args = ctx.message.text.slice('/listchannels'.length).trim();
  const scenarioName = args || null;
  if (!scenarioName) return ctx.reply('Использование: /listchannels SCENARIO');
  const scenarios = loadScenarios();
  const sc = scenarios.find(s => s.name === scenarioName);
  if (!sc || !sc.channels.length) return ctx.reply('Каналы для этого сценария не найдены.');
  const list = sc.channels.map((c, i) => `${i + 1}. ${c.title} — ${c.link}`).join('\n');
  return ctx.reply(`Каналы сценария ${scenarioName}:\n${list}`);
});

bot.command('removechannel', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Только админы. Авторизуйтесь через /admin');
  const args = ctx.message.text.slice('/removechannel'.length).trim();
  const firstSpace = args.indexOf(' ');
  if (firstSpace === -1) return ctx.reply('Использование: /removechannel SCENARIO INDEX');
  const scenarioName = args.slice(0, firstSpace).trim();
  const idx = parseInt(args.slice(firstSpace + 1).trim(), 10);
  if (!idx) return ctx.reply('Использование: /removechannel SCENARIO INDEX');
  const scenarios = loadScenarios();
  const sc = scenarios.find(s => s.name === scenarioName);
  if (!sc) return ctx.reply('Сценарий не найден');
  if (idx < 1 || idx > sc.channels.length) return ctx.reply('Неверный индекс');
  const removed = sc.channels.splice(idx - 1, 1)[0];
  saveScenarios(scenarios);
  return ctx.reply(`Удалён канал из ${scenarioName}: ${removed.title || removed.id}`);
});

bot.action('confirm', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  const users = loadUsers();
  const settings = loadSettings();
  const userSelected = users[userId] && users[userId].selectedScenario;
  const activeScenario = userSelected || settings.activeScenario || null;

  let channels = [];
  if (activeScenario) {
    const scenarios = loadScenarios();
    const sc = scenarios.find(s => s.name === activeScenario);
    if (sc) channels = sc.channels || [];
  }

  if (!channels.length) {
    return ctx.reply('📺 Каналы для выбранного сценария не настроены. Пожалуйста, обратитесь к администратору.');
  }

  let subscribedTo = null;
  let failedChannels = [];

  for (const ch of channels) {
    const chatId = ch.id;
    try {
      const member = await ctx.telegram.getChatMember(chatId, userId);
      const status = (member && member.status) || '';
      if (['creator', 'administrator', 'member'].includes(status)) {
        subscribedTo = ch;
        break;
      }
    } catch (err) {
      failedChannels.push(ch);
    }
  }

  if (subscribedTo) {
    return ctx.reply(`✅ Спасибо! Ссылка на полное видео: ${subscribedTo.content || 'https://t.me/treshaksvideos'}`);
  }

  const buttons = failedChannels.map(ch => [Markup.button.url(`❌ ${ch.id}`, ch.link)]);
  let reply = '❌ Не удалось подтвердить подписку на эти каналы:\n\n📝 Убедитесь, что вы подписались на все каналы выше.';

  return ctx.reply(reply, Markup.inlineKeyboard(buttons));
});

bot.command('createscenario', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Только админы. Авторизуйтесь через /admin');
  const name = ctx.message.text.slice('/createscenario'.length).trim();
  if (!name) return ctx.reply('Использование: /createscenario NAME');
  const scenarios = loadScenarios();
  if (scenarios.find(s => s.name === name)) return ctx.reply('Сценарий с таким именем уже существует');
  scenarios.push({ name, channels: [] });
  saveScenarios(scenarios);
  return ctx.reply(`Сценарий '${name}' создан`);
});

bot.command('listscenarios', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Только админы. Авторизуйтесь через /admin');
  const scenarios = loadScenarios();
  if (!scenarios.length) return ctx.reply('Нет сценариев');
  return ctx.reply(scenarios.map(s => `- ${s.name}`).join('\n'));
});

bot.command('removescenario', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Только админы. Авторизуйтесь через /admin');
  const name = ctx.message.text.slice('/removescenario'.length).trim();
  if (!name) return ctx.reply('Использование: /removescenario NAME');
  let scenarios = loadScenarios();
  const idx = scenarios.findIndex(s => s.name === name);
  if (idx === -1) return ctx.reply('Сценарий не найден');
  scenarios.splice(idx, 1);
  saveScenarios(scenarios);
  return ctx.reply(`Сценарий '${name}' удалён`);
});

bot.command('setscenario', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Только админы. Авторизуйтесь через /admin');
  const name = ctx.message.text.slice('/setscenario'.length).trim();
  if (!name) return ctx.reply('Использование: /setscenario NAME');
  const scenarios = loadScenarios();
  if (!scenarios.find(s => s.name === name)) return ctx.reply('Сценарий не найден');
  const settings = loadSettings();
  settings.activeScenario = name;
  saveSettings(settings);
  return ctx.reply(`Глобальный сценарий установлен: ${name}`);
});

bot.command('scenario', (ctx) => {
  const name = ctx.message.text.slice('/scenario'.length).trim();
  if (!name) return ctx.reply('Использование: /scenario NAME');
  const scenarios = loadScenarios();
  if (!scenarios.find(s => s.name === name)) return ctx.reply('❌ Сценарий не найден');
  const users = loadUsers();
  users[ctx.from.id] = users[ctx.from.id] || { id: ctx.from.id };
  users[ctx.from.id].selectedScenario = name;
  saveUsers(users);
  return ctx.reply(`✅ Вы выбрали сценарий: ${name}`);
});

bot.command('myscenario', (ctx) => {
  const users = loadUsers();
  const u = users[ctx.from.id];
  if (!u || !u.selectedScenario) return ctx.reply('❌ У вас не выбран сценарий');
  return ctx.reply(`📋 Ваш сценарий: ${u.selectedScenario}`);
});

bot.command('broadcast', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Только админы. Авторизуйтесь через /admin');
  const pending = loadPending();
  pending[ctx.from.id] = { state: 'waiting_message' };
  savePending(pending);
  return ctx.reply('📨 Режим рассылки: отправьте сообщение или медиа (фото/видео) которое нужно разослать, затем отправьте /sendbroadcast');
});

bot.on(['message', 'photo', 'video'], async (ctx, next) => {
  const pending = loadPending();
  const p = pending[ctx.from.id];
  if (!p || p.state !== 'waiting_message') return next();

  const msg = ctx.message;
  const saveObj = { type: 'text', text: null, file_id: null, caption: null };
  if (msg.text && !msg.entities) {
    saveObj.type = 'text';
    saveObj.text = msg.text;
  } else if (msg.photo) {
    saveObj.type = 'photo';
    saveObj.file_id = msg.photo[msg.photo.length - 1].file_id;
    saveObj.caption = msg.caption || '';
  } else if (msg.video) {
    saveObj.type = 'video';
    saveObj.file_id = msg.video.file_id;
    saveObj.caption = msg.caption || '';
  } else if (msg.text) {
    saveObj.type = 'text';
    saveObj.text = msg.text;
  }

  pending[ctx.from.id] = { state: 'ready', content: saveObj };
  savePending(pending);
  return ctx.reply('✅ Сообщение сохранено для рассылки. Отправьте /sendbroadcast чтобы разослать или /cancelbroadcast чтобы отменить.');
});

bot.command('sendbroadcast', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Только админы. Авторизуйтесь через /admin');
  const pending = loadPending();
  const p = pending[ctx.from.id];
  if (!p || p.state !== 'ready') return ctx.reply('Нет подготовленного сообщения. Сначала отправьте /broadcast и затем сам контент.');
  const content = p.content;
  const usersMap = loadUsers();
  const userIds = Object.keys(usersMap).map(id => parseInt(id, 10));
  let sent = 0;
  let failed = 0;
  for (const uid of userIds) {
    try {
      if (content.type === 'text') {
        await ctx.telegram.sendMessage(uid, content.text || '');
      } else if (content.type === 'photo') {
        await ctx.telegram.sendPhoto(uid, content.file_id, { caption: content.caption || '' });
      } else if (content.type === 'video') {
        await ctx.telegram.sendVideo(uid, content.file_id, { caption: content.caption || '' });
      }
      sent++;
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      failed++;
    }
  }
  delete pending[ctx.from.id];
  savePending(pending);
  return ctx.reply(`📤 Рассылка завершена.\n✅ Отправлено: ${sent}\n❌ Не удалось: ${failed}`);
});

bot.command('cancelbroadcast', (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('Только админы. Авторизуйтесь через /admin');
  const pending = loadPending();
  delete pending[ctx.from.id];
  savePending(pending);
  return ctx.reply('❌ Режим рассылки отменён.');
});

function migrateGlobalChannelsToDefaultScenario() {
  const globalChannels = loadChannels();
  if (!globalChannels || !globalChannels.length) return;
  const scenarios = loadScenarios();
  const defaultName = 'default';
  if (scenarios.find(s => s.name === defaultName)) return;
  scenarios.push({ name: defaultName, channels: globalChannels });
  saveScenarios(scenarios);
  saveChannels([]);
  console.log('Migrated global channels.json into scenario "default"');
}

migrateGlobalChannelsToDefaultScenario();

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('Bot started');
