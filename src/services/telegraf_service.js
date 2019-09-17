const request = require('request');
const querystring = require('querystring');
const { JSDOM } = require('jsdom');

const { getNewsOnLanguage } = require('../helpers/adapters');
class TelegrafService {
    constructor(dbService, newsService) {
        this.dbService = dbService;
        this.newsService = newsService;
        this.accountToken = process.env.telegraf_accountToken;
        this.imageDomain = process.env.telegraf_imageDomain;
    }

    async publishNews(newsId, languages = ['ua', 'ru', 'en']) {
        return new Promise(async (resolve, reject) => {
            const news = await this.newsService.getNewsById(newsId);
            if (!news) {
                reject(`News #${newsId} don't found!`);
                return;
            }
            const images = news.images;

            for (const language of languages) {
                const newsOnLang = getNewsOnLanguage(news, language);
                try {
                    await this.publishNewsWithLang(newsId, language, newsOnLang, images);
                } catch (err) {
                    reject(err);
                }
            }
            resolve();
        });

    }
    async publishNewsWithLang(newsId, language, news, images) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.addNews(newsId, language, news, images);
            } catch (err) {
                reject(err);
            }
            resolve();
        });
    }

    async addNews(newsId, language, news, images) {
        return new Promise((resolve, reject) => {
            let htmlStr = news.text;
            if (images && images[0]) {
                htmlStr = `<img src="${this.imageDomain}${images[0]}">` + htmlStr;
                for (let imageIndex = 1; imageIndex < images.length; imageIndex++) {
                    htmlStr += `<img src="${this.imageDomain}${images[imageIndex]}">`;
                }
            }

            const form = {
                access_token: this.accountToken,
                title: news.title,
                content: htmlStrToNode(htmlStr),
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
                if ((err)
                    || (res.statusCode !== 200)) {
                    reject(`Request error. Status code: ${res.statusCode}`);
                    return;
                }
                const jsonData = JSON.parse(body);
                if (!jsonData.ok) {
                    reject(`Telegraf error: ${jsonData.error}`);
                    return;
                }
                await this.dbService.saveNews({
                    id: newsId,
                    path: jsonData.result.path,
                    lang: language,
                    news
                });
                resolve();
            });
        });
    }

    updateNews() {

    }
}

module.exports.TelegrafService = TelegrafService;

function htmlStrToNode(htmlStr) {
    const dom = new JSDOM(htmlStr);
    return JSON.stringify(domToNode(dom.window.document.querySelector('*')).children);
}

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