import {GpuPriceProvider} from './gpu-price-provider';
import {getManufacturer, Gpu, GpuPrice, Shop} from "./gpu";
import {Browser} from "puppeteer";

export class KabumGpuProvider implements GpuPriceProvider {

    async getGpusPrices(gpus: Gpu[], browser: Browser): Promise<GpuPrice[]> {

        try {

            const page = await browser.newPage();

            await page.goto('https://www.kabum.com.br/hardware/placa-de-video-vga?pagina=1&ordem=5&limite=100&prime=false&marcas=[]&tipo_produto=[]&filtro=[]&valor_minimo=1081.78&valor_maximo=47058.71');
            await page.waitForSelector('.sc-fzqNqU', {timeout: 10000});

            const items = await page.mainFrame().$x('//div[@id="listagem-produtos"]//div[@class="sc-fzqARJ eITELq" and count(.//img[@class="sc-fznZeY hHaoVN"])]');

            const prices: GpuPrice[] = [];

            for (const item of items) {
                const itemlink = await item.$('.sc-fzozJi');
                const itemvalue = await item.$('.sc-fznWqX');
                const itemlinka = await itemlink.$('a');

                let description = await ((await itemlinka.getProperty('textContent'))).jsonValue() as string;
                let link = await ((await itemlinka.getProperty('href'))).jsonValue() as string;
                let price = await ((await itemvalue.getProperty('textContent'))).jsonValue() as string;
                let gpu = gpus.find(x => description.toLowerCase().includes(x.model.toLowerCase()));

                if (!description.toLowerCase().includes('placa de vídeo') || !gpu) {
                    // console.log(`Ignorando item ${description}, porque não é uma placa de video conhecida`);
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
                    shop: Shop.Kabum,
                    link
                }))
            }

            return prices;
        } catch (e) {
            console.log('Falha ao recuperar os preços da kabum', e);
            return [];
        }
    }
}