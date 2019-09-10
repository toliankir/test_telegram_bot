const request = require('request');
const querystring = require('querystring');
const { JSDOM } = require('jsdom');
class TelegrafService {
    constructor(dbService, newsService) {
        this.dbService = dbService;
        this.newsService = newsService;
        this.accountToken = 'ff74fc07b20e0177efb88b2e35de06b3b4ef79650a24c6db130990f939b9';
    }

    publishNews(newsId, languages = ['ua', 'ru', 'en']) {
        for (const language of languages) {
            this.publishNewsWithLang(newsId, language);
        }
    }

    async publishNewsWithLang(newsId, language) {
        return new Promise(async (resolve) => {
            const news = await this.newsService.getNewsById(newsId, language);
            const publishedNews = await this.dbService.getNewsByIdAndLang(newsId, language);
            console.log(publishedNews);
            const dom = new JSDOM(news.text);
            const domFragment = dom.window.document.querySelector('*');

            var form = {
                access_token: this.accountToken,
                title: news.title,
                content: JSON.stringify(domToNode(domFragment).children),
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
            }, (err, res, body) => {
                if ((err)
                    || (res.statusCode !== 200)) {
                    resolve(false);
                }
                const jsonData = JSON.parse(body);
                if (!jsonData.ok) {
                    resolve(false);
                }
                this.dbService.saveNews({
                    pid: newsId,
                    path: jsonData.result.path,
                    lang: language
                });
                resolve(true);
            });
        });


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