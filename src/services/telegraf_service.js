const request = require('request');
const querystring = require('querystring');
const { JSDOM } = require('jsdom');

const { getNewsOnLanguage } = require('../helpers/adapters');
class TelegrafService {
    constructor(dbService, newsService) {
        this.dbService = dbService;
        this.newsService = newsService;
        this.accountToken = 'ff74fc07b20e0177efb88b2e35de06b3b4ef79650a24c6db130990f939b9';
        this.imageDomain = '';
    }

    async publishNews(newsId, languages = ['ua', 'ru', 'en']) {
        return new Promise(async (resolve, reject) => {
            const news = await this.newsService.getNewsById(newsId);
            if (!news) {
                reject('News dont found!');
            }
            const images = news.images;

            for (const language of languages) {
                const newsOnLang = getNewsOnLanguage(news, language);
                await this.publishNewsWithLang(newsId, language, newsOnLang, images);
            }
            resolve();
        });

    }
    async publishNewsWithLang(newsId, language, news, images) {
        return new Promise(async (resolve, reject) => {
            const publishedNews = await this.dbService.getNewsByIdAndLang(newsId, language);
            if (publishedNews[0]) {
                resolve();
            }
            await this.addNews(newsId, language, news, images);
            resolve();
            // if () {
            //     resolve();
            //     return;
            // }
            // reject(`Can not publish news: ${newsId} ${language} - ${news.title}`);
        });
    }



    async addNews(newsId, language, news, images) {
        return new Promise(resolve => {
            const dom = new JSDOM(`<img src="https://back.programming.kr.ua/storage/img/news/${images[0]}">` + news.text);
            const content = JSON.stringify(domToNode(dom.window.document.querySelector('*')).children);
            var form = {
                access_token: this.accountToken,
                title: news.title,
                content,
                return_content: true
            };
            var formData = querystring.stringify(form);
            var contentLength = formData.length;

            request({
                headers: {
                    'Content-Length': contentLength,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                uri: 'https://api.telegra.ph/createPage',
                body: formData,
                method: 'POST'
            }, async (err, res, body) => {
                if ((err)
                    || (res.statusCode !== 200)) {
                    resolve(false);
                }
                const jsonData = JSON.parse(body);
                if (!jsonData.ok) {
                    resolve(false);
                }
                this.dbService.saveNews({
                    id: newsId,
                    path: jsonData.result.path,
                    lang: language
                });
                resolve(true);
            });
        });
    }

    updateNews() {

    }
}

module.exports.TelegrafService = TelegrafService;

function domToNode(domNode) {
    if (domNode.nodeType == domNode.TEXT_NODE) {
        return domNode.data;
    }
    if (domNode.nodeType != domNode.ELEMENT_NODE) {
        return false;
    }
    var nodeElement = {};
    nodeElement.tag = domNode.tagName.toLowerCase();
    for (var i = 0; i < domNode.attributes.length; i++) {
        var attr = domNode.attributes[i];
        if (attr.name == 'href' || attr.name == 'src') {
            if (!nodeElement.attrs) {
                nodeElement.attrs = {};
            }
            nodeElement.attrs[attr.name] = attr.value;
        }
    }
    if (domNode.childNodes.length > 0) {
        nodeElement.children = [];
        for (var i = 0; i < domNode.childNodes.length; i++) {
            var child = domNode.childNodes[i];
            nodeElement.children.push(domToNode(child));
        }
    }
    return nodeElement;
}