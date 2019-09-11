const Telegraf = require('telegraf');
const session = require('telegraf/session');
const { fromToUserAdapter, addTelegrafDomainToNews } = require('../helpers/adapters');
const lang = require('../../lang/lang.json');
class BotService {

    constructor(token, dbService, telegrafService) {
        this.token = token;
        this.dbService = dbService;
        this.telegrafService = telegrafService;
    }

    addMessaageHandlers() {
        this.bot.hears(/^get\d+/, async (ctx) => {
            if (!ctx.session.langCode) {
                const user = await this.dbService.getUserById(ctx.from.id);
                ctx.session.langCode = user[0].data.lang;
            }
            const requestedNewsId = parseInt(ctx.match[0].match(/^get(\d+)/)[1]);
            let publishNews = await this.dbService.getNewsByIdAndLang(requestedNewsId, ctx.session.langCode);
            if (!publishNews[0]) {
                try {
                    await this.telegrafService.publishNews(requestedNewsId);
                } catch (err) {
                    ctx.reply(err);
                    return;
                }
                publishNews = await this.dbService.getNewsByIdAndLang(requestedNewsId, ctx.session.langCode);
                if (!publishNews[0]) {
                    ctx.reply(`Error news #${requestedNewsId} loading.`);
                    return;
                }
            }
            ctx.reply(addTelegrafDomainToNews(publishNews).path);
        });
    }

    addActionHandlers() {
        this.bot.action('ru', async (ctx) => {
            this.dbService.saveUser(fromToUserAdapter(ctx.from, ctx.match));
            ctx.session.langCode = ctx.match;
            ctx.editMessageText(lang.welcome_msg[ctx.match]);
        });
        this.bot.action('ua', async (ctx) => {
            this.dbService.saveUser(fromToUserAdapter(ctx.from, ctx.match));
            ctx.session.langCode = ctx.match;
            ctx.editMessageText(lang.welcome_msg[ctx.match]);
        });
        this.bot.action('en', async (ctx) => {
            this.dbService.saveUser(fromToUserAdapter(ctx.from, ctx.match));
            ctx.session.langCode = ctx.match;
            ctx.editMessageText(lang.welcome_msg[ctx.match]);
        });
    }

    addMiddelwares() {
        this.bot.use(session());
    }

    launch() {
        this.bot = new Telegraf(this.token);

        this.addMiddelwares();
        this.addActionHandlers();
        this.addMessaageHandlers();

        this.bot.start((ctx) => {
            ctx.reply('Welcome', testMenu);
            this.dbService.saveUser(fromToUserAdapter(ctx.from));
        });

        this.bot.launch();
    }


}

module.exports.BotService = BotService;
const testMenu = Telegraf.Extra
    .markdown()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('UKR', 'ua'),
        m.callbackButton('RUS', 'ru'),
        m.callbackButton('ENG', 'en')
    ], { columns: 3 }));