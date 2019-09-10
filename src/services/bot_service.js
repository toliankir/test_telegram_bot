const Telegraf = require('telegraf');
const session = require('telegraf/session');

class BotService {

    constructor() {

    }

    botInit() {
        this.bot = new Telegraf('602060641:AAG0Z5SA5nqUDGrvm---rv6ZSJCGksZm8aM');
        this.bot.use(session());
        addBotActions();
    }

    botLaunch() {
        this.bot.launch();
    }
}

module.exports.BotService = BotService;

function addBotActions(bot) {
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
}
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


bot.hears('get', async (ctx) => {
    if (!ctx.session.langCode) {
        const user = await dbService.getUserById(ctx.from.id);
        ctx.session.langCode = user[0].data.lang;
    }

    for (let i = newsService.getLastNewsId(); i > newsService.getLastNewsId() - 5; i--) {
        await ctx.reply(newsService.getNewsById(i, ctx.session.langCode).title);
    }
});


bot.launch();