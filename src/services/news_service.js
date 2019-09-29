require('dotenv').config();
const request = require('request');
const querystring = require('querystring');
const { logger } = require('../services/logger');
class NewsService {
    constructor() {
        this.apiUrl = process.env.news_api_url;
        this.newsCount = 0;
    }

    getNewsCount() {
        return this.newsCount;
    }

    async getNewsById(id) {
        return new Promise(async (resolve) => {
            const form = {
                limit: (-(id - this.newsCount) < this.newsCount - 10) ? -(id - this.newsCount) : this.newsCount - 10
            };
            let respJson = {};
            try {
                respJson = await this.makeRequest(form);
            } catch (err) {
                reject(err);
            }
            this.newsCount = respJson.data.newsCount;
            const news = respJson.data.news.find(el => el.id === id);
            logger.log({
                level: 'debug',
                message: `NewsService: Get message from source api: #${id}`
            });
            resolve(news);
        });
    }

    async initNews() {
        return new Promise(async (resolve, reject) => {
            const form = {
                limit: 0
            };
            let respJson = {};
            try {
                respJson = await this.makeRequest(form);
            } catch (err) {
                return reject(err);
            }
            this.newsCount = respJson.data.newsCount;

            logger.log({
                level: 'verbose',
                message: `Init news source ${this.apiUrl}. ${this.newsCount} news available.`
            });

            resolve();
        });
    }

    async makeRequest(form) {
        return new Promise((resolve, reject) => {
            const formData = querystring.stringify(form);
            const contentLength = formData.length;
            request({
                headers: {
                    'Content-Length': contentLength,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                uri: this.apiUrl,
                body: formData,
                method: 'POST'
            }, (err, res, body) => {
                if (err) {
                    return reject(err);
                }
                if (res.statusCode !== 200) {
                    return reject(`NewsService request error. Respose Status code:${res.statusCode}`);
                }
                resolve(JSON.parse(body));
            });
        });
    }
}

module.exports.NewsService = NewsService;