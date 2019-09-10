const request = require('request');
const querystring = require('querystring');
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
            console.log(news.text);
            var form = {
                access_token: this.accountToken,
                title: news.title,
                content: JSON.stringify([{ "tag": "p", "children": [news.text] }, { "tag": 'b', "children": ['testB'] }]),
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