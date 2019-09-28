const Telegraf = require('telegraf');
const session = require('telegraf/session');
const { addTelegrafDomain, fromToUserAdapter, addTelegrafDomainToNews } = require('../helpers/adapters');
const lang = require('../../lang/lang.json');
const Stage = require('telegraf/stage');
const WizardScene = require('telegraf/scenes/wizard');
const Markup = require('telegraf/markup');
const { logger } = require('./logger');
class BotService {

    constructor(dbService, newsService, newsController) {
        this.token = process.env.telegram_accountToken;
        this.dbService = dbService;
        this.newsService = newsService;
        this.newsController = newsController;
        this.newsSyncDelay = 0;
        this.stage;

        this.startScene = new WizardScene(
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
            async (ctx) => {
                this.dbService.saveUser(fromToUserAdapter(ctx.from, ctx.message.text));
                ctx.session.langCode = ctx.message.text;
                ctx.telegram.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
                ctx.reply(lang.welcome_msg[ctx.message.text], Markup.keyboard([
                    ['Archive', 'Select language']
                ])
                    .resize()
                    .extra());
                const lastNewsId = this.newsService.getNewsCount();
                const news = (await this.dbService.getNewsByIdAndLang(lastNewsId, ctx.session.langCode))[0];
                ctx.reply(addTelegrafDomainToNews(news).path);
                await this.dbService.saveUser({ id: ctx.from.id, last_msg: lastNewsId });
                ctx.scene.leave();
            }
        );
    }

    addMessaageHandlers() {
        this.bot.hears(/^get\d+/, async (ctx) => {
            const requestedNewsId = parseInt(ctx.match[0].match(/^get(\d+)/)[1]);
            let publishNews = (await this.dbService.getNewsByIdAndLang(requestedNewsId, ctx.session.langCode))[0];
            if (!publishNews) {
                ctx.reply('Can not find news in database.');
                logger.log({
                    level: 'verbose',
                    message: `BotService: ${userForLogs(ctx.from)} request news #${requestedNewsId}, news don't found in database.`
                });
                return;
            }
            logger.log({
                level: 'verbose',
                message: `BotService: ${userForLogs(ctx.from)} request news #${requestedNewsId}.`
            });
            ctx.reply(addTelegrafDomainToNews(publishNews).path);
        });

        this.bot.hears('Archive', async (ctx) => {
            ctx.telegram.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
            const archivePath = await this.dbService.getConfig(`archive_${ctx.session.langCode}`);
            ctx.reply(addTelegrafDomain(archivePath));
            logger.log({
                level: 'verbose',
                message: `BotService: ${userForLogs(ctx.from)} request archive.`
            });
        });

        this.bot.hears('Select language', async (ctx) => {
            ctx.telegram.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
            ctx.scene.enter('start');
        });

        this.bot.hears('test', async (ctx) => {
            // this.sendNewNewsForAllUsers();
            this.newsController.syncNewNews();
        });
    }

    async sendNewNewsForAllUsers() {
        return new Promise(async (resolve) => {
            const usersData = await this.dbService.getAllUsers();
            const newsCache = [];
            const lastNewsId = this.newsService.getNewsCount();

            usersData.forEach(async (userData) => {
                const { id, active, lang, last_msg } = userData.data();
                if (!active) {
                    return;
                }
                for (let newsId = last_msg + 1; newsId <= lastNewsId; newsId++) {
                    let news = newsCache.find(el => el.id == newsId && el.lang === lang);
                    if (!news) {
                        news = (await this.dbService.getNewsByIdAndLang(newsId, lang))[0];
                        newsCache.push(news);
                    }
                    this.dbService.saveUser({
                        id,
                        last_msg: lastNewsId
                    });
                    this.bot.telegram.sendMessage(id, addTelegrafDomainToNews(news).path);
                }
            });
            resolve();
        });
    }

    addActionHandlers() {
    }

    addMiddelwares() {
        this.bot.use(session());
        this.bot.use(async (ctx, next) => {
            if (!ctx.session.langCode) {
                const user = (await this.dbService.getUserById(ctx.from.id))[0];
                ctx.session.langCode = user ? user.data.lang : 'en';
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
                await this.newsController.syncNews(sourceNewsIndex, true);
                ctx.telegram.editMessageText(chatId, msgId, null, `Start news sync by update existing with add missing news.
                Completed: ${sourceNewsIndex}/${newsCount}`);
            }
            ctx.telegram.editMessageText(chatId, msgId, null, `Start news sync by update existing with add missing news.
            Completed: ${newsCount} synced.`);
        });

        this.bot.command('sync_by_update', async (ctx) => {
            this.newsService.initNews();
            const { message_id: msgId, chat: { id: chatId } } = await ctx.reply('Start news sync by update existing.');
            const newsCount = this.newsService.getNewsCount();
            for (let sourceNewsIndex = 1; sourceNewsIndex <= newsCount; sourceNewsIndex++) {
                await this.newsController.syncNews(sourceNewsIndex);
                ctx.telegram.editMessageText(chatId, msgId, null, `Start news sync by update existing.
                Completed: ${sourceNewsIndex}/${newsCount}`);
            }
            ctx.telegram.editMessageText(chatId, msgId, null, `Start news sync by update existing.
            Completed: ${newsCount} synced.`);
        });

        this.bot.command('add_links', async (ctx) => {
            this.newsService.initNews();
            const { message_id: msgId, chat: { id: chatId } } = await ctx.reply('Start add links to news.');
            const newsCount = this.newsService.getNewsCount();
            for (let sourceNewsIndex = 1; sourceNewsIndex <= newsCount; sourceNewsIndex++) {
                await this.newsController.addAllLinksToNews(sourceNewsIndex);
                ctx.telegram.editMessageText(chatId, msgId, null, `Start add links to news.
                Completed: ${sourceNewsIndex}/${newsCount}`);
            }
            ctx.telegram.editMessageText(chatId, msgId, null, `Start add links to news.
                Completed: ${newsCount} links added.`);
        });

        this.bot.command('build_archive', async (ctx) => {
            await this.newsController.updateArchive();
            ctx.reply('New archive created.');
        });

        this.bot.command('archive', async (ctx) => {
            const archivePath = await this.dbService.getConfig(`archive_${ctx.session.langCode}`);
            ctx.reply(addTelegrafDomain(archivePath));
        });

        this.bot.command('subscribe', async (ctx) => {
            this.dbService.saveUser({ id: ctx.from.id, active: true });
            logger.log({
                level: 'info',
                message: `BotService: user #${ctx.from.id} subscribe for a news.`
            });
            ctx.reply('You are subscribe for a news.');
        });

        this.bot.command('unsubscribe', async (ctx) => {
            this.dbService.saveUser({ id: ctx.from.id, active: false });
            logger.log({
                level: 'info',
                message: `BotService: user #${ctx.from.id} unsubscribe for a news.`
            });
            ctx.reply('You are unsubscribe for a news.');
        });



    }

    launch() {
        this.bot = new Telegraf(this.token);

        this.addMiddelwares();
        this.addActionHandlers();
        this.addMessaageHandlers();
        this.addCommandHandlers();

        this.stage = new Stage();
        this.bot.use(this.stage.middleware());
        this.stage.register(this.startScene);

        this.bot.start(async (ctx) => {
            // console.log(userFromDB);
            await this.dbService.saveUser(fromToUserAdapter(ctx.from));
            ctx.scene.enter('start');
        });
        this.bot.launch();
    }
}

module.exports.BotService = BotService;

function userForLogs(from) {
    return `${from.username} #${from.id}`;
}
