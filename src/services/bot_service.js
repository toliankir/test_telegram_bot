const Telegraf = require('telegraf');
const Extra = require('telegraf/extra')
const session = require('telegraf/session');
const { addTelegrafDomain, fromToUserAdapter, addTelegrafDomainToNews } = require('../helpers/adapters');
const lang = require('../../lang/lang.json');
class BotService {

    constructor(dbService, telegrafService, newsService) {
        this.token = process.env.telegram_accountToken;
        this.dbService = dbService;
        this.telegrafService = telegrafService;
        this.newsService = newsService;
        this.newsSyncDelay = 0;
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
            ctx.reply(addTelegrafDomainToNews(publishNews[0]).path);
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

        this.bot.command('sync', async (ctx) => {
            const replayCtx = await ctx.reply('Start news sync');
            const newsCount = this.newsService.getNewsCount();
            this.syncOneNews(ctx, replayCtx, 1, newsCount);
        });

        this.bot.command('build_archive', async (ctx) => {
            await this.telegrafService.updateArchive();
            ctx.reply('New archive created.');
        });

        this.bot.command('archive', async (ctx) => {
            const archivePath = await this.dbService.getConfig(`archive_${ctx.session.langCode}`);
            ctx.reply(addTelegrafDomain(archivePath));
        });
    }


    syncOneNews(ctx, replayCtx, newsId, newsCount) {
        setTimeout(async () => {
            this.newsSyncDelay = 0;
            let publishNews = await this.dbService.getNewsByIdAndLang(newsId, ctx.session.langCode);
            if (!publishNews[0]) {
                this.newsSyncDelay = process.env.telegraf_syncDelay;
                try {
                    await this.telegrafService.publishNews(newsId);
                    publishNews = await this.dbService.getNewsByIdAndLang(newsId, ctx.session.langCode);
                } catch (err) {
                    ctx.reply(err);
                    this.newsSyncDelay = 0;
                    return;
                }
            }

            ctx.telegram.editMessageText(replayCtx.chat.id, replayCtx.message_id, null, `Start news sync.
    Completed: ${Math.round((100 / newsCount) * newsId)}%
    Added news #: ${newsId} - ${publishNews[0].title}`);
            if (newsId < newsCount) {
                this.syncOneNews(ctx, replayCtx, newsId + 1, newsCount);
            }
        }, this.newsSyncDelay);
    }

    launch() {
        this.bot = new Telegraf(this.token);

        this.addMiddelwares();
        this.addActionHandlers();
        this.addMessaageHandlers();
        this.addCommandHandlers();

        this.bot.start(async (ctx) => {
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
