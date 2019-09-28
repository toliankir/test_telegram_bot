const cron = require('node-cron');
const { logger } = require('../services/logger');

class CronService {
    constructor(newsController) {
        this.newsController = newsController;
        logger.log({
            level: 'info',
            message: 'Start cron service.'
        });
    }

    setCrontTasks() {
        cron.schedule('* * * * *', () => {
            console.log('running a task every minute');
        });
    }
}

module.exports.CronService = CronService;