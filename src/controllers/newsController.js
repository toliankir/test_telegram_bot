require("dotenv").config();
const { JSDOM } = require('jsdom');
const lang = require('../../lang/lang.json');
const { getNewsOnLanguage, addTelegrafDomainToNews, addTelegrafDomain } = require('../helpers/adapters');
const { logger } = require('../services/logger');
class NewsController {
    constructor(newsService, dbService, telegrafService) {
        this.newsService = newsService;
        this.dbService = dbService;
        this.telegrafService = telegrafService;
    }

    async syncAllNewsLinks() {
        await this.newsService.initNews();
        const sourceNewsCount = this.newsService.getNewsCount();
        for (let newsId = 1; newsId <= sourceNewsCount; newsId++) {
            await this.syncNews(newsId, true);
        }
        for (let newsId = 1; newsId <= sourceNewsCount; newsId++) {
            await this.addAllLinksToNews(newsId);
        }
        this.updateArchive();
    }

    async syncNews(newsId, forceAdd = false, languageArr = ['ua', 'ru', 'en']) {
        return new Promise(async (resolve) => {
            const sourceNews = await this.newsService.getNewsById(newsId);
            const newsFromDb = await this.dbService.getNewsByIdAndLang(newsId);
            for (const language of languageArr) {
                const newsDbOnLang = newsFromDb.find((el) => el.lang === language);
                const sourceOnLang = getNewsOnLanguage(sourceNews, language);
                sourceOnLang.title = getNewsTitle(sourceOnLang);
                // const media = [...getVideosHtmlStrArr([sourceNews.video]), ...getImagesHtmlStrArr(sourceNews.images)]
                const media = getImagesHtmlStrArr(sourceNews.images);
                sourceOnLang.text = addMediaToNewsContent(sourceOnLang.text, media);
                if (newsDbOnLang) {
                    await this.telegrafService.updagePage(newsDbOnLang.path, sourceOnLang.title, htmlStrToNode(sourceOnLang.text));
                    logger.log({
                        level: 'verbose',
                        message: `NewsController: Update news #${newsId}/${language}.`
                    });
                    continue;
                }
                if (!newsDbOnLang && forceAdd) {
                    await this.addNews(newsId, sourceOnLang, language);
                    logger.log({
                        level: 'verbose',
                        message: `NewsController: News #${newsId}/${language} added to DB.`
                    });
                }
            }
            setTimeout(() => {
                resolve();
            }, process.env.telegraf_syncDelay);
        });
    }

    async syncNewNews() {
        const lastNewsInDb = await this.dbService.getLastNewsId();
        await this.newsService.initNews();
        const lastNewsInSource = this.newsService.getNewsCount();
        if (lastNewsInSource === lastNewsInDb) {
            logger.log({
                level: 'info',
                message: `NewsController: Nothing to synchronize Last db news id #${lastNewsInDb}, la api news id #${lastNewsInSource}.`
            });
            return;
        }
        for (let newsId = lastNewsInDb + 1; newsId <= lastNewsInSource; newsId++) {
            await this.syncNews(newsId, true);
        }
        logger.log({
            level: 'info',
            message: `NewsController: Add news from #${lastNewsInDb} to #${lastNewsInSource}.`
        });
        const firstNewsForLinks = lastNewsInDb - process.env.news_dependence_count + 1;
        for (let newsId = firstNewsForLinks; newsId <= lastNewsInSource; newsId++) {
            await this.addAllLinksToNews(newsId);
        }
        logger.log({
            level: 'info',
            message: `NewsController: Add links to news from #${firstNewsForLinks} to #${lastNewsInSource}.`
        });
        this.updateArchive();
    }

    async addNews(newsId, sourceNews, language) {
        return new Promise(async (resolve) => {
            const path = await this.telegrafService.createPage(sourceNews.title, htmlStrToNode(sourceNews.text));
            await this.dbService.saveNews(newsId, sourceNews, language, path);
            resolve();
        });
    }

    async addAllLinksToNews(id, languageArr = ['ru', 'ua', 'en']) {
        return new Promise(async (resolve) => {
            for (const language of languageArr) {
                const newsFromDb = (await this.dbService.getNewsByIdAndLang(id, language))[0];
                const news = await this.telegrafService.getPage(newsFromDb.path);
                removeEndTags(news, ['ul', 'br', 'h4']);
                const links = await this.getAllLinksNodes(newsFromDb.id, newsFromDb.lang);
                await this.telegrafService.updagePage(news.result.path, news.result.title, [...news.result.content, ...links]);
            }
            logger.log({
                level: 'verbose',
                message: `NewsController: Add links to news #${id}/${languageArr.join(' ')}.`
            });
            resolve();
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
        linksStr += `<h4><a href=${addTelegrafDomain(await this.dbService.getConfig(`archive_${language}`))}>${lang.arhive_title[language]}</a></h4>`;
        return htmlStrToNode(linksStr);
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
                const pagePath = await this.telegrafService.createPage(lang.arhive_title[langKey], htmlStrToNode(news[langKey]));
                await this.dbService.setConfig(`archive_${langKey}`, pagePath);
            }
            resolve();
        });
    }
}

module.exports.NewsController = NewsController;

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

function getImagesHtmlStrArr(imagesArr) {
    if (!imagesArr || !imagesArr[0]) {
        return [];
    }
    return imagesArr.map(el => `<img src="${process.env.news_api_imageDomainPrefix}${el}">`)
}

function getVideosHtmlStrArr(videosArr) {
    if (!videosArr || !videosArr[0]) {
        return [];
    }
    return videosArr.map(el => `<figure><iframe src="/embed/youtube?url=${el}" frameborder="0" allowfullscreen></iframe><figcaption>${el}</figcaption></figure>`)
}

function addMediaToNewsContent(content, mediaArr) {
    let result = content;
    if (mediaArr && mediaArr[0]) {
        result = mediaArr[0] + result;
        for (let mediaIndex = 1; mediaIndex < mediaArr.length; mediaIndex++) {
            result += mediaArr[mediaIndex];
        }
    }
    return result;
}

function getNewsTitle(newsSource) {
    return `${newsSource.title} (${newsSource.date})`;
}

function haveEndTags(news, tagsArr) {
    const endTag = news.result.content[news.result.content.length - 1].tag
    return tagsArr.indexOf(endTag) !== -1;
}

function removeEndTags(news, tagsArr) {
    while (haveEndTags(news, tagsArr)) {
        news.result.content.pop();
    }
}
