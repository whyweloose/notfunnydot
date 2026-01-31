const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const CHANNELS_FILE = path.join(__dirname, 'channels.json');
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';
const PORT = process.env.ADMIN_PORT || 3000;

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

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

function auth(req, res, next) {
  const pass = req.method === 'GET' ? req.query.pass : req.body.pass;
  if (pass !== ADMIN_PASS) {
    return res.status(401).send('<h3>Unauthorized</h3><p>Provide ?pass=YOUR_PASS or use the form.</p>');
  }
  next();
}

app.get('/', auth, (req, res) => {
  const channels = loadChannels();
  res.send(`
    <h2>Admin Panel</h2>
    <form method="POST" action="/add">
      <input name="pass" type="hidden" value="${ADMIN_PASS}" />
      <div>
        <label>Channel username or link (e.g. @mychannel or https://t.me/mychannel)</label><br/>
        <input name="id" style="width:400px" required />
      </div>
      <div>
        <label>Title (button text)</label><br/>
        <input name="title" style="width:400px" />
      </div>
      <div>
        <label>Content (link/text to give after confirmation)</label><br/>
        <input name="content" style="width:400px" />
      </div>
      <button type="submit">Add Channel</button>
    </form>
    <h3>Configured channels</h3>
    <ul>
      ${channels.map(ch => `<li>${ch.title || ch.id} — ${ch.link}</li>`).join('')}
    </ul>
    <p>Note: Bot needs to be able to call getChatMember for the channel (add bot to channel).</p>
  `);
});

app.post('/add', auth, (req, res) => {
  const idRaw = req.body.id && req.body.id.trim();
  if (!idRaw) return res.status(400).send('id required');

  let username = idRaw;
  if (username.startsWith('https://t.me/')) {
    username = username.replace('https://t.me/', '');
  }
  if (!username.startsWith('@')) username = '@' + username;

  const title = req.body.title || 'Подписаться';
  const content = req.body.content || '';

  const channels = loadChannels();
  channels.push({ id: username, link: `https://t.me/${username.replace('@','')}`, title, content });
  saveChannels(channels);

  res.send('<p>Added. <a href="/?pass=' + ADMIN_PASS + '">Back</a></p>');
});

app.listen(PORT, () => console.log(`Admin panel listening on http://localhost:${PORT}/?pass=YOUR_PASS`));
