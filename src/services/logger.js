const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;



const logger = createLogger({
    transports: [
        new transports.Console({
            level: 'verbose',
            format: combine(
                timestamp(),
                format.printf(({ level, message, timestamp }) => {
                    return `${timestamp.replace('T', ' ').replace(/(\.\d+Z)$/, '')} ${level}: ${message}`;
                }),
                format.colorize({ all: true })
            )
        })
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