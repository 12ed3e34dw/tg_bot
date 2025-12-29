require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const regions = require("../regions");
const websites = require("../websites");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);

// ======================
// STATE
// ======================
const waitingWebsiteInput = new Set(); // userId
const usersSet = new Set(); // уникальные пользователи

// ======================
// UTILS
// ======================
async function safeReply(ctx, text, extra = {}) {
    try {
        await ctx.reply(text, extra);
    } catch (err) {
        if (err.code === 403) {
            console.log(`🚫 Пользователь ${ctx.from?.id} заблокировал бота`);
        } else {
            console.error("safeReply error:", err);
        }
    }
}

async function safeSend(chatId, text, extra = {}) {
    try {
        await bot.telegram.sendMessage(chatId, text, extra);
    } catch (err) {
        if (err.code === 403) {
            console.log(`🚫 Нельзя отправить сообщение пользователю ${chatId}`);
        } else {
            console.error("safeSend error:", err);
        }
    }
}

const isAdmin = (ctx) => ctx.from?.id === ADMIN_ID;

// ======================
// START
// ======================
bot.start(async (ctx) => {
    if (isAdmin(ctx)) {
        return safeReply(
            ctx,
            "Админ-панель\n\n" +
            "/place_admin — вибрати місто\n" +
            "/users — список пользователей"
        );
    }

    await safeReply(
        ctx,
        "Вітаємо!\n\n" +
        "Цей бот допоможе дізнатися графік відключень.\n\n" +
        "/place — вибрати місто\n" +
        "/website — офіційний сайт\n" +
        "/help — тех підтримка\n" +
        "/dev — розробники",
        { parse_mode: "Markdown" }
    );
});

// ======================
// COMMANDS
// ======================
bot.command("place", async (ctx) => {
    const buttons = Object.keys(regions).map(r => [
        Markup.button.callback(r, `region_${r}`)
    ]);
    await safeReply(ctx, "Виберіть область:", Markup.inlineKeyboard(buttons));
});

bot.command("place_admin", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const buttons = Object.keys(regions).map(r => [
        Markup.button.callback(r, `region_${r}`)
    ]);
    await safeReply(ctx, "Виберіть область:", Markup.inlineKeyboard(buttons));
});

bot.command("website", async (ctx) => {
    waitingWebsiteInput.add(ctx.from.id);

    await safeReply(
        ctx,
        "🌍 Введите *город или область* (UA / RU / EN):",
        { parse_mode: "Markdown" }
    );
});

bot.command("dev", (ctx) => {
    safeReply(ctx, "Розробники бота: @Sev1x1, @sanyatarpeda");
});

bot.command("help", (ctx) => {
    safeReply(
        ctx,
        "👋 *Помощь*\n\nНапишите сообщение — оно будет отправлено в поддержку.",
        { parse_mode: "Markdown" }
    );
});

bot.command("users", async (ctx) => {
    if (!isAdmin(ctx)) return;
    if (usersSet.size === 0) return safeReply(ctx, "Список пользователей пуст");

    await safeReply(
        ctx,
        `👥 Пользователи:\n${[...usersSet].join("\n")}`
    );
});

// ======================
// CALLBACKS
// ======================
bot.action(/region_(.+)/, async (ctx) => {
    const region = ctx.match[1];
    const cities = regions[region] || [];

    const buttons = cities.map(city => [
        Markup.button.callback(city, `city_${city}`)
    ]);

    await ctx.editMessageText(
        `Виберіть місто в області "${region}":`,
        Markup.inlineKeyboard(buttons)
    );
});

bot.action(/city_(.+)/, async (ctx) => {
    await safeReply(ctx, `✅ Ви обрали місто: ${ctx.match[1]}`);
});

// ======================
// MESSAGE HANDLER
// ======================
bot.on("message", async (ctx) => {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const text = ctx.message.text || "";

    // сохраняем пользователей
    if (!isAdmin(ctx)) usersSet.add(userId);

    // ======================
    // WEBSITE INPUT HANDLER
    // ======================
    if (waitingWebsiteInput.has(userId)) {
        waitingWebsiteInput.delete(userId);

        const query = text
            .toLowerCase()
            .replace(/область|region/gi, "")
            .trim();

        const url = websites[query];

        if (!url) {
            return safeReply(
                ctx,
                "❌ Сайт не знайдено.\nСпробуйте ще раз: /website"
            );
        }

        return safeReply(
            ctx,
            "🔌 Відкрити веб-версію:",
            {
                reply_markup: {
                    inline_keyboard: [[
                        { text: "Відкрити сайт", web_app: { url } }
                    ]]
                }
            }
        );
    }

    // ======================
    // SUPPORT
    // ======================
    if (!isAdmin(ctx)) {
        await safeSend(
            ADMIN_ID,
            `📩 Новое сообщение\n\nID: ${userId}\n\n${text}`
        );
        return safeReply(ctx, "📨 Сообщение отправлено в поддержку");
    }
});

// ======================
// ERROR HANDLER
// ======================
bot.catch((err) => {
    if (err.code !== 403) console.error("BOT ERROR:", err);
});

// ======================
// LAUNCH
// ======================
bot.launch();
console.log("✅ Бот запущен");
