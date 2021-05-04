import {GpuPriceProvider} from './gpu-price-provider';
import {getManufacturer, Gpu, GpuPrice, Shop} from "./gpu";
import {Browser} from "puppeteer";

export class PichauGpuProvider implements GpuPriceProvider {
    async getGpusPrices(gpus: Gpu[], browser: Browser): Promise<GpuPrice[]> {

        const page = await browser.newPage();

        await page.goto('https://www.pichau.com.br/hardware/placa-de-video?product_list_limit=48');
        await page.waitForSelector('.product-item-info', {timeout: 10000});

        const items = await page.mainFrame().$x('//ol[@class="products list items product-items"]/li[count(.//button[@title="Colocar no Carrinho"])=1]');

        const prices: GpuPrice[] = [];

        for (const item of items) {
            const itemlink = await item.$('.product-item-link');
            const itemvalue = await item.$('.price-boleto');

            let description = await ((await itemlink.getProperty('textContent'))).jsonValue() as string;
            let link = await ((await itemlink.getProperty('href'))).jsonValue() as string;
            let price = await itemvalue.$eval('span', el => el.textContent);

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
                price: parseFloat(price.replace('.', '').replace(',', '.').replace('à vista R$', '')),
                shop: Shop.Pichau,
                link
            }))
        }

        return prices;
    }
}