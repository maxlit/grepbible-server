const winston = require('winston');

// Define the custom format with timestamp
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} ${level}: ${message}`;
    })
);

// Create the logger instance
const logger = winston.createLogger({
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        new winston.transports.File({ 
            filename: 'error.log', 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: 'combined.log' 
        })
    ]
});

// If we're in test environment, silence the logger
if (process.env.NODE_ENV === 'test') {
    logger.transports.forEach((t) => t.silent = true);
}

module.exports = logger; 