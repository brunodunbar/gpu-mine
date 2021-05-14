import {PichauGpuProvider} from "./src/pichau-gpu-provider";
import {KabumGpuProvider} from "./src/kabum-gpu-provider";
import {GpuService} from "./src/gpu";
import {CurrencyService} from "./src/currency";
import {TerabyteGpuProvider} from "./src/terabyte-gpu-provider";
import * as fs from 'fs';

const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({headless: true, defaultViewport: null});

    try {
        const currencyService = new CurrencyService();
        const gpuService = new GpuService(browser, currencyService);
        const gpus = await gpuService.getGpus();

        const prices = await Promise.all([
            new PichauGpuProvider().getGpusPrices(gpus, browser),
            new KabumGpuProvider().getGpusPrices(gpus, browser),
            new TerabyteGpuProvider().getGpusPrices(gpus, browser)
        ]).then(value => Array.prototype.concat(...value));

        const sortedByPayback = prices.sort((a, b) => a.payback - b.payback)

        let writeStream = fs.createWriteStream('placas.csv');

        writeStream.write('"Modelo","Preço","Retorno %","Gasto Energia","Retorno Liquido","Melhor Retorno","Se paga em","Link"\n');
        sortedByPayback.forEach(value => {
            console.log({
                modelo: value.gpu.model,
                loja: value.shop,
                preco: value.price,
                retorno: {percentual: value.roi, valorEnergiaMes: value.monthlyRunningCost, valorLiquidoMes: value.monthlyNetProfit, origem: value.gpu.bestRevenue.origin, payback: value.payback},
                link: value.link
            });

            let preco = value.price.toFixed(2).toString().replace('.', ',');
            let consumo = value.monthlyRunningCost.toFixed(2).toString().replace('.', ',');
            let lucroLiquido = value.monthlyNetProfit.toFixed(2).toString().replace('.', ',');
            let tempoParaSePagar = value.payback.toString().replace('.', ',');
            writeStream.write(`"${value.gpu.model}","${preco}","${value.roi}","${consumo}","${lucroLiquido}","${value.gpu.bestRevenue.origin}","${tempoParaSePagar}","${value.link}"\n`);
        });

        await new Promise(resolve => {
            writeStream.end(resolve)
        });
    } finally {
        await browser.close();
    }
})();