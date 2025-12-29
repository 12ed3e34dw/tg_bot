const puppeteer = require("puppeteer");

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.goto("https://off.energy.mk.ua/", {
        waitUntil: "networkidle2",
        timeout: 0
    });

    await page.waitForSelector("tr", { timeout: 0 });

    const data = await page.evaluate(() => {
        const result = {};

        document.querySelectorAll("tr").forEach(row => {
            const cells = row.querySelectorAll("td");

            if (cells.length >= 3) {
                const address = cells[0].innerText.trim();
                const groupsText = cells[1].innerText.trim(); // может быть несколько групп через пробел или запятую
                const time = cells[2].innerText.trim();

                const style = window.getComputedStyle(cells[0]);
                const bgColor = style.backgroundColor;

                // определяем статус иконкой
                let statusIcon = "🟢";
                if (bgColor.includes("rgb(255, 0, 0)") || bgColor.includes("#ff0000")) {
                    statusIcon = "🔴";
                } else if (bgColor.includes("rgb(255, 255, 0)") || bgColor.includes("#ffff00")) {
                    statusIcon = "🟡";
                }

                if (time) {
                    // разбиваем группы на массив
                    const groups = groupsText.split(/[\s,]+/).filter(g => g);

                    // если уже есть запись по этому времени, объединяем группы
                    if (!result[time]) {
                        result[time] = { status: statusIcon, address, groups: [] };
                    }

                    // приоритет статусов: 🔴 > 🟡 > 🟢
                    if (statusIcon === "🔴" || (statusIcon === "🟡" && result[time].status === "🟢")) {
                        result[time].status = statusIcon;
                    }

                    // объединяем все группы
                    result[time].groups.push(...groups);
                }
            }
        });

        // преобразуем объект в массив и удаляем дубликаты групп
        return Object.entries(result).map(([time, info]) => ({
            status: info.status,
            address: info.address,
            groups: [...new Set(info.groups)].join(", ")
        }));
    });

    console.log(data);

    await browser.close();
})();
