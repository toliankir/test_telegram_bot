const Telegraf = require('telegraf');
const session = require('telegraf/session');
const { Markup } = require('telegraf');

const { fromToUserAdapter } = require('./helpers/adapters');
const { DBService } = require('./services/db_service');
const { NewsService } = require('./services/news_service');

const lang = require('../lang/lang.json');

const bot = new Telegraf('602060641:AAG0Z5SA5nqUDGrvm---rv6ZSJCGksZm8aM');
bot.use(session());

const dbService = new DBService();
dbService.init();
dbService.getUserById(321375418);
const newsService = new NewsService();
newsService.loadNews();
console.log(newsService.getLastNewsId());
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
// bot.help((ctx) => ctx.reply('Send me a sticker'));
// bot.on('sticker', (ctx) => ctx.reply('👍'));
// bot.hears('test', (ctx) => {
//     console.log(ctx.update.message);
// });

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
        ctx.session.langCode = user[0].id;
    }
    ctx.reply(newsService.getNewsById(newsService.getLastNewsId(), ctx.session.langCode).title);
});

bot.on('photo', ({ message, replyWithPhoto }) => {
    const fId = message.photo[0].file_id;
    console.log(fId);
    test(fId);

    // replyWithPhoto(message.photo.pop().file_id, {caption: 'Your caption here'})
});

async function test(id) {
    console.log(await bot.telegram.getFileLink(id));
}

bot.launch();



