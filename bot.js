require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const regions = require("./regions");
let websites = {};
try {
    websites = require("./websites");
} catch (e) {
    console.warn("⚠️ ./websites not found, continuing without website links");
}
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./users.db");
let userMap = {};
let adminSendState = null; // { awaiting: true }
let devText = "Розробники бота: @Sev1x1, @sanyatarpeda";
let devEditState = null; // { awaiting: true }

// =====================
// Перевірка адміна
// =====================
function isAdmin(ctx) {
    return ctx.from?.id === ADMIN_ID;
}

// =====================
// Безпечна відправка повідомлень
// =====================
async function safeSend(fn) {
    try {
        await fn();
    } catch (e) {
        const code = e?.response?.error_code;
        if (code === 403) {
            console.log("🚫 Користувач заблокував бота");
        } else {
            console.error("❌ Помилка Telegram:", e);
        }
    }
}
// =====================
// Пошук міста/області
// =====================
function findLocationLink(text) {
    if (!text) return null;
    if (!websites || Object.keys(websites).length === 0) return null;
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
                "/start – запустити бота\n" +
                "/place_admin — вибрати місто\n" +
                "/send — розіслати повідомлення\n" +
                "/stats — статистика\n" +
                "/users — список пользователей\n"+
                "/website_admin — адміністрування сайтів\n" +
                "/dev — Розробники бота\n"
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
        const uid = ctx.from?.id;
        if (uid) {
            const existing = userMap[uid];
            userMap[uid] = userMap[uid] || {
                firstName: ctx.from?.first_name || {},
                lastName: ctx.from?.last_name || {},
                username: ctx.from?.username ? `@${ctx.from.username}` : {},
                phone: {},
            };
        }
    }
});

// =====================
// Admin команды
// =====================
bot.command("send", (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("❌ У вас немає доступу.");
    adminSendState = { awaiting: true };
    ctx.reply(
        "📝 Введіть повідомлення для розсилки всім користувачам.\n" +
        "Надішліть текст/стікер/фото або натисніть /cancel_send щоб скасувати."
    );
});

bot.command("cancel_send", (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("❌ У вас немає доступу.");
    if (!adminSendState || !adminSendState.awaiting) return ctx.reply("ℹ️ Нет активной рассылки.");
    adminSendState = null;
    ctx.reply("❌ Розсилка скасована.");
});

bot.command("users", (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("❌ Команда лише для адміністратора.");
    const entries = Object.entries(userMap);
    if (entries.length === 0) return ctx.reply("👥 Немає зареєстрованих користувачів.");

    let parts = [`👥 Всего пользователей: ${entries.length}`];
    for (const [id, info] of entries) {
        if (!info || typeof info === "string") {
            parts.push('________________________________')
            parts.push(`ID: ${id} — ${info || {}}`);
            parts.push('________________________________')
            continue;
        }
        parts.push(
            `ID: ${id} —
             Имя: ${info.firstName || {}},
             Фамилия: ${info.lastName || {}}, 
             Username: ${info.username || {}},
             Телефон: ${info.phone || {}} `
        );
    }

    // Telegram message length limit — split into chunks of ~3000 chars
    const text = parts.join("\n");
    const CHUNK = 3000;
    if (text.length <= CHUNK) return ctx.reply(text);

    for (let i = 0; i < text.length; i += CHUNK) {
        ctx.reply(text.slice(i, i + CHUNK));
    }
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




bot.command("website_admin", async (ctx) => {
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
    return ctx.reply(devText);
});

bot.command("setdev", (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("❌ У вас нет доступа.");
    devEditState = { awaiting: true };
    ctx.reply("✏️ Надішліть новий текст для команди /dev або /cancel_setdev щоб скасувати.");
});

bot.command("cancel_setdev", (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("❌ У вас нет доступа.");
    if (!devEditState || !devEditState.awaiting) return ctx.reply("ℹ️ Нет активного редактирования.");
    devEditState = null;
    ctx.reply("❌ Редагування скасовано.");
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
    const from = msg.from || {};
    const userId = from.id;

    if (findLocationLink(msg.text || msg.caption)) return;

    // Якщо адмін надсилає повідомлення — перевіримо режими: редагування /dev або розсилка
    if (ctx.chat.id === ADMIN_ID) {
        const content = msg.text || msg.caption || "[медиа]";

        // Режим редактирования текста для /dev
        if (devEditState && devEditState.awaiting && from.id === ADMIN_ID) {
            if (msg.text || msg.caption) {
                devText = msg.text || msg.caption;
                devEditState = null;
                return ctx.reply("✅ Текст команды /dev успешно обновлён.");
            } else {
                return ctx.reply("⚠️ Неможливо встановити медіа як текст. Надішліть текстове повідомлення.");
            }
        }

        // Режим рассылки
        if (adminSendState && adminSendState.awaiting && from.id === ADMIN_ID) {
            const ids = Object.keys(userMap).map(id => Number(id)).filter(id => id && id !== ADMIN_ID);

            if (ids.length === 0) {
                adminSendState = null;
                return ctx.reply("⚠️ Немає зареєстрованих користувачів для розсилки.");
            }

            let success = 0, failed = 0;
            for (const id of ids) {
                try {
                    if (msg.text) {
                        await bot.telegram.sendMessage(id, content);
                    } else {
                        await bot.telegram.copyMessage(id, ADMIN_ID, msg.message_id);
                    }
                    success++;
                } catch (e) {
                    failed++;
                }
            }

            adminSendState = null;
            return ctx.reply(`✅ Розсилка завершена. Успішно: ${success}. Помилок: ${failed}.`);
        }

        return;
    }

    const firstName = from.first_name || "-";
    const lastName = from.last_name || "-";
    const username = from.username ? `@${from.username}` : "-";
    const phone = (msg.contact && msg.contact.phone_number) ? msg.contact.phone_number : "не указан";
    const content = msg.text || msg.caption || "[медиа]";

    userMap[userId] = {
        firstName,
        lastName,
        username,
        phone,
        lastMessage: content
    };

    const adminMessage =
        `📩 Нове повідомлення до техпідтримки\n` +
        `ID: ${userId}\n` +
        `Имя: ${firstName}\n` +
        `Фамилия: ${lastName}\n` +
        `Username: ${username}\n` +
        `Телефон: ${phone}\n\n` +
        `Сообщение:\n${content}`;

    await safeSend(() =>
        bot.telegram.sendMessage(ADMIN_ID, adminMessage)
    );

    await safeSend(() =>
        ctx.reply("📨 Повідомлення надіслано до підтримки.")
    );
});

// =====================
// Глобальный catch
// =====================
bot.catch((err, ctx) => {
    const code = err?.response?.error_code;
    const update = ctx?.update || {};
    const msg = update.message || update.callback_query?.message || {};
    const from = ctx?.from || msg.from || ctx?.chat || {};
    const userId = from?.id || ctx?.chat?.id || {};

    if (code === 403) {
        const firstName = from.first_name || "-";
        const lastName = from.last_name || "-";
        const username = from.username ? `@${from.username}` : "-";
        const phone = (msg.contact && msg.contact.phone_number) ? msg.contact.phone_number : "не указан";
        const content = msg.text || msg.caption || "[нет сообщения]";

        const adminMessage =
            `🚫 Бот заблоковано користувачем\n` +
            `ID: ${userId}\n` +
            `Имя: ${firstName}\n` +
            `Фамилия: ${lastName}\n` +
            `Username: ${username}\n` +
            `Телефон: ${phone}\n\n` +
            `Последнее сообщение:\n${content}`;

        safeSend(() => bot.telegram.sendMessage(ADMIN_ID, adminMessage));
        console.log(`🚫 Бот заблоковано користувачем ${userId}`);
        return;
    }

    console.error("🔥 Telegraf error:", err);
});

// =====================
// Запуск
// =====================
bot.launch();
console.log("🤖 Бот запущен!");
