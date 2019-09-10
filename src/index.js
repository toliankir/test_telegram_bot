const Telegraf = require('telegraf');
const session = require('telegraf/session');
// const { Markup } = require('telegraf');

const { fromToUserAdapter } = require('./helpers/adapters');
const { DBService } = require('./services/db_service');
const { NewsService } = require('./services/news_service');
const { TelegrafService } = require('./services/telegraf_service');

const lang = require('../lang/lang.json');

const bot = new Telegraf('602060641:AAG0Z5SA5nqUDGrvm---rv6ZSJCGksZm8aM');
bot.use(session());

const dbService = new DBService();
const newsService = new NewsService();

dbService.init();
newsService.loadNews();

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

bot.hears('get', async (ctx) => {
    if (!ctx.session.langCode) {
        const user = await dbService.getUserById(ctx.from.id);
        ctx.session.langCode = user[0].data.lang;
    }
    telegrafService.publishNews(45);
// console.log(await dbService.getNewsByIdAndLang(45, 'ua'));
    // dbService.setConfig('test', 'test2');
    // dbService.setConfig('testData', 'data');

    // for (let i = newsService.getLastNewsId(); i > newsService.getLastNewsId() - 5; i--) {
    //     await ctx.reply(newsService.getNewsById(i, ctx.session.langCode).title);
    // }
});


bot.launch();



