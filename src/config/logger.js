import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, errors, json, colorize } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Create logger instance
const logger = createLogger({
  level: 'info', // Default logging level
  format: combine(
    errors({ stack: true }), // Log the stack trace for errors
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Timestamp format
    logFormat // Use custom log format
  ),
  transports: [
    // Console transport for development
    new transports.Console({
      level: 'debug', // Log debug and above to console
      format: combine(
        colorize(), // Colorize output for readability
        logFormat // Use custom log format
      )
    }),
    // Daily rotate file transport for all logs
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log', // Log file path with date placeholder
      datePattern: 'YYYY-MM-DD', // Daily rotation
      zippedArchive: true, // Compress old log files
      maxSize: '20m', // Maximum log file size
      maxFiles: '14d', // Retain logs for 14 days
      format: combine(
        json(), // Log in JSON format for easy parsing
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
      )
    }),
    // Separate daily rotate file transport for error logs
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log', // Error log file path with date placeholder
      datePattern: 'YYYY-MM-DD', // Daily rotation
      zippedArchive: true, // Compress old log files
      maxSize: '20m', // Maximum log file size
      maxFiles: '30d', // Retain error logs for 30 days
      level: 'error', // Log only errors to this file
      format: combine(
        json(), // Log in JSON format for easy parsing
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
      )
    })
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

export default logger;
