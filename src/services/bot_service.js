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

        this.bot.hears(getRegExForLang('archive_title'), async (ctx) => {
            ctx.telegram.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
            const archivePath = await this.dbService.getConfig(`archive_${ctx.session.langCode}`);
            ctx.reply(addTelegrafDomain(archivePath));
            logger.log({
                level: 'verbose',
                message: `BotService: ${userForLogs(ctx.from)} request archive.`
            });
        });

        this.bot.hears(getRegExForLang('language_select_title'), async (ctx) => {
            await ctx.telegram.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
            ctx.scene.enter('startScene');
        });

        this.bot.hears(getRegExForLang('subscribe_title'), async (ctx) => {
            await ctx.telegram.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
            const { data: user } = (await this.dbService.getUserById(ctx.from.id))[0];
            const lastMsgId = await this.dbService.getLastNewsId();
            ctx.reply(lang['subscribe_text'][ctx.session.langCode], this.getMainKeyboard(ctx.session.langCode, true));
            const firstNewsToSend = user.last_msg + 1;
            if (firstNewsToSend < lastMsgId) {
                ctx.reply(lang['unreaded_news_text'][ctx.session.langCode]);
            }
            for (let newsId = firstNewsToSend; newsId <= lastMsgId; newsId++) {
                const news = (await this.dbService.getNewsByIdAndLang(newsId, user.lang))[0];
                ctx.reply(addTelegrafDomainToNews(news).path);
            }
            await this.dbService.saveUser({
                id: ctx.from.id,
                active: true,
                last_msg: lastMsgId
            });
            logger.log({
                level: 'info',
                message: `BotService: user #${ctx.from.id} subscribe for a news.`
            });

        });

        this.bot.hears(getRegExForLang('unsubscribe_title'), async (ctx) => {
            await ctx.telegram.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
            this.dbService.saveUser({ id: ctx.from.id, active: false });
            logger.log({
                level: 'info',
                message: `BotService: user #${ctx.from.id} unsubscribe for a news.`
            });
            ctx.reply(lang['unsubscribe_text'][ctx.session.langCode], this.getMainKeyboard(ctx.session.langCode, false));
        });

        this.bot.hears('test', async (ctx) => {

            this.newsController.syncNewNews();
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
        const stage = new Stage([this.getStartScene()]);
        this.bot.use(stage.middleware());
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
            ctx.reply('You are subscribe for a news.');
            const { data: user } = (await this.dbService.getUserById(ctx.from.id))[0];
            const lastMsgId = await this.dbService.getLastNewsId();
            for (let newsId = user.last_msg + 1; newsId <= lastMsgId; newsId++) {
                const news = (await this.dbService.getNewsByIdAndLang(newsId, user.lang))[0];
                ctx.reply(addTelegrafDomainToNews(news).path);
            }
            await this.dbService.saveUser({
                id: ctx.from.id,
                active: true,
                last_msg: lastMsgId
            });
            logger.log({
                level: 'info',
                message: `BotService: user #${ctx.from.id} subscribe for a news.`
            });
        });

        this.bot.command('unsubscribe', async (ctx) => {
            this.dbService.saveUser({ id: ctx.from.id, active: false });
            logger.log({
                level: 'info',
                message: `BotService: user #${ctx.from.id} unsubscribe for a news.`
            });
            ctx.reply('You are unsubscribe for a news.', this.getMainKeyboard(ctx.session.langCode, false));
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

    getMainKeyboard(language = 'en', active = true) {
        return Markup.keyboard([
            [lang['archive_title'][language],
            lang['language_select_title'][language],
            active ? lang['unsubscribe_title'][language] : lang['subscribe_title'][language]]
        ])
            .resize()
            .extra();
    }

    getStartScene() {
        return new WizardScene(
            'startScene',
            async (ctx) => {
                ctx.reply(lang['language_select_title'][ctx.from.language_code], Markup.keyboard([
                    ['ru', 'ua', 'en']
                ])
                    .oneTime()
                    .resize()
                    .extra());
                return ctx.wizard.next();
            },
            async (ctx) => {
                const user = fromToUserAdapter(ctx.from);
                user.lang = ctx.message.text;
                ctx.session.langCode = user.lang;
                ctx.telegram.deleteMessage(ctx.message.chat.id, ctx.message.message_id);
                ctx.reply(lang.welcome_msg[user.lang], this.getMainKeyboard(user.lang, user.active));
                const lastNewsId = this.newsService.getNewsCount();
                const news = (await this.dbService.getNewsByIdAndLang(lastNewsId, user.lang))[0];
                ctx.reply(addTelegrafDomainToNews(news).path);
                user.last_msg = lastNewsId;
                await this.dbService.saveUser(user);
                return ctx.scene.leave();
            }
        );

    }

    launch() {
        this.bot = new Telegraf(this.token);
        this.addMiddelwares();
        this.addActionHandlers();
        this.addMessaageHandlers();
        this.addCommandHandlers();



        this.bot.launch();
        this.bot.start(async (ctx) => {
            ctx.scene.enter('startScene');
        });
    }
}

module.exports.BotService = BotService;

function userForLogs(from) {
    return `${from.username} #${from.id}`;
}


function getRegExForLang(field) {
    return new RegExp('(' + Object.values(lang[field]).join(')|(') + ')', '');
}