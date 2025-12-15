const puppeteer = require("puppeteer");

(async () => {
    const browser = await puppeteer.launch({
        headless: "new"
    });

    const page = await browser.newPage();

    await page.goto("https://off.energy.mk.ua/", {
        waitUntil: "networkidle2",
        timeout: 0
    });

    await page.waitForSelector("tr", { timeout: 0 });

    const rawData = await page.evaluate(() => {
        const data = [];
        document.querySelectorAll("tr").forEach(row => {
            const cells = row.querySelectorAll("td");

            if (cells.length >= 3) {
                const address = cells[0].innerText.trim();
                const group = cells[1].innerText.trim();
                const time = cells[2].innerText.trim();

                if (address && group && time) {
                    data.push({ address, group, time });
                }
            }
        });
        return data;
    });

    // Группируем по времени
    const groupedByTime = {};
    rawData.forEach(item => {
        if (!groupedByTime[item.time]) {
            groupedByTime[item.time] = new Set();
        }
        groupedByTime[item.time].add(item.group);
    });

    console.log("=== ОТКЛЮЧЕНИЯ ПО ВРЕМЕНИ ===");
    for (const [time, groups] of Object.entries(groupedByTime)) {
        console.log(`Время: ${time} — Группы: ${Array.from(groups).join(", ")}`);
    }

    await browser.close();
})();
