require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const regions = require("./regions");
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);
let userMap = {};
// userMap[userId] = messageText


function isAdmin(ctx) {
    return ctx.from.id === ADMIN_ID;
}






bot.start((ctx) => {
    if (isAdmin(ctx)) {
        ctx.reply(
            "👑 Админ-панель\n\n" +
            "Команды:\n" +
            "/place_admin — вибрати місто\n" +
            "/send — розіслати повідомлення\n" +
            "/stats — статистика\n" +
            "/users — список пользователей\n",
        );
    } else {
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
        );
    }
});


bot.command("send", (ctx) => {
    if (!isAdmin(ctx))
        return ctx.reply("❌ У вас нет доступа.");

    ctx.reply("Введите текст рассылки:");
});


bot.command("users", (ctx) => {
    if (!isAdmin(ctx))
        return ctx.reply("❌ Команда только для администратора.");

    ctx.reply("Пользователи: ...");
});


bot.command("stats", (ctx) => {
    if (!isAdmin(ctx))
        return ctx.reply("❌ Эта команда недоступна.");

    ctx.reply("📊 Статистика: ...");
});


bot.command("place", (ctx) => {
    const regionButtons = Object.keys(regions).map(r => [Markup.button.callback(r, `region_${r}`)]);
    ctx.reply("Виберіть область:", Markup.inlineKeyboard(regionButtons));
});

bot.command("place_admin", (ctx) => {
    const regionButtons = Object.keys(regions).map(r => [Markup.button.callback(r, `region_${r}`)]);
    ctx.reply("Виберіть область:", Markup.inlineKeyboard(regionButtons));
});


bot.command("website", (ctx) => {
    ctx.reply(
        "🔌 Відкрити веб-версію",
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Відкрити сайт", web_app: { url: "https://off.energy.mk.ua/" } }
                    ]
                ]
            }
        }
    );
})
bot.command("dev", (ctx) => {
    ctx.reply(`Розробники бота: @Sev1x1, @sanyatarpeda`);
});


bot.action(/region_(.+)/, (ctx) => {
    const region = ctx.match[1];
    const cities = regions[region];
    const cityButtons = cities.map(c => [Markup.button.callback(c, `city_${c}`)]);
    ctx.reply(`Виберіть місто в області "${region}":`, Markup.inlineKeyboard(cityButtons));
});

bot.action(/city_(.+)/, async (ctx) => {
    const city = ctx.match[1];
    ctx.reply(`Ви обрали місто: ${city}`);
});


bot.command("help", async (ctx) => {
    await ctx.reply(
        "👋 *Помощь*\n\n" +
        "Напишите любое сообщение, и оно будет отправлено в техподдержку.\n" +
        "Ожидайте ответ.",
        { parse_mode: "Markdown" }
    );
});



bot.on("message", async (ctx) => {
    const msg = ctx.message;
    const userId = msg.from.id;
    const chatId = msg.chat.id;


    if (chatId === ADMIN_ID) {
        // Админ отвечает через кнопку
        if (msg.reply_to_message && msg.reply_to_message.text.includes("Ответить пользователю")) {
            const uid = msg.reply_to_message.text.match(/ID: (\d+)/)[1];

            await bot.telegram.sendMessage(uid, msg.text);
            await ctx.reply("✔ Ответ отправлен пользователю!");

            return;
        }

        return;
    }


    userMap[userId] = msg.text || "[медиа]";

    await bot.telegram.sendMessage(
        ADMIN_ID,
        `📩 Новое сообщение от пользователя:\n` +
        `ID: ${userId}\n\n` +
        `${userMap[userId]}`,
        Markup.inlineKeyboard([
            [Markup.button.callback("Ответить пользователю", `reply_${userId}`)]
        ])
    );

    await ctx.reply("📨 Сообщение отправлено в поддержку. Ожидайте ответа.");
});


bot.action(/reply_(.+)/, async (ctx) => {
    const userId = ctx.match[1];

    await ctx.reply(
        `✍ Напишите сообщение — и я отправлю его пользователю.\nID: ${userId}\n\n` +
        `Ответить пользователю:`,
        { reply_markup: { force_reply: true } }
    );
});


bot.on("message", async (ctx) => {
    if (ctx.message.reply_to_message && ctx.message.reply_to_message.text.includes("ID:")) {
        const uid = ctx.message.reply_to_message.text.match(/ID: (\d+)/)[1];

        await bot.telegram.sendMessage(uid, ctx.message.text);
        await ctx.reply("✔ Ответ отправлен!");
    }
});

bot.launch();
console.log("Бот запущен!");
