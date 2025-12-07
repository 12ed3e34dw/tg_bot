require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const regions = require("./regions");


const bot = new Telegraf(process.env.BOT_TOKEN);


bot.start((ctx) => {
   ctx.reply(
       "Вітаємо!\n" +
       "\n" +
       "Цей бот допоможе вам швидко дізнатися графік відключень електроенергії за чергами у вашому місті та по всій Україні." +
       "\n" +
       "\n" +
       "*Доступні команди:*\n" +
       "/start – запустити бота\n" +
       "/help - тих підтримка\n" +
       "/weather - вибрати своє місто\n" +
       "/website - офіційний сайт\n" +
       "\n" +
       "Розробники бота:\n"+
       "@Sev1x1\n" +
       "@sanyatarpeda\n"
   );
});



bot.command("weather", (ctx) => {
    const regionButtons = Object.keys(regions).map(r => [Markup.button.callback(r, `region_${r}`)]);
    ctx.reply("Виберіть область:", Markup.inlineKeyboard(regionButtons));
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

bot.command("help", (ctx) => {
    ctx.reply("Это справка по командам:\n/start – запустить бота\n/help – помощь");
});


bot.launch();
console.log("Бот запущен!");
