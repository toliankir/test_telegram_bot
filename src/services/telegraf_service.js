require("dotenv").config();
const request = require('request');
const querystring = require('querystring');

class TelegrafService {
    constructor(dbService, newsService) {
        this.dbService = dbService;
        this.newsService = newsService;
        this.accountToken = process.env.telegraf_accountToken;
    }

    async getPage(path) {
        return new Promise((resolve, reject) => {
            request({ url: encodeURI(`https://api.telegra.ph/getPage/${path}`), qs: { return_content: true } }, (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode !== 200) {
                    return reject(`Telegraf api get page request error. Status code: ${res.statusCode}`);
                }
                resolve(JSON.parse(body));
            });
        })
    }

    async createPage(title, content) {
        return new Promise((resolve, reject) => {
            const form = {
                access_token: this.accountToken,
                title: title,
                content: JSON.stringify(content),
                return_content: true
            };
            const formData = querystring.stringify(form);
            const contentLength = formData.length;

            request({
                headers: {
                    'Content-Length': contentLength,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                uri: 'https://api.telegra.ph/createPage',
                body: formData,
                method: 'POST'
            }, async (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode !== 200) {
                    return reject(`Telegraf api create page request error. Status code: ${res.statusCode}`);
                }
                const jsonData = JSON.parse(body);
                if (!jsonData.ok) {
                    return reject(`Telegraf response error: ${jsonData.error}`);
                }
                resolve(jsonData.result.path);
            });
        });
    }

    async updagePage(path, title, content) {
        return new Promise((resolve, reject) => {
            const form = {
                access_token: this.accountToken,
                title: title,
                content: JSON.stringify(content),
                return_content: false
            };

            const formData = querystring.stringify(form);
            const contentLength = formData.length;

            request({
                headers: {
                    'Content-Length': contentLength,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                uri: encodeURI(`https://api.telegra.ph/editPage/${path}`),
                body: formData,
                method: 'POST'
            }, async (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode !== 200) {
                    return reject(`Telegraf api update page request error. Status code: ${res.statusCode}`);
                }
                const jsonData = JSON.parse(body);
                if (!jsonData.ok) {
                    return reject(`Telegraf response error: ${jsonData.error}`);
                }
                resolve(jsonData.result.path);
            });
        });
    }
}

module.exports.TelegrafService = TelegrafService;
