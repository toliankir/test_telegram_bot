const Telegraf = require('telegraf');
const session = require('telegraf/session');
const { fromToUserAdapter } = require('./helpers/adapters');
const { DBService } = require('./services/db_service');
const { NewsService } = require('./services/news_service');
const { TelegrafService } = require('./services/telegraf_service');
const lang = require('../lang/lang.json');
const { addTelegrafDomainToNews, getNewsOnLanguage } = require('./helpers/adapters')
// const bot = new Telegraf('602060641:AAG0Z5SA5nqUDGrvm---rv6ZSJCGksZm8aM'); // test bot
const bot = new Telegraf('729034691:AAG9dTyKIrqKSIYewg853iG4J1tGLIj5P3Q'); //public bot

bot.use(session());

const dbService = new DBService();
const newsService = new NewsService();

dbService.init();
newsService.initNews();
const telegrafService = new TelegrafService(dbService, newsService);

const testMenu = Telegraf.Extra
    .markdown()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('UKR', 'ua'),
        m.callbackButton('RUS', 'ru'),
        m.callbackButton('ENG', 'en')
    ], { columns: 3 }))

bot.start((ctx) => {
    ctx.reply('Welcome', testMenu);
    dbService.saveUser(fromToUserAdapter(ctx.from));
});

bot.action('ru', async (ctx) => {
    dbService.saveUser(fromToUserAdapter(ctx.from, ctx.match));
    ctx.session.langCode = ctx.match;
    ctx.editMessageText(lang.welcome_msg[ctx.match]);
});
bot.action('ua', async (ctx) => {
    dbService.saveUser(fromToUserAdapter(ctx.from, ctx.match));
    ctx.session.langCode = ctx.match;
    ctx.editMessageText(lang.welcome_msg[ctx.match]);
});
bot.action('en', async (ctx) => {
    dbService.saveUser(fromToUserAdapter(ctx.from, ctx.match));
    ctx.session.langCode = ctx.match;
    ctx.editMessageText(lang.welcome_msg[ctx.match]);
});

bot.hears(/^get\d+/, async (ctx) => {
    if (!ctx.session.langCode) {
        const user = await dbService.getUserById(ctx.from.id);
        ctx.session.langCode = user[0].data.lang;
    }
    const requestedNewsId = parseInt(ctx.match[0].match(/^get(\d+)/)[1]);
    let publishNews = await dbService.getNewsByIdAndLang(requestedNewsId, ctx.session.langCode);
    if (!publishNews[0]) {
        try {
            await telegrafService.publishNews(requestedNewsId);
        } catch (err) {
            ctx.reply(err);
            return;
        }
        publishNews = await dbService.getNewsByIdAndLang(requestedNewsId, ctx.session.langCode);
        if (!publishNews[0]) {
            ctx.reply(`Error news #${requestedNewsId} loading.`);
            return;
        }
    }
    ctx.reply(addTelegrafDomainToNews(publishNews).path);
});


bot.launch();



