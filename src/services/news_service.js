require('dotenv').config();
const request = require('request');
const querystring = require('querystring');
const { langCodeToMsgKeys } = require('../helpers/adapters');

class NewsService {
    constructor(apiUrl = process.env.NEWS_API_URL ? process.env.NEWS_API_URL : 'https://back.programming.kr.ua/api/news') {
        this.apiUrl = apiUrl;
        this.newsCount = 0;
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
                reject(err);
            }
            this.newsCount = respJson.data.newsCount;
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
                    reject(err);
                }
                if (res.statusCode !== 200) {
                    reject(`New init request. Respose Status code:${res.statusCode}`);
                }
                resolve(JSON.parse(body));
            });
        });
    }
}

module.exports.NewsService = NewsService;