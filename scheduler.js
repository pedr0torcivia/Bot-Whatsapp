const cron = require('node-cron');
const dayjs = require('dayjs');
const {
  getAllGroups,
  getPendingBetween,
  getPendingDueInDays,
  markReminded2d
} = require('./db');
const { formatActivityLine } = require('./parser');

function setupSchedulers(client) {
  cron.schedule('0 9 * * 1', async () => {
    try {
      await sendWeeklySummary(client);
    } catch (err) {
      console.error('❌ Error en resumen semanal:', err.message);
    }
  });

  cron.schedule('0 9 * * *', async () => {
    try {
      await sendTwoDaysReminder(client);
    } catch (err) {
      console.error('❌ Error en recordatorio 2 días:', err.message);
    }
  });

  console.log('✅ Schedulers activos: lunes 09:00 y diario 09:00');
}

async function sendWeeklySummary(client) {
  const groups = await getAllGroups();
  const start = dayjs().startOf('day').format('YYYY-MM-DD');
  const end = dayjs().add(7, 'day').endOf('day').format('YYYY-MM-DD');

  for (const row of groups) {
    const groupId = row.group_id;
    const activities = await getPendingBetween(groupId, start, end);
    if (!activities.length) continue;

    const lines = activities.map((a, i) => formatActivityLine(a, i + 1));
    const message = `📌 Actividades de la semana\n\n${lines.join('\n')}`;

    await client.sendMessage(groupId, message);
  }
}

async function sendTwoDaysReminder(client) {
  const groups = await getAllGroups();
  const targetDate = dayjs().add(2, 'day').format('YYYY-MM-DD');

  for (const row of groups) {
    const groupId = row.group_id;
    const activities = await getPendingDueInDays(groupId, targetDate);
    if (!activities.length) continue;

    const lines = activities.map((a) => formatActivityLine(a));
    const message = `⚠️ Recordatorio\n\nFaltan 2 días para:\n${lines.join('\n')}`;

    await client.sendMessage(groupId, message);

    for (const activity of activities) {
      await markReminded2d(activity.id);
    }
  }
}

module.exports = {
  setupSchedulers
};
