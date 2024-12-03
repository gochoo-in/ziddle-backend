import express from "express";
import * as http from 'http';
import { StatusCodes } from "http-status-codes";
import Config from "./config/index.js";
import logger from "./config/logger.js";
import allV1Routes from './v1/routes/index.js';
import { connectMongoDB, checkMongoDBDatabaseHealth } from "./config/db/mongo.js";
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { cookieManager } from "./utils/middleware.js";
import cors from 'cors';
import expressListEndpoints from 'express-list-endpoints';
import { routeDescriptions } from "./utils/routeDescriptions.js";

dotenv.config();
const { port } = Config;

const app = express();
const REQUEST_TIMEOUT = 900000;

// Create an HTTP server
const httpServer = http.Server;

// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use(cookieManager);


app.use((req, res, next) => {
  res.setTimeout(REQUEST_TIMEOUT, () => {
    logger.error(`Request to ${req.originalUrl} timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
    res.status(StatusCodes.REQUEST_TIMEOUT).json({
      message: 'Request timed out, please try again later.',
    });
  });
  next();
});

// CORS configuration
app.use(cors({
  origin: ['https://localhost:3000', 'https://localhost:5173', 'https://devsuperadminziddle.s3-website.ap-south-1.amazonaws.com', 'https://build.d10tpduw9hjv1q.amplifyapp.com/'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

// Root endpoint for testing
app.get('/', (req, res) => {
  res.status(StatusCodes.OK).json("API Testing Successful!!");
});

// Health check for SQL database
app.get('/health', async (req, res) => {
  const healthStatus = await checkSqlDatabaseHealth();
  if (healthStatus.status === 'healthy') {
    res.status(StatusCodes.OK).json(healthStatus);
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(healthStatus);
  }
});

// Health check for MongoDB
app.get('/health/mongo', async (req, res) => {
  const healthStatus = await checkMongoDBDatabaseHealth();
  if (healthStatus.status === 'healthy') {
    res.status(StatusCodes.OK).json(healthStatus);
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(healthStatus);
  }
});

// Endpoint listing
app.get('/endpoints', (req, res) => {
  const endpoints = expressListEndpoints(app);
  const enrichedEndpoints = [];

  endpoints.forEach((endpoint) => {
    const hasDescriptions = routeDescriptions[endpoint.path] || {};
    endpoint.methods.forEach((method) => {
      enrichedEndpoints.push({
        path: endpoint.path,
        method,
        middlewares: endpoint.middlewares.length > 0 ? endpoint.middlewares : 'None',
        description: hasDescriptions[method] || 'No description available'
      });
    });
  });

  res.status(200).json({ endpoints: enrichedEndpoints });
});

// Use v1 routes
app.use('/api/v1', allV1Routes);

// Error handling middleware
app.use((req, res, next) => {
  const error = new Error("Invalid request");
  res.status(StatusCodes.NOT_FOUND);
  next(error);
});

// Global error handling middleware
app.use((error, req, res, next) => {
  if (req.expiredToken) {
    delete req.headers.authorization;
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: "Your token has been removed. Please log in again.",
    });
  }
  res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
});

// Start server function
async function startServer() {
  try {
    const server = app.listen(port, '0.0.0.0', async () => {
      logger.info(`Listening on port ${port}`);
      await connectMongoDB();
    });

    // Error handling for EADDRINUSE
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${port} is already in use. Please choose another port.`);
      } else {
        logger.error("An error occurred:", error);
      }
      setTimeout(() => process.exit(1), 1000);
    });
  } catch (err) {
    logger.error("Error starting server:", err);
    setTimeout(() => process.exit(1), 1000);
  }
}

// Start the server
startServer();

// Gracefully shut down server and Agenda
const exitHandler = async () => {
  logger.info('Shutting down server...');
  process.exit(0);
};

// Handle unexpected errors
const unexpectedErrorHandler = (error) => {
  logger.error("Unexpected error:", error);
};

// Handle process termination signals
process.on('SIGTERM', exitHandler);
process.on('SIGINT', exitHandler);
process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);
