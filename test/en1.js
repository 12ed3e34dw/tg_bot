const puppeteer = require("puppeteer");
const readline = require("readline");

// Функция для ввода адреса в консоли
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

(async () => {
    // Пользователь вводит адрес
    const userAddress = await askQuestion("Введите адрес (улица + номер): ");

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Открываем сайт
    await page.goto("https://off.energy.mk.ua/", { waitUntil: "networkidle2", timeout: 0 });

    // Ждём форму поиска
    await page.waitForSelector("input[type='text']", { timeout: 15000 });

    // Вводим адрес
    await page.type("input[type='text']", userAddress);

    // Нажимаем Enter
    await page.keyboard.press("Enter");

    // Ждём появления результата (можно немного увеличить таймаут)
    await page.waitForTimeout(4000);

    // Получаем результат: очередь и время
    const result = await page.evaluate(() => {
        const info = {};

        // На сайте обычно результат выводится в блоке .queue-info или в списках
        // Здесь берём всё текстовое содержимое страницы после поиска
        const queueEl = document.querySelector(".queue-info") || document.querySelector(".search-result") || document.body;
        info.text = queueEl.innerText.trim();

        return info;
    });

    console.log("\n=== Результат поиска для адреса ===");
    console.log(result.text);

    await browser.close();
})();
