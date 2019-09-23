require("dotenv").config();
const request = require('request');
const querystring = require('querystring');
const { JSDOM } = require('jsdom');
const lang = require('../../lang/lang.json');

const { getNewsOnLanguage, addTelegrafDomainToNews, addTelegrafDomain } = require('../helpers/adapters');
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

    async getPage(path) {
        return new Promise((resolve, reject) => {
            request({ url: `https://api.telegra.ph/getPage/${path}`, qs: { return_content: true } }, (err, res, body) => {
                if ((err)
                    || (res.statusCode !== 200)) {
                    reject(`Request error. Status code: ${res.statusCode}`);
                    return;
                }
                resolve(JSON.parse(body));
            });
        })
    }

    async createPage(title, htmlStr) {
        return new Promise((resolve, reject) => {
            const form = {
                access_token: this.accountToken,
                title: title,
                content: JSON.stringify(htmlStrToNode(htmlStr)),
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

    async addPrevLinksToNews(id, lang) {
        return new Promise(async (resolve) => {
            const currentNews = (await this.dbService.getNewsByIdAndLang(id, lang))[0];
            const currentArticle = await this.getPage(currentNews.path);
            const prevLinksStr = await this.getPrevLinksStr(id, lang)
            const linksNodes = htmlStrToNode(prevLinksStr);
            const newContent = [...currentArticle.result.content, ...linksNodes];

            await this.updateNews(currentNews.path, currentNews.title, newContent)
            resolve();
        });
    }

    async getPrevLinksStr(id, lang) {
        return new Promise(async (resolve) => {
            const prevNews = await this.dbService.getPrevNews(id, lang);

            let linksStr = '<br><ul>';
            for (const news of prevNews) {
                linksStr += `<li><a href="${addTelegrafDomain(news.path)}">${news.title} (${news.date})</a></li>`
            }
            linksStr += '</ul>';

            resolve(linksStr);
        });
    }

    async addNews(newsId, language, news, images) {
        return new Promise(async (resolve, reject) => {
            let htmlStr = news.text;
            if (images && images[0]) {
                htmlStr = `<img src="${process.env.news_api_imageDomainPrefix}${images[0]}">` + htmlStr;
                for (let imageIndex = 1; imageIndex < images.length; imageIndex++) {
                    htmlStr += `<img src="${process.env.news_api_imageDomainPrefix}${images[imageIndex]}">`;
                }
            }
            let path;
            htmlStr += await this.getPrevLinksStr(newsId, language);
            const title = `${news.title} (${news.date})`;
            const newsFromDB = (await this.dbService.getNewsByIdAndLang(newsId, language))[0];

            if (newsFromDB && newsFromDB.path) {
                this.updateNews(newsFromDB.path, title, htmlStrToNode(htmlStr));
                resolve();
                return;
            }

            try {
                path = await this.createPage(title, htmlStr);
            } catch (err) {
                reject(err);
                return;
            }

            await this.dbService.saveNews({
                id: newsId,
                path,
                lang: language,
                news
            });
            resolve();
        });
    }

    async updateArchive() {
        return new Promise(async (resolve) => {
            await this.newsService.initNews();
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

    async updateNews(path, title, content) {
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
                uri: `https://api.telegra.ph/editPage/${path}`,
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
}

module.exports.TelegrafService = TelegrafService;

function htmlStrToNode(htmlStr) {
    const dom = new JSDOM(htmlStr);
    return domToNode(dom.window.document.querySelector('body')).children;
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