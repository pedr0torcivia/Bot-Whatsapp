# Bot de WhatsApp para grupos (Node.js + whatsapp-web.js)

## Arquitectura breve

El proyecto está dividido en 4 módulos:

- **index.js**: punto de entrada, conexión con WhatsApp Web, recepción de mensajes de grupo y ejecución de comandos.
- **parser.js**: interpreta comandos que mencionen `@Bot`, valida formato y fechas (`DD/MM/YY`).
- **db.js**: capa de acceso a SQLite (`activities`) con funciones CRUD y consultas para recordatorios.
- **scheduler.js**: tareas programadas con `node-cron` para resumen semanal y recordatorios de vencimiento.

## Estructura del proyecto

```bash
.
├── index.js
├── db.js
├── parser.js
├── scheduler.js
├── package.json
└── README.md
```

## Instalación

1. Tener **Node.js 18+** instalado.
2. Instalar dependencias:

```bash
npm install
```

## Ejecución

```bash
npm start
```

- Al iniciar, se mostrará un QR en terminal.
- Escanealo con la cuenta de WhatsApp que actuará como bot.
- El bot solo responde en **grupos** y solo si el mensaje contiene `@Bot`.

## Comandos soportados

1. Agregar tarea:

```text
@Bot Agrega Tarea 1 con fecha 07/05/26 materia Materia1
```

2. Agregar parcial:

```text
@Bot Agrega Parcial 1 con fecha 15/05/26 materia Materia1
```

3. Listar pendientes:

```text
@Bot lista
```

4. Marcar como hecha:

```text
@Bot hecho 1
```

5. Borrar actividad:

```text
@Bot borrar 1
```

## Recordatorios automáticos

- **Resumen semanal**: lunes a las **09:00**, envía pendientes de los próximos 7 días.
- **Cierre en 2 días**: todos los días a las **09:00**, avisa actividades que vencen en 2 días y marca `reminded_2d = 1`.

## Notas

- `due_date` se guarda en formato ISO `YYYY-MM-DD`.
- El parser acepta `DD/MM/YY` y lo interpreta con año de 4 dígitos (ej. `07/05/26` → `2026-05-07`).
- Base SQLite local: `bot.db`.
