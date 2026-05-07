const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const {
  initDb,
  addActivity,
  listPendingByGroup,
  markDone,
  deleteActivity
} = require('./db');
const { parseBotMessage, formatActivityLine, helpMessage } = require('./parser');
const { setupSchedulers } = require('./scheduler');

function cleanEnvPath(value) {
  if (!value) return null;
  return value.trim().replace(/^"|"$/g, '');
}

function existingPath(candidate) {
  if (!candidate) return null;
  const normalized = path.normalize(candidate);
  return fs.existsSync(normalized) ? normalized : null;
}

function resolveChromePath() {
  const fromChromePath = existingPath(cleanEnvPath(process.env.CHROME_PATH));
  if (fromChromePath) return fromChromePath;

  const fromPuppeteerPath = existingPath(cleanEnvPath(process.env.PUPPETEER_EXECUTABLE_PATH));
  if (fromPuppeteerPath) return fromPuppeteerPath;

  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

  const candidates = [
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];

  for (const candidate of candidates) {
    const found = existingPath(candidate);
    if (found) return found;
  }

  return null;
}

async function bootstrap() {
  await initDb();

  const chromePath = resolveChromePath();
  if (!chromePath) {
    console.error('❌ No se encontró un navegador Chromium/Chrome/Edge ejecutable.');
    console.error('   1) Instalá Google Chrome o Microsoft Edge');
    console.error('   2) Definí CHROME_PATH o PUPPETEER_EXECUTABLE_PATH con la ruta exacta del .exe');
    console.error('   Ejemplo: set CHROME_PATH=C:\\Users\\TU_USUARIO\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe');
    process.exit(1);
  }

  console.log(`✅ Navegador detectado: ${chromePath}`);

  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    console.log('📲 Escaneá este QR para iniciar sesión:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('🤖 Bot conectado y listo.');
    setupSchedulers(client);
  });

  client.on('message', async (message) => {
    try {
      const chat = await message.getChat();
      if (!chat.isGroup) return;

      const parsed = parseBotMessage(message.body);
      if (parsed.command === 'ignore') return;

      const groupId = message.from;

      if (parsed.command === 'help') return message.reply(helpMessage());
      if (parsed.command === 'error') return message.reply(`❌ ${parsed.message}`);

      if (parsed.command === 'add') {
        const id = await addActivity({
          groupId,
          type: parsed.payload.type,
          title: parsed.payload.title,
          subject: parsed.payload.subject,
          dueDate: parsed.payload.dueDateISO
        });

        return message.reply([
          '✅ Actividad agendada',
          `ID: ${id}`,
          `Fecha: ${parsed.payload.dueDateDisplay}`,
          `Materia: ${parsed.payload.subject}`,
          `Actividad: ${parsed.payload.title}`
        ].join('\n'));
      }

      if (parsed.command === 'list') {
        const rows = await listPendingByGroup(groupId);
        if (!rows.length) return message.reply('📌 No hay actividades pendientes.');

        const lines = rows.map((row, i) => formatActivityLine(row, i + 1));
        return message.reply(`📌 Actividades pendientes\n\n${lines.join('\n')}`);
      }

      if (parsed.command === 'done') {
        const result = await markDone(groupId, parsed.id);
        if (!result.changes) return message.reply('❌ No se encontró una actividad pendiente con ese ID.');
        return message.reply(`✅ Actividad ${parsed.id} marcada como hecha.`);
      }

      if (parsed.command === 'delete') {
        const result = await deleteActivity(groupId, parsed.id);
        if (!result.changes) return message.reply('❌ No existe una actividad con ese ID en este grupo.');
        return message.reply(`🗑️ Actividad ${parsed.id} eliminada.`);
      }
    } catch (err) {
      console.error('❌ Error procesando mensaje:', err);
      await message.reply('❌ Ocurrió un error procesando el comando.');
    }
  });

  client.initialize();
}

bootstrap().catch((err) => {
  console.error('❌ Error al iniciar el bot:', err);
  process.exit(1);
});
