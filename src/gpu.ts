import {CurrencyService} from "./currency";
import Big from "big.js";
import {Browser} from "puppeteer";

const axios = require('axios');

export enum Brand {
    NVIDIA = 'NVIDIA',
    AMD = 'AMD',
    Other = 'Other'
}

export enum Manufacturer {
    Gigabyte = 'Gigabyte',
    Asus = 'Asus',
    XFX = 'XFX',
    PowerColor = 'PowerColor',
    Galax = 'Galax',
    PCYES = 'PCYES',
    EVGA = 'EVGA',
    Gainward = 'Gainward',
    MSI = 'MSI',
    AFOX = 'AFOX',
    ZOTAC = 'ZOTAC',
    Other = 'Other'
}

export interface Revenue {
    origin: string;
    value: number;
}

export class Gpu {
    model: string;
    brand: Brand;
    power: number;
    revenues: Revenue[];

    constructor({model, brand, power, revenues}: { model: string, brand: Brand, power: number, revenues?: Revenue[] }) {
        this.model = model;
        this.brand = brand;
        this.power = power;
        this.revenues = revenues;
    }

    get bestRevenue(): Revenue {
        return this.revenues.sort((a, b) => a.value - b.value)[0];
    }

    get dailyRunningCost(): number {
        return Number(Big(this.power).div(1000).mul(0.74).mul(24).toFixed(6));
    }
}

export enum Shop {
    Kabum = 'Kabum',
    Pichau = 'Pichau',
    Terabyte = 'Terabyte'
}

export class GpuPrice {
    description: string;
    price: number;
    manufacturer: Manufacturer;
    gpu: Gpu;
    shop: Shop;
    link: string;

    constructor({description, price, manufacturer, gpu, shop, link}: { description: string, price: number, manufacturer: Manufacturer, gpu: Gpu, shop: Shop, link: string }) {
        this.description = description;
        this.price = price;
        this.manufacturer = manufacturer;
        this.gpu = gpu;
        this.shop = shop;
        this.link = link;
    }

    get monthlyRunningCost(): number {
        return Number(Big(this.gpu.dailyRunningCost).mul(30).toFixed(2));
    }

    get monthlyNetProfit(): number {
        const revenue = this.gpu.bestRevenue;
        return Number(Big(revenue.value).mul(30).minus(this.monthlyRunningCost).toFixed(2));
    }

    get roi(): number {
        return Number(Big(this.monthlyNetProfit).mul(100).div(Big(this.price)).toFixed(1));
    }

    get payback(): number {
        return Number(Big(this.price).div(Big(this.monthlyNetProfit)).toFixed(1));
    }
}

export function getManufacturer(description: string): Manufacturer {

    if (description.toLowerCase().includes('gigabyte')) {
        return Manufacturer.Gigabyte;
    }
    if (description.toLowerCase().includes('zotac')) {
        return Manufacturer.ZOTAC;
    }

    if (description.toLowerCase().includes('asus')) {
        return Manufacturer.Asus;
    }

    if (description.toLowerCase().includes('powercolor')) {
        return Manufacturer.PowerColor;
    }

    if (description.toLowerCase().includes('galax')) {
        return Manufacturer.Galax;
    }

    if (description.toLowerCase().includes('pcyes')) {
        return Manufacturer.PCYES;
    }

    if (description.toLowerCase().includes('evga')) {
        return Manufacturer.EVGA;
    }
    if (description.toLowerCase().includes('gainward')) {
        return Manufacturer.Gainward;
    }
    if (description.toLowerCase().includes('msi')) {
        return Manufacturer.MSI;
    }
    if (description.toLowerCase().includes('afox')) {
        return Manufacturer.AFOX;
    }


    return Manufacturer.Other;
}

export class GpuService {

    constructor(private browser: Browser, private currencyService: CurrencyService) {
    }

    async getGpus(): Promise<Gpu[]> {
        const [nicehash, whattomine] = await Promise.all([this.getNiceHashGpus(), this.getWhattomineGpus()]);
        nicehash.forEach(gpu => {
            const other = whattomine.find(x => x.model.toLowerCase() === gpu.model.toLowerCase());
            if (other) {
                gpu.revenues.push(...other.revenues);
                whattomine.splice(whattomine.indexOf(other), 1);
            }
        });

        return nicehash.concat(whattomine);
    }

    async getWhattomineGpus(): Promise<Gpu[]> {

        let page = await this.browser.newPage();

        try {

            await page.goto('https://whattomine.com/gpus');
            const tableLines = await page.mainFrame().$x('//table/tbody//tr');
            const gpus: Gpu[] = [];

            for (const tableLine of tableLines) {
                const columns = await tableLine.$x('.//td');

                const name = (await columns[0].$eval('a', el => el.textContent)).replace(new RegExp('\n', 'g'), '');
                let brand = Brand.Other;

                if (name.toLowerCase().includes('amd') || name.toLowerCase().includes('radeon')) {
                    brand = Brand.AMD;
                } else if (name.toLowerCase().includes('nvidia')) {
                    brand = Brand.NVIDIA;
                }

                const powerString = (await columns[2].$eval('div > small', el => el.textContent)).trim().replace(/\D/g, '');
                const profit = await ((await columns[3].getProperty('textContent'))).jsonValue() as string;

                let gpu = new Gpu({
                    model: name.replace(/^(AMD|NVIDIA)/, ''),
                    brand,
                    power: parseInt(powerString)
                });

                gpu.revenues = gpu.revenues || [];
                gpu.revenues.push({origin: 'whattomine', value: await this.currencyService.convertUdsToBrl(Number(profit.replace('$', '')))});
                gpus.push(gpu);
            }
            return gpus;
        } finally {
            await page.close();
        }
    }


    async getNiceHashGpus(): Promise<Gpu[]> {
        const result = await axios.get('https://api2.nicehash.com/main/api/v2/public/profcalc/devices');
        let gpuDivices = result.data.devices.filter(x => x.category === 'GPU');

        const gpus: Gpu[] = [];

        for (const gpuDivice of gpuDivices) {
            let brand = Brand.Other;

            if (gpuDivice.name.toLowerCase().includes('amd') || gpuDivice.name.toLowerCase().includes('radeon')) {
                brand = Brand.AMD;
            } else if (gpuDivice.name.toLowerCase().includes('nvidia')) {
                brand = Brand.NVIDIA;
            }

            let gpu = new Gpu({
                model: gpuDivice.name.replace(/^(AMD|NVIDIA) /, ''),
                brand,
                power: gpuDivice.power as number
            });

            gpu.revenues = gpu.revenues || [];
            gpu.revenues.push({origin: 'nicehash', value: await this.currencyService.convertBtcToBrl(gpuDivice.paying)});
            gpus.push(gpu);
        }

        return gpus.sort((a, b) => b.model.length - a.model.length);
    }

}