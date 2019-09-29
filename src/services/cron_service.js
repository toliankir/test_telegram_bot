const cron = require('node-cron');
const { logger } = require('../services/logger');

class CronService {
    constructor(newsController, botService) {
        this.newsController = newsController;
        this.botService = botService;
        logger.log({
            level: 'info',
            message: 'Start cron service.'
        });
    }

    setCronTasks() {
        cron.schedule(process.env.cron_syncAndSendMsg, async () => {
            logger.log({
                level: 'info',
                message: `CronService: Running task for new news sync and send news to users.`
            });
            await this.newsController.syncNewNews();
            await this.botService.sendNewNewsForAllUsers();
        });
    }
}

module.exports.CronService = CronService;