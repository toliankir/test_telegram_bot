const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
const path = require('path');
require('winston-daily-rotate-file');


const logger = createLogger({
    transports: [
        new transports.Console({
            level: 'debug',
            format: combine(
                timestamp(),
                printf(({ level, message, timestamp }) => {
                    return `${timestamp.replace('T', ' ').replace(/(\.\d+Z)$/, '')} ${level}: ${message}`;
                }),
                format.colorize({ all: true })
            )
        }),
        new transports.DailyRotateFile({
            filename: path.join('logs','%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            level: 'debug',
            format: combine(
                timestamp(),
                printf(({ level, message, timestamp }) => {
                    return `${timestamp.replace('T', ' ').replace(/(\.\d+Z)$/, '')} ${level}: ${message}`;
                })
            )
        }),
    ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// 
//   if (process.env.NODE_ENV !== 'production') {
//     logger.add(new winston.transports.Console({
//       format: winston.format.simple()
//     }));
//   }

module.exports.logger = logger;