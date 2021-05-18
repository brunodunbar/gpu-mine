const Big = require('big.js');
const axios = require('axios');

export interface CurrencyConversion {
    fromCurrency: string;
    toCurrency: string;
    exchangeRate: string;
}

export class CurrencyService {

    private conversions: CurrencyConversion[];

    async getConversions(): Promise<CurrencyConversion[]> {
        if (this.conversions) {
            return this.conversions;
        }

        const result = await axios.get('https://api2.nicehash.com/main/api/v2/exchangeRate/list');
        this.conversions = result.data.list;
        return this.conversions;
    }

    async convertBtcToUsd(value: number): Promise<number> {
        const conversions = await this.getConversions();

        const conversion = conversions.find(x => x.fromCurrency === 'BTC' && x.toCurrency === 'USD');
        if (!conversion) {
            throw new Error('Conversão de BTC para USD não encontrada');
        }

        const exchangeRate = Big(conversion.exchangeRate);
        return Number(Big(value || 0).mul(exchangeRate).toFixed(2));
    }

    async convertBtcToBrl(value: number): Promise<number> {
        return this.convertUdsToBrl(await this.convertBtcToUsd(value));
    }

    async convertUdsToBrl(value: number): Promise<number> {
        const conversions = await this.getConversions();
        const conversion = conversions.find(x => x.fromCurrency === 'USD' && x.toCurrency === 'BRL');
        if (!conversion) {
            throw new Error('Conversão de USD para BRL não encontrada');
        }

        const exchangeRate = Big(conversion.exchangeRate);
        return Number(Big(value).mul(exchangeRate).toFixed(2));
    }

}