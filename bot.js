require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const regions = require("./regions");
const websites = require("./websites");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./users.db");

let userMap = {};

// =====================
// Проверка админа
// =====================
function isAdmin(ctx) {
    return ctx.from?.id === ADMIN_ID;
}

// =====================
// Безопасная отправка сообщений
// =====================
async function safeSend(fn) {
    try {
        await fn();
    } catch (e) {
        const code = e?.response?.error_code;
        if (code === 403) {
            console.log("🚫 Пользователь заблокировал бота");
        } else {
            console.error("❌ Ошибка Telegram:", e);
        }
    }
}

// =====================
// Поиск города/области
// =====================
function findLocationLink(text) {
    if (!text) return null;
    const normalized = text.trim().toLowerCase();
    for (const key of Object.keys(websites)) {
        if (key.toLowerCase() === normalized) {
            return { name: key, url: websites[key] };
        }
    }
    return null;
}

// =====================
// /start
// =====================
bot.start(async (ctx) => {
    if (isAdmin(ctx)) {
        await safeSend(() =>
            ctx.reply(
                "Админ-панель\n\n" +
                "/place_admin — вибрати місто\n" +
                "/send — розіслати повідомлення\n" +
                "/stats — статистика\n" +
                "/users — список пользователей"
            )
        );
    } else {
        await safeSend(() =>
            ctx.reply(
                "Вітаємо!\n\n" +
                "Цей бот допоможе вам швидко дізнатися графік відключень електроенергії.\n\n" +
                "*Доступні команди:*\n" +
                "/start – запустити бота\n" +
                "/help - тех підтримка\n" +
                "/place - вибрати місто\n" +
                "/website - офіційний сайт\n" +
                "/dev - Розробники бота\n",
                { parse_mode: "Markdown" }
            )
        );
    }
});

// =====================
// Admin команды
// =====================
bot.command("send", (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("❌ У вас нет доступа.");
    ctx.reply("Введите сообщение для рассылки всем пользователям...");
});

bot.command("users", (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("❌ Команда только для администратора.");
    const ids = Object.keys(userMap);
    ctx.reply(`👥 Всего пользователей: ${ids.length}\nIDs: ${ids.join(", ")}`);
});

bot.command("stats", (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("❌ Недоступно.");
    ctx.reply("📊 Статистика...");
});

bot.command("place_admin", (ctx) => {
    if (!isAdmin(ctx)) return;
    const buttons = Object.keys(regions).map(r => [Markup.button.callback(r, `region_${r}`)]);
    ctx.reply("Виберіть область:", Markup.inlineKeyboard(buttons));
});

// =====================
// /place
// =====================
bot.command("place", (ctx) => {
    const buttons = Object.keys(regions).map(r => [Markup.button.callback(r, `region_${r}`)]);
    ctx.reply("Виберіть область:", Markup.inlineKeyboard(buttons));
});

// =====================
// /website
// =====================
bot.command("website", async (ctx) => {
    const text = ctx.message.text.replace("/website", "").trim();
    const location = findLocationLink(text);

    if (!location) {
        return safeSend(() =>
            ctx.reply("❌ Місто не знайдено. Використайте /place.")
        );
    }

    await safeSend(() =>
        ctx.reply(
            `📍 *${location.name}*\n\nПереглянути графік:`,
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔌 Відкрити сайт", url: location.url }]
                    ]
                }
            }
        )
    );
});

// =====================
// /dev
// =====================
bot.command("dev", (ctx) => {
    ctx.reply("Розробники бота: @Sev1x1, @sanyatarpeda");
});

// =====================
// Inline кнопки
// =====================
bot.action(/region_(.+)/, (ctx) => {
    const region = ctx.match[1];
    const cities = regions[region] || [];
    const buttons = cities.map(c => [Markup.button.callback(c, `city_${c}`)]);
    ctx.reply(`Виберіть місто (${region}):`, Markup.inlineKeyboard(buttons));
});

bot.action(/city_(.+)/, async (ctx) => {
    const city = ctx.match[1];
    const location = findLocationLink(city);

    if (!location) return ctx.reply(`Ви обрали місто: ${city}`);

    await safeSend(() =>
        ctx.reply(
            `📍 *${location.name}*\n\nПереглянути графік:`,
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔌 Відкрити сайт", url: location.url }]
                    ]
                }
            }
        )
    );
});

// =====================
// /help
// =====================
bot.command("help", async (ctx) => {
    await safeSend(() =>
        ctx.reply(
            "👋 *Помощь*\n\n" +
            "Напишите сообщение — оно уйдёт в поддержку.",
            { parse_mode: "Markdown" }
        )
    );
});

// =====================
// Сообщения
// =====================
bot.on("message", async (ctx) => {
    const msg = ctx.message;
    const userId = msg.from.id;

    if (findLocationLink(msg.text)) return;

    if (ctx.chat.id === ADMIN_ID) return;

    userMap[userId] = msg.text || "[медиа]";

    await safeSend(() =>
        bot.telegram.sendMessage(
            ADMIN_ID,
            `📩 Новое сообщение\nID: ${userId}\n\n${userMap[userId]}`
        )
    );

    await safeSend(() =>
        ctx.reply("📨 Сообщение отправлено в поддержку.")
    );
});

// =====================
// Глобальный catch
// =====================
bot.catch((err, ctx) => {
    const code = err?.response?.error_code;
    if (code === 403) {
        console.log(`🚫 Бот заблокирован пользователем ${ctx?.chat?.id}`);
        return;
    }
    console.error("🔥 Telegraf error:", err);
});

// =====================
// Запуск
// =====================
bot.launch();
console.log("🤖 Бот запущен!");
