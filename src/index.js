const { DBService } = require('./services/db_service');
const { NewsService } = require('./services/news_service');
const { TelegrafService } = require('./services/telegraf_service');
const { BotService } = require('./services/bot_service');
const { logger } = require('./services/logger');
const { NewsController } = require('./controllers/newsController');
const { CronService } = require('./services/cron_service');
// const telegramToken = process.env.telegram_accountToken // test bot
// const telegramToken = '729034691:AAG9dTyKIrqKSIYewg853iG4J1tGLIj5P3Q'; //public bot



serviceStart();


async function serviceStart() {
    logger.log({
        level: 'info',
        message: 'SHPP Telegram bot starts...'
    });

    const dbService = new DBService();
    const newsService = new NewsService();

    try {
        await dbService.init();
        await newsService.initNews();
    } catch (err) {
        logger.log({
            level: 'error',
            message: err
        });
    }

    const telegrafService = new TelegrafService(dbService, newsService);
    const newsController = new NewsController(newsService, dbService, telegrafService);

    const botService = new BotService(dbService, newsService, newsController);
    botService.launch();

    const cronService = new CronService(newsController, botService);
    cronService.setCronTasks();
}