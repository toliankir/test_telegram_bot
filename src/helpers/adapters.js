function fromToUserAdapter({ id, first_name = null, last_name = null, username = null }, lang = 'ru') {
    return {
        id,
        first_name,
        last_name,
        username,
        lang
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

function addTelegrafDomainToNews(publishedNews) {
    return {
        path: 'https://telegra.ph/' + publishedNews[0].path,
        id: publishedNews[0].id,
        lang: publishedNews[0].lang,
        pid: publishedNews[0].pid
    }
}

module.exports.fromToUserAdapter = fromToUserAdapter;
module.exports.langCodeToMsgKeys = langCodeToMsgKeys;
module.exports.addTelegrafDomainToNews = addTelegrafDomainToNews;
module.exports.getNewsOnLanguage = getNewsOnLanguage;