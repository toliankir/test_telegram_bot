require('dotenv').config();
const request = require('request');
const querystring = require('querystring');
const { langCodeToMsgKeys } = require('../helpers/adapters');

class NewsService {
    constructor(apiUrl = process.env.NEWS_API_URL ? process.env.NEWS_API_URL : 'https://back.programming.kr.ua/api/news') {
        this.apiUrl = apiUrl;
        this.lastNewsId = 0;
        this.newsData = [];
    }

    getNewsById(id, lang) {
        const news = this.newsData.find(el => el.id === id);
        const langKeys = langCodeToMsgKeys(lang);
        return {
            title: news[langKeys.title],
            text: news[langKeys.text]
        }
    }

    getLastNewsId() {
        return this.lastNewsId;
    }

    async loadNews(limit = 0) {
        return new Promise((resolve, reject) => {
            var form = {
                limit
            };
            var formData = querystring.stringify(form);
            var contentLength = formData.length;

            request({
                headers: {
                    'Content-Length': contentLength,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                uri: this.apiUrl,
                body: formData,
                method: 'POST'
            }, (err, res, body) => {
                if ((err)
                    || (res.statusCode !== 200)) {
                    reject(false);
                }
                const { data: { news } } = JSON.parse(body);
                this.lastNewsId = news[0].id > this.lastNewsId ? news[0].id : this.lastNewsId;
                this.newsData = news;
                resolve(true);
            });
        });
    }
}

module.exports.NewsService = NewsService;