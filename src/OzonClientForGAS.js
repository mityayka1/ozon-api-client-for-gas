const TestApiKey = '0296d4f2-70a1-4c09-b507-904fd05567b9';
const TestAccountId = '836';

/**
 * @class ApiClient for connect to Ozon API
 */
class ApiClient {
    /**
     * @constructor if set flag "useTestApi: true" 
     * you can work with Ozon test API witn non-real data and items
     * @param {object} options
     * @param {number} options.accountId
     * @param {string} options.apiKey
     * @param {boolean} [options.useTestApi] 
     */
    constructor({ accountId, apiKey, useTestApi = false }) {
        this._accountId = '';
        this._apiKey = '';
        this._baseUrl = 'http://api-seller.ozon.ru/';
        this.itemWithPrices = itemWithPrices;
        this.itemWithStock = itemWithStock;
        this._build = this._builder(accountId, apiKey, useTestApi);
    }

    /**
     * @private
     * @method _builder()
     * @param {number|string} accountId 
     * @param {string} apiKey 
     * @param {boolean} useTestApi 
     */
    _builder(accountId, apiKey, useTestApi) {
        if (useTestApi) {
            this._accountId = TestAccountId;
            this._apiKey = TestApiKey;
            this._baseUrl = 'http://cb-api.ozonru.me/'
            delete this._build
            return
        }
        if (!(accountId && apiKey)) {
            throw new Error('В конструкторе клиента необходимо указать {useTtestApi: true}' +
                ', либо ключ АПИ и id клиента');
        }
        this._accountId = accountId;
        this._apiKey = apiKey;
        delete this._build;
        return
    }

    /**
     * @private
     * @method _request() for send requests to Ozon API with specified auth keys
     * @param {object} requestOptions 
     */
    _request({
        method = 'GET',
        methodsUrl = '',
        params,
        body,
    }) {
        const url = this._baseUrl + methodsUrl;
        if (params) {
            const paramStr = Object.entries(params)
                .map(v => `${v[0]}=${v[1]}`)
                .join('&');
            url += '?' + paramStr;
        }
        const headers = {
            'Client-Id': this._accountId,
            'Api-Key': this._apiKey,
            'Content-Type': 'application/json'
        };
        let options = {
            method: method,
            headers: headers,
            mutuHttpExceptions: false
        };
        if (body) {
            options.payload = JSON.stringify(body);
        }

        const response = UrlFetchApp.fetch(url, options);

        return JSON.parse(response.getContentText())
    }

    /**
     * @private
     * @method _extractUpdateErrors(response) for extract errors from response by Ozon
     * @param {object} response 
     */
    _extractUpdateErrors(response) {
        let itemsWithErrors = response.result.reduce((errorArr, item, i) => {
            if (item.errors.length) {
                let [err] = item.errors;
                errorArr.push([i + 1, item.offer_id, err.code, err.message, ]);
                return errorArr
            }
            return errorArr
        }, []);
        return itemsWithErrors
    }

    /**
     * @method updatePrices(...itemsWithPrices) updates prices for specified items
     * @param  {...<itemWithPrices>} itemsWithPrices (object instance of 'itemWithPrices')
     * @returns {object} object with update status and errors example: {updated: ok, errors: [[i, offer_id, err.code, err.msg]]}
     * @example 
     * const Ozon = new ApiClient({accountId: '000', apiKey: 'xxxxx'});
     * const itemForUpdatePrices = new Ozon.itemWithPrices(["offer_id", 10, 5, 3]);
     * Ozon.updatePrices(itemForUpdatePrices); // ==> {updated:'ok'}
     */

    updatePrices(...itemsWithPrices) {
        if (Array.isArray(itemsWithPrices[0])) {
            itemsWithPrices = itemsWithPrices[0]
        }

        const response = this._request({
            method: 'POST',
            methodsUrl: 'v1/product/import/prices',
            body: {
                prices: itemsWithPrices
            }
        });

        let itemsWithErrors = this._extractUpdateErrors(response);

        let result = {
            updated: 'ok',
        };
        if (itemsWithErrors.length) {
            result.errors = itemsWithErrors;
        }

        return result
    }

    /**
     * @method updateStock(...itemsWithStock) updates stocks for specified items
     * @param  {...<itemWithStock>} itemsWithStock (object instance of 'itemWithStock')
     * @returns {object} object with update status and errors example: {updated: ok, errors: [[i, offer_id, err.code, err.msg]]}
     * @example 
     * const Ozon = new ApiClient({ accountId: '000', apiKey: 'xxxxx' });
     * const itemForUpdateStock = new Ozon.itemWithStock(["offer_id", 5]);
     * Ozon.updatePrices(itemForUpdatePrices); // ==> {updated:'ok'}}
     */
    updateStock(...itemsWithStock) {
        if (Array.isArray(itemsWithStock[0])) {
            itemsWithStock = itemsWithStock[0]
        }

        const response = this._request({
            method: 'POST',
            methodsUrl: 'v1/product/import/stocks',
            body: {
                stocks: itemsWithStock,
            }
        });

        let itemsWithErrors = this._extractUpdateErrors(response);

        let result = {
            updated: 'ok',
        };
        if (itemsWithErrors.length) {
            result.errors = itemsWithErrors;
        }

        return result
    }

    /**
     * @method getItemList(filterOptions) make request for get list of items in account
     * with specified filter options 
     * @param {object} filterOptions see documentation about this options on 'http://api-seller.ozon.ru/'
     * @returns {array<items>} array with filtered items
     * @example
     * const Ozon = new ApiClient({ accountId: '000', apiKey: 'xxxxx' });
     * const filteredItems = Ozon.getItemList({visibility: 'ALL'});
     * console.log(filteredItems); // array with all visibility items in account
     */
    getItemList(filterOptions) {
        if (!filterOptions) {
            throw new Error('Не указан аргумент filterOptions');
        }

        const response = this._request({
            method: 'POST',
            methodsUrl: 'v1/product/list',
            body: filterOptions,
        });
        return response.result.items
    }

    /**
     * @method getItemsPrices({ page, page_size })
     * @param {object} options
     * @param {number} options.page number of page
     * @param {number} options.page_size size of page
     * @returns {array<[items]>} array of arrays with items [[offer_id, price, old_price, premium_price]]
     * @example
     * const Ozon = new ApiClient({ accountId: '000', apiKey: 'xxxxx' });
     * const arrayOfItemsWithPrices = Ozon.getItemsPrices({page: 1, page_size: 100});
     * console.log(arrayOfItemsWithPrices); // array with items [[offer_id, price, old_price, premium_price]]
     */
    getItemsPrices({ page, page_size }) {
        const response = this._request({
            method: 'POST',
            methodsUrl: 'v1/product/info/prices',
            body: {
                page: page,
                page_size: page_size,
            },
        })

        const result = response.result.items.map(item => {
            return [
                item.offer_id,
                item.price.price,
                item.price.old_price,
                item.price.premium_price,
            ]
        });
        return result
    }
}

/**
 * @class itemWithPrices for send in update requests
 */
class itemWithPrices {
    /**
     * @constructor
     * @param {array} itemData [offer_id, price, old_price, premium_price] 
     */
    constructor([offer_id, price, old_price, premium_price]) {
        this.offer_id = String(offer_id);
        this.price = String(price);
        this.old_price = String(old_price);
        this.premium_price = String(premium_price);
    }
}

/**
 * @class itemWithStock for send in update requests
 */
class itemWithStock {
    /**
     * @constructor
     * @param {array<string,number>} array ["offer_id", stock]
     */
    constructor([offer_id, stock]) {
        this.offer_id = offer_id;
        this.stock = stock;
    }
}


/**
 * @function ApiClient for call a constuctor
 * @param {object} options
 * @param {number} options.accountId
 * @param {string} options.apiKey
 * @param {boolean} [options.useTestApi]
 */
function apiClient({ accountId, apiKey, useTestApi = false }) {
    return new ApiClient({ accountId, apiKey, useTestApi })
};