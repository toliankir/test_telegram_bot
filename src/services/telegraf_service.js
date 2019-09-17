require("dotenv").config();
const request = require('request');
const querystring = require('querystring');
const { JSDOM } = require('jsdom');
const lang = require('../../lang/lang.json');

const { getNewsOnLanguage, addTelegrafDomainToNews } = require('../helpers/adapters');
class TelegrafService {
    constructor(dbService, newsService) {
        this.dbService = dbService;
        this.newsService = newsService;
        this.accountToken = process.env.telegraf_accountToken;
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

    async createPage(title, htmlStr) {
        return new Promise((resolve, reject) => {
            const form = {
                access_token: this.accountToken,
                title: title,
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
                resolve(jsonData.result.path);
            });
        });
    }

    async addNews(newsId, language, news, images) {
        return new Promise(async (resolve) => {
            let htmlStr = news.text;
            if (images && images[0]) {
                htmlStr = `<img src="${process.env.news_api_imageDomainPrefix}${images[0]}">` + htmlStr;
                for (let imageIndex = 1; imageIndex < images.length; imageIndex++) {
                    htmlStr += `<img src="${process.env.news_api_imageDomainPrefix}${images[imageIndex]}">`;
                }
            }

            const path = await this.createPage(news.title, htmlStr);

            await this.dbService.saveNews({
                id: newsId,
                path,
                lang: language,
                news
            });
            resolve();
        });
    }

    updateArchive() {
        return Promise(async (resolve) => {
            const news = {
                'ru': '<ul>',
                'ua': '<ul>',
                'en': '<ul>'
            };
            (await this.dbService.getAllNewsByLangQuery()).forEach(el => {
                const data = addTelegrafDomainToNews(el.data());
                news[data.lang] += `<li><a href="${data.path}">${data.title} (${data.date})</a></li>`;
            });

            for (const langKey in news) {
                news[langKey] += '</ul>';
                const pagePath = await this.createPage(lang.arhive_title[langKey], news[langKey]);
                await this.dbService.setConfig(`archive_${langKey}`, pagePath);
            }
            resolve();
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