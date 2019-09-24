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

    async syncNews(newsId, forceAdd = false, languageArr = ['ua', 'ru', 'en']) {
        return new Promise(async (resolve) => {
            const sourceNews = await this.newsService.getNewsById(newsId);
            const newsFromDb = await this.dbService.getNewsByIdAndLang(newsId);
            for (const language of languageArr) {
                const newsDbOnLang = newsFromDb.find((el) => el.lang === language);
                const sourceOnLang = getNewsOnLanguage(sourceNews, language);
                sourceOnLang.title = getNewsTitle(sourceOnLang);
                sourceOnLang.text = addImagesToNewsContent(sourceOnLang.text, sourceNews.images);
                if (newsDbOnLang) {
                    await this.updagePage(newsDbOnLang.path, sourceOnLang.title, htmlStrToNode(sourceOnLang.text));
                    continue;
                }
                if (!newsDbOnLang && forceAdd) {
                    await this.addNews(newsId, sourceOnLang, language);
                }
            }
            setTimeout(() => {
                resolve();
            }, process.env.telegraf_syncDelay);
        });
    }

    async getPage(path) {
        return new Promise((resolve, reject) => {
            request({ url: encodeURI(`https://api.telegra.ph/getPage/${path}`), qs: { return_content: true } }, (err, res, body) => {
                if (err) {
                    console.log(err);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(`Request error. Status code: ${res.statusCode}`);
                    return;
                }
                resolve(JSON.parse(body));
            });
        })
    }

    haveEndTags(news, tagsArr) {
        const endTag = news.result.content[news.result.content.length - 1].tag
        return tagsArr.indexOf(endTag) !== -1;
    }

    removeEndTags(news, tagsArr) {
        while (this.haveEndTags(news, tagsArr)) {
            news.result.content.pop();
        }
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

    async addAllLinksToNews(id, languageArr = ['ru', 'ua', 'en']) {
        return new Promise(async (resolve) => {
            for (const language of languageArr) {
                const newsFromDb = (await this.dbService.getNewsByIdAndLang(id, language))[0];

                const news = await this.getPage(newsFromDb.path);
                this.removeEndTags(news, ['ul', 'br', 'h4']);
                const links = await this.getAllLinksNodes(newsFromDb.id, newsFromDb.lang);
                await this.updagePage(news.result.path, news.result.title, [...news.result.content, ...links]);
            }
            resolve();
        });
    }

    async getPrevLinksStr(id, lang) {
        return new Promise(async (resolve) => {
            const prevNews = await this.dbService.getPrevNews(id, lang);
            let linksStr = '';
            for (const news of prevNews) {
                linksStr += `<li><a href="${addTelegrafDomain(news.path)}">${news.title} (${news.date})</a></li>`
            }
            resolve(linksStr ? `<ul>${linksStr}</ul>` : null);
        });
    }

    async getNextLinksStr(id, lang) {
        return new Promise(async (resolve) => {
            const prevNews = await this.dbService.getNextNews(id, lang);
            let linksStr = '';
            for (const news of prevNews) {
                linksStr += `<li><a href="${addTelegrafDomain(news.path)}">${news.title} (${news.date})</a></li>`
            }
            resolve(linksStr ? `<ul>${linksStr}</ul>` : null);;
        });
    }

    async getAllLinksNodes(id, language) {
        let linksStr = '<br>';
        const prevLinksStr = await this.getPrevLinksStr(id, language);
        const nextLinksStr = await this.getNextLinksStr(id, language);
        if (prevLinksStr) {
            linksStr += `<h4>${lang.prev_links_title[language]}</h4>${prevLinksStr}`;
        }
        if (nextLinksStr) {
            linksStr += `<h4>${lang.next_links_title[language]}</h4>${nextLinksStr}`;
        }
        linksStr += `<ul><li><a href=${addTelegrafDomain(await this.dbService.getConfig(`archive_${language}`))}>${lang.arhive_title[language]}</a></li></ul>`;
        return htmlStrToNode(linksStr);
    }

    async addNews(newsId, sourceNews, language) {
        return new Promise(async (resolve) => {
            const path = await this.createPage(sourceNews.title, htmlStrToNode(sourceNews.text));
            await this.dbService.saveNews(newsId, sourceNews, language, path);
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
                const pagePath = await this.createPage(lang.arhive_title[langKey], htmlStrToNode(news[langKey]));
                await this.dbService.setConfig(`archive_${langKey}`, pagePath);
            }
            resolve();
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
                    return;
                }
                if (res.statusCode !== 200) {
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

function addImagesToNewsContent(content, imagesArr) {
    let result = content;
    if (imagesArr && imagesArr[0]) {
        result = `<img src="${process.env.news_api_imageDomainPrefix}${imagesArr[0]}">` + result;
        for (let imageIndex = 1; imageIndex < imagesArr.length; imageIndex++) {
            result += `<img src="${process.env.news_api_imageDomainPrefix}${imagesArr[imageIndex]}">`;
        }
    }
    return result;
}

function getNewsTitle(newsSource) {
    return `${newsSource.title} (${newsSource.date})`;
}