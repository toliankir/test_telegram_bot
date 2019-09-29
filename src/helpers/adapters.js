require('dotenv').config();

function fromToUserAdapter({ id, first_name = null, last_name = null, username = null }) {
    return {
        id,
        first_name,
        last_name,
        username,
        lang: 'ru',
        active: true,
        last_msg: -1
    }
}

function langCodeToMsgKeys(lang) {
    switch (lang) {
        case 'en':
            return {
                title: 'title_en',
                text: 'text_en'
            }
        case 'ru':
            return {
                title: 'title_ru',
                text: 'text_ru'
            }
        case 'ua':
            return {
                title: 'title_ua',
                text: 'text_ua'
            }
        default:
            return {
                title: 'title_en',
                text: 'text_en'
            }
    }
}

function getNewsOnLanguage(news, lang) {
    const keys = langCodeToMsgKeys(lang);
    return {
        title: news[keys.title],
        text: news[keys.text],
        date: news.date
    }
}
function addTelegrafDomain(link) {
    return process.env.telegraf_domainPrefix + link;
}

function addTelegrafDomainToNews(publishedNews) {
    publishedNews.path = addTelegrafDomain(publishedNews.path);
    return publishedNews;
}

module.exports.fromToUserAdapter = fromToUserAdapter;
module.exports.langCodeToMsgKeys = langCodeToMsgKeys;
module.exports.addTelegrafDomainToNews = addTelegrafDomainToNews;
module.exports.getNewsOnLanguage = getNewsOnLanguage;
module.exports.addTelegrafDomain = addTelegrafDomain;