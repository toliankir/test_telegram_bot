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
            const requestedNewsId = parseInt(ctx.match[0].match(/^get(\d+)/)[1]);
            let publishNews = await this.dbService.getNewsByIdAndLang(requestedNewsId, ctx.session.langCode);
            if (!publishNews[0]) {
                try {
                    await this.telegrafService.publishNews(requestedNewsId);
                    publishNews = await this.dbService.getNewsByIdAndLang(requestedNewsId, ctx.session.langCode);
                } catch (err) {
                    ctx.reply(err);
                }
            }
            ctx.reply(addTelegrafDomainToNews(publishNews).path);
        });
    }

    addActionHandlers() {
        this.bot.action(/^(ru|ua|en)$/, async (ctx) => {
            const language = ctx.match[0];
            this.dbService.saveUser(fromToUserAdapter(ctx.from, language));
            ctx.session.langCode = language;
            ctx.editMessageText(lang.welcome_msg[language]);
        });
    }

    addMiddelwares() {
        this.bot.use(session());
        this.bot.use(async (ctx, next) => {
            if (!ctx.session.langCode) {
                const user = await this.dbService.getUserById(ctx.from.id);
                ctx.session.langCode = user[0].data.lang;
            }
            next();
        });
    }

    addCommandHandlers() {
        this.bot.command('archive', async (ctx) => {
            const newsQueryObj = await this.dbService.getAllNewsByLangQuery(ctx.session.langCode);
            newsQueryObj.forEach(el => {
                const data = el.data();
                console.log(data.id, data.title);
            })
        });
        this.bot.command('test', async (ctx) => {

            for (let requestedNewsId = 0; requestedNewsId <= 45; requestedNewsId++) {
                console.log(requestedNewsId);
                let publishNews = await this.dbService.getNewsByIdAndLang(requestedNewsId, ctx.session.langCode);
                if (!publishNews[0]) {
                    try {
                        await this.telegrafService.publishNews(requestedNewsId);
                        ctx.reply(`News ${requestedNewsId} added.`);
                    } catch (err) {
                        ctx.reply(err);
                    }
                }

            }

        });
    }

    launch() {
        this.bot = new Telegraf(this.token);

        this.addMiddelwares();
        this.addActionHandlers();
        this.addMessaageHandlers();
        this.addCommandHandlers();

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