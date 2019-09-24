const Telegraf = require('telegraf');
const session = require('telegraf/session');
const { addTelegrafDomain, fromToUserAdapter, addTelegrafDomainToNews } = require('../helpers/adapters');
const lang = require('../../lang/lang.json');
const Stage = require('telegraf/stage');
const WizardScene = require('telegraf/scenes/wizard');
const Markup = require('telegraf/markup');


class BotService {

    constructor(dbService, telegrafService, newsService) {
        this.token = process.env.telegram_accountToken;
        this.dbService = dbService;
        this.telegrafService = telegrafService;
        this.newsService = newsService;
        this.newsSyncDelay = 0;
        this.stage;
    }

    addMessaageHandlers() {
        this.bot.hears(/^get\d+/, async (ctx) => {

            const requestedNewsId = parseInt(ctx.match[0].match(/^get(\d+)/)[1]);
            let publishNews = (await this.dbService.getNewsByIdAndLang(requestedNewsId, ctx.session.langCode))[0];
            if (!publishNews) {
                ctx.reply('Can not find news in database.');
                return;
            }
            ctx.reply(addTelegrafDomainToNews(publishNews).path);
        });

        this.bot.hears('Archive', async (ctx) => {
            ctx.telegram.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
            const archivePath = await this.dbService.getConfig(`archive_${ctx.session.langCode}`);
            ctx.reply(addTelegrafDomain(archivePath));
        });
    }

    addActionHandlers() {

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
            this.newsService.initNews();
            const { message_id: msgId, chat: { id: chatId } } = await ctx.reply('Start news sync by update existing with add missing news.');
            const newsCount = this.newsService.getNewsCount();
            for (let sourceNewsIndex = 1; sourceNewsIndex <= newsCount; sourceNewsIndex++) {
                await this.telegrafService.syncNews(sourceNewsIndex, true);
                ctx.telegram.editMessageText(chatId, msgId, null, `Start news sync by update existing with add missing news.
                Completed: ${sourceNewsIndex}/${newsCount}`);
            }
        });

        this.bot.command('syncByUpdate', async (ctx) => {
            this.newsService.initNews();
            const { message_id: msgId, chat: { id: chatId } } = await ctx.reply('Start news sync by update existing.');
            const newsCount = this.newsService.getNewsCount();
            for (let sourceNewsIndex = 1; sourceNewsIndex <= newsCount; sourceNewsIndex++) {
                await this.telegrafService.syncNews(sourceNewsIndex);
                ctx.telegram.editMessageText(chatId, msgId, null, `Start news sync by update existing.
                Completed: ${sourceNewsIndex}/${newsCount}`);
            }
        });

        this.bot.command('addLinks', async (ctx) => {
            this.newsService.initNews();
            const { message_id: msgId, chat: { id: chatId } } = await ctx.reply('Start add links to news.');
            const newsCount = this.newsService.getNewsCount();
            for (let sourceNewsIndex = 1; sourceNewsIndex <= newsCount; sourceNewsIndex++) {
                await this.telegrafService.addAllLinksToNews(sourceNewsIndex);
                ctx.telegram.editMessageText(chatId, msgId, null, `Start news sync by update.
                Completed: ${sourceNewsIndex}/${newsCount}`);
            }
        });

        this.bot.command('buildArchive', async (ctx) => {
            await this.telegrafService.updateArchive();
            ctx.reply('New archive created.');
        });

        this.bot.command('archive', async (ctx) => {
            const archivePath = await this.dbService.getConfig(`archive_${ctx.session.langCode}`);
            ctx.reply(addTelegrafDomain(archivePath));
        });


    }

    syncNews(ctx, replayCtx, newsId, newsCount) {
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
                this.syncNews(ctx, replayCtx, newsId + 1, newsCount);
            }
        }, this.newsSyncDelay);
    }

    launch() {
        this.bot = new Telegraf(this.token);

        const startScene = new WizardScene(
            'start',
            async (ctx) => {
                ctx.reply(`Select language`, Markup.keyboard([
                    ['ru', 'ua', 'en']
                ])
                    .oneTime()
                    .resize()
                    .extra());
                ctx.wizard.next();
            },
            (ctx) => {
                this.dbService.saveUser(fromToUserAdapter(ctx.from, ctx.message.text));
                ctx.session.langCode = ctx.message.text;
                ctx.telegram.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
                ctx.reply(lang.welcome_msg[ctx.message.text], Markup.keyboard([
                    ['Archive', 'Select language']
                ])
                    .resize()
                    .extra());
                ctx.scene.leave();
            }
        )

        this.addMiddelwares();
        this.addActionHandlers();
        this.addMessaageHandlers();
        this.addCommandHandlers();


        this.stage = new Stage();
        this.bot.use(this.stage.middleware());
        this.stage.register(startScene);

        this.bot.start(async (ctx) => {
            ctx.scene.enter('start');
        });
        this.bot.launch();
    }
}

module.exports.BotService = BotService;
