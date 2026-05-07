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

async function bootstrap() {
  await initDb();

  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
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

      if (parsed.command === 'help') {
        await message.reply(helpMessage());
        return;
      }

      if (parsed.command === 'error') {
        await message.reply(`❌ ${parsed.message}`);
        return;
      }

      if (parsed.command === 'add') {
        const id = await addActivity({
          groupId,
          type: parsed.payload.type,
          title: parsed.payload.title,
          subject: parsed.payload.subject,
          dueDate: parsed.payload.dueDateISO
        });

        await message.reply(
          [
            '✅ Actividad agendada',
            `ID: ${id}`,
            `Fecha: ${parsed.payload.dueDateDisplay}`,
            `Materia: ${parsed.payload.subject}`,
            `Actividad: ${parsed.payload.title}`
          ].join('\n')
        );
        return;
      }

      if (parsed.command === 'list') {
        const rows = await listPendingByGroup(groupId);
        if (!rows.length) {
          await message.reply('📌 No hay actividades pendientes.');
          return;
        }

        const lines = rows.map((row, i) => formatActivityLine(row, i + 1));
        await message.reply(`📌 Actividades pendientes\n\n${lines.join('\n')}`);
        return;
      }

      if (parsed.command === 'done') {
        const result = await markDone(groupId, parsed.id);
        if (!result.changes) {
          await message.reply('❌ No se encontró una actividad pendiente con ese ID.');
          return;
        }

        await message.reply(`✅ Actividad ${parsed.id} marcada como hecha.`);
        return;
      }

      if (parsed.command === 'delete') {
        const result = await deleteActivity(groupId, parsed.id);
        if (!result.changes) {
          await message.reply('❌ No existe una actividad con ese ID en este grupo.');
          return;
        }

        await message.reply(`🗑️ Actividad ${parsed.id} eliminada.`);
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
