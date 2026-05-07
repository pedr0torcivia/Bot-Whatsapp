const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

function parseBotMessage(text) {
  if (!text) return { command: 'ignore' };

  const raw = text.trim();
  if (!raw.toLowerCase().includes('@bot')) return { command: 'ignore' };

  const cleaned = raw.replace(/@bot/gi, '').trim();

  if (/^lista\b/i.test(cleaned)) {
    return { command: 'list' };
  }

  const doneMatch = cleaned.match(/^hecho\s+(\d+)$/i);
  if (doneMatch) {
    return { command: 'done', id: Number(doneMatch[1]) };
  }

  const deleteMatch = cleaned.match(/^borrar\s+(\d+)$/i);
  if (deleteMatch) {
    return { command: 'delete', id: Number(deleteMatch[1]) };
  }

  const addRegex = /^agrega\s+(.+?)\s+con\s+fecha\s+(\d{2}\/\d{2}\/\d{2})\s+materia\s+(.+)$/i;
  const addMatch = cleaned.match(addRegex);

  if (addMatch) {
    const title = addMatch[1].trim();
    const dateInput = addMatch[2].trim();
    const subject = addMatch[3].trim();

    const date = dayjs(dateInput, 'DD/MM/YY', true);
    if (!date.isValid()) {
      return { command: 'error', message: 'Fecha inválida. Usá formato DD/MM/YY (ej: 07/05/26).' };
    }

    const lowerTitle = title.toLowerCase();
    let type = null;

    if (lowerTitle.startsWith('tarea')) type = 'tarea';
    if (lowerTitle.startsWith('parcial')) type = 'parcial';

    if (!type) {
      return { command: 'error', message: 'Tipo inválido. La actividad debe empezar con "Tarea" o "Parcial".' };
    }

    return {
      command: 'add',
      payload: {
        type,
        title,
        subject,
        dueDateISO: date.format('YYYY-MM-DD'),
        dueDateDisplay: date.format('DD/MM/YYYY')
      }
    };
  }

  return {
    command: 'error',
    message: 'Comando no reconocido. Probá con: @Bot agrega..., @Bot lista, @Bot hecho ID, @Bot borrar ID.'
  };
}

function formatActivityLine(activity, index = null) {
  const dateDisplay = dayjs(activity.due_date, 'YYYY-MM-DD').format('DD/MM/YYYY');
  const base = `${dateDisplay} - ${activity.subject} - ${activity.title}`;
  return index !== null ? `${index}. ${base}` : base;
}

module.exports = {
  parseBotMessage,
  formatActivityLine
};
