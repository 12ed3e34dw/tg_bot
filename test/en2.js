const puppeteer = require("puppeteer");
(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
    });
    const page = await browser.newPage();
    await page.goto("https://off.energy.mk.ua/", {
        waitUntil: "networkidle2",
        timeout: 0,
    });

    await page.waitForSelector("tr", {
        timeout: 0,
    });

    const data = await page.evaluate(() => {
        const result = [];

        document.querySelectorAll("tr").forEach(row => {
            const cells = row.querySelectorAll("td");

            if (cells.length >= 3) {
                const address = cells[0].innerText.trim();
                const group = cells[1].innerText.trim();

                const style = window.getComputedStyle(cells[0]);
                const bgColor = style.backgroundColor;

                let statusIcon = "🟢";

                // если цвет фонового блока — красный
                if (
                    bgColor.includes("rgb(255, 0, 0)") ||
                    bgColor.includes("#ff0000")
                ) {
                    statusIcon = "🔴";
                }
                // если жёлтый
                else if (
                    bgColor.includes("rgb(255, 255, 0)") ||
                    bgColor.includes("#ffff00")
                ) {
                    statusIcon = "🟡";
                }

                if (address && group) {
                    result.push({
                        status: statusIcon,
                        address,
                        group,
                    });
                }
            }
        });
        return result;
    });

    console.log("=== ОТКЛЮЧЕНИЯ (адрес → группа → время) ===");
    console.log(data);

    await browser.close();
})();
