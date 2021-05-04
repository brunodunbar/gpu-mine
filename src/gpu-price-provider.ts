import {Gpu, GpuPrice} from "./gpu";
import {Browser} from "puppeteer";

export interface GpuPriceProvider {
    getGpusPrices(gpus: Gpu[], browser: Browser): Promise<GpuPrice[]>;
}