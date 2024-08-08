import mongoose from "mongoose"
import logger from "../logger.js";
import config from '../index.js';

export const connectMongoDB = async () => {
    try {
      const connectionInstance = await mongoose.connect(config.mongoDb)
      logger.info(
        `MongoDB Connected! DB Host: ${connectionInstance.connection.host}`
      )
    } catch (error) {
      logger.error("MongoDB connection error: ", error.message)
      setTimeout(() => process.exit(1), 1000)
    }
}
export const checkMongoDBDatabaseHealth = async () => {
    try {
      const connection = mongoose.connection;
      if (connection.readyState === 1) { // 1 indicates connected
        logger.info('MongoDB database health check successful!');
        return { status: 'healthy', message: 'MongoDB database connection successful' };
      } else {
        throw new Error('MongoDB is not connected');
      }
    } catch (error) {
      logger.error('MongoDB database health check failed:', error.message);
      return { status: 'unhealthy', message: `MongoDB database connection failed: ${error.message}` };
    }
  };
  
  