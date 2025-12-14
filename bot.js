require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const regions = require("./regions");
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);
const sqlite3 = require("sqlite3").verbose();
const db=new sqlite3.Database("./users.db");
let userMap = {};
// userMap[userId] = messageText


// Panel Admin
function isAdmin(ctx) {
    return ctx.from.id === ADMIN_ID;
}
//Main
bot.start((ctx) => {
    if (isAdmin(ctx)) {
        ctx.reply(
            "Админ-панель\n\n" +
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
        );
    }
});


//_____________________________________________________________________________________________________________________
// Admin commands


bot.command("send", (ctx) => {
    if (!isAdmin(ctx))
        return ctx.reply("❌ У вас нет доступа.");


});

bot.command("users", (ctx) => {
    if (!isAdmin(ctx))
        return ctx.reply("❌ Команда только для администратора.");
});

bot.command("stats", (ctx) => {
    if (!isAdmin(ctx))
        return ctx.reply("❌ Эта команда недоступна.");

    ctx.reply("📊 Статистика: ...");
});



bot.command("place_admin", (ctx) => {
    const regionButtons = Object.keys(regions).map(r => [Markup.button.callback(r, `region_${r}`)]);
    ctx.reply("Виберіть область:", Markup.inlineKeyboard(regionButtons));
});

//_____________________________________________________________________________________________________________________

bot.command("place", (ctx) => {
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
    const username = msg.from.username ? `@${msg.from.username}` : "нет username";
    const firstName = msg.from.first_name || "нет имени";
    const lastName = msg.from.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (chatId === ADMIN_ID) {
        // Админ отвечает через кнопку
        if (msg.reply_to_message && msg.reply_to_message.text.includes("Ответить пользователю")) {
            const uid = msg.reply_to_message.text.match(/ID: (\d+)/)[1];

            try {
                await bot.telegram.sendMessage(uid, msg.text);
                await ctx.reply("✔ Ответ отправлен пользователю!");
            } catch (e) {
                await ctx.reply("❌ Не удалось отправить — пользователь заблокировал бота.");
            }
            return;
        }
        return;
    }
    userMap[userId] = msg.text || "[медиа]";
    try {
        await bot.telegram.sendMessage(
            ADMIN_ID,
            `📩 Новое сообщение от пользователя:\n` +
            `ID: ${userId}\n` +
            `Имя: ${fullName}\n` +
            `Username: ${username}\n\n` +
            `${userMap[userId]}`,
            Markup.inlineKeyboard([
                [Markup.button.callback("Ответить пользователю", `reply_${userId}`)]
            ])
        );
    } catch (e) {
        console.error("Ошибка отправки админу:", e.description);
    }

    await ctx.reply("📨 Сообщение отправлено в поддержку. Ожидайте ответа.");
});

bot.launch();
console.log("Бот запущен!");
