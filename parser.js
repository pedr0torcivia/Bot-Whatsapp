const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBotMessage(text) {
  if (!text) return { command: 'ignore' };

  const raw = text.trim();
  if (!/@bot\b/i.test(raw)) return { command: 'ignore' };

  const cleanedRaw = raw.replace(/@bot\b/gi, '').trim();
  const cleaned = normalize(cleanedRaw);

  if (!cleaned) {
    return { command: 'help' };
  }

  if (/^ayuda$/i.test(cleaned)) return { command: 'help' };
  if (/^lista$/i.test(cleaned)) return { command: 'list' };

  const doneMatch = cleaned.match(/^hecho\s+(\d+)$/i);
  if (doneMatch) return { command: 'done', id: Number(doneMatch[1]) };

  const deleteMatch = cleaned.match(/^borrar\s+(\d+)$/i);
  if (deleteMatch) return { command: 'delete', id: Number(deleteMatch[1]) };

  const addRegex = /^(agrega|agregar)\s+(.+?)\s+con\s+fecha\s+(\d{2}\/\d{2}\/\d{2})\s+materia\s+(.+)$/i;
  const addMatch = cleaned.match(addRegex);

  if (addMatch) {
    const title = addMatch[2].trim();
    const dateInput = addMatch[3].trim();
    const subject = addMatch[4].trim();

    if (!title || !subject) {
      return { command: 'error', message: 'Comando incompleto. Revisá actividad y materia.' };
    }

    const date = dayjs(dateInput, 'DD/MM/YY', true);
    if (!date.isValid()) {
      return { command: 'error', message: 'Fecha inválida. Usá formato DD/MM/YY (ej: 07/05/26).' };
    }

    const lowerTitle = title.toLowerCase();
    const type = lowerTitle.startsWith('tarea') ? 'tarea' : lowerTitle.startsWith('parcial') ? 'parcial' : null;

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
    message: 'Comando no reconocido. Usá @Bot ayuda para ver ejemplos.'
  };
}

function formatActivityLine(activity, index = null) {
  const dateDisplay = dayjs(activity.due_date, 'YYYY-MM-DD').format('DD/MM/YYYY');
  const base = `${dateDisplay} - ${activity.subject} - ${activity.title}`;
  return index !== null ? `${index}. ${base}` : base;
}

function helpMessage() {
  return [
    '🤖 Comandos disponibles',
    '',
    '@Bot Agrega Tarea 1 con fecha 07/05/26 materia Materia1',
    '@Bot Agrega Parcial 1 con fecha 15/05/26 materia Materia1',
    '@Bot lista',
    '@Bot hecho ID',
    '@Bot borrar ID'
  ].join('\n');
}

module.exports = {
  parseBotMessage,
  formatActivityLine,
  helpMessage
};
