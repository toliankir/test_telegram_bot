const { DBService } = require('./services/db_service');
const { NewsService } = require('./services/news_service');
const { TelegrafService } = require('./services/telegraf_service');
const { BotService } = require('./services/bot_service');

// const telegramToken = '602060641:AAG0Z5SA5nqUDGrvm---rv6ZSJCGksZm8aM'; // test bot
const telegramToken = '729034691:AAG9dTyKIrqKSIYewg853iG4J1tGLIj5P3Q'; //public bot

serviceStart();

async function serviceStart() {
    const dbService = new DBService();
    const newsService = new NewsService();

    dbService.init();
     newsService.initNews();

    const telegrafService = new TelegrafService(dbService, newsService);
    const botService = new BotService(telegramToken, dbService, telegrafService);
    botService.launch();
}