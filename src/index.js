const { DBService } = require('./services/db_service');
const { NewsService } = require('./services/news_service');
const { TelegrafService } = require('./services/telegraf_service');
const { BotService } = require('./services/bot_service');
const { logger } = require('./services/logger');
// const telegramToken = process.env.telegram_accountToken // test bot
// const telegramToken = '729034691:AAG9dTyKIrqKSIYewg853iG4J1tGLIj5P3Q'; //public bot

serviceStart();

async function serviceStart() {
    logger.log({
        level: 'info',
        message: 'What time is the testing at?'
    });
    const dbService = new DBService();
    const newsService = new NewsService();

    await dbService.init();
    newsService.initNews();

    const telegrafService = new TelegrafService(dbService, newsService);
    const botService = new BotService(dbService, telegrafService, newsService);
    botService.launch();
}