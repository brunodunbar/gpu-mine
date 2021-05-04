import {GpuPriceProvider} from './gpu-price-provider';
import {getManufacturer, Gpu, GpuPrice, Shop} from "./gpu";
import {Browser} from "puppeteer";

export class TerabyteGpuProvider implements GpuPriceProvider {
    async getGpusPrices(gpus: Gpu[], browser: Browser): Promise<GpuPrice[]> {

        const page = await browser.newPage();

        await page.goto('https://www.terabyteshop.com.br/hardware/placas-de-video');
        await page.waitForSelector('.commerce_columns_item_inner', {timeout: 10000});

        const items = await page.mainFrame().$x('//div[@class="commerce_columns_item_inner" and count(.//button[@class="btn tbt_comprar"])=1]');

        const prices: GpuPrice[] = [];

        for (const item of items) {
            const itemlink = await item.$('.prod-name');

            let description = await itemlink.$eval('h2 > strong', el => el.textContent);
            let link = await ((await itemlink.getProperty('href'))).jsonValue() as string;
            let price = await item.$eval('.prod-new-price > span', el => el.textContent);

            let gpu = gpus.find(x => description.toLowerCase().includes(x.model.toLowerCase()));

            if (!gpu) {
                continue;
            }

            const manufacturer = getManufacturer(description);

            prices.push(new GpuPrice({
                gpu,
                description: description.split(',')[0]
                    .replace('Placa de Vídeo', '')
                    .trim(),
                manufacturer,
                price: parseFloat(price.replace('.', '').replace(',', '.').replace('R$', '')),
                shop: Shop.Terabyte,
                link
            }))
        }

        return prices;
    }
}