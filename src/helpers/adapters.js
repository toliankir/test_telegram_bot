function fromToUserAdapter({ id, first_name, last_name, username }, lang = null) {
    return {
        id,
        first_name,
        last_name,
        username: username ? username : null,
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

module.exports.fromToUserAdapter = fromToUserAdapter;
module.exports.langCodeToMsgKeys = langCodeToMsgKeys;