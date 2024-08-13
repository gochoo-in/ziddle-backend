import Joi from "joi";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the current module URL and convert it to a file path

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    MONGO_DB : Joi.string(),
    // CORS_ORIGIN: Joi.string().valid('*').required(),
    // APP_NAME: Joi.string().default(null).description('Application Name.'),
    PORT: Joi.number().default(3000).description('Application port'),
    COMMON_JWT_KEY: Joi.string().required().description(' JWT secret key'),
    // AWS_REGION: Joi.string().required().description('AWS region'),
    // AWS_BUCKET_NAME: Joi.string().required().description('AWS S3 bucket name'),
    // AWS_ACCESS_KEY_ID: Joi.string().required().description('AWS access key ID'),
    // AWS_SECRET_ACCESS_KEY: Joi.string().required().description('AWS secret access key'),
    // JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    // JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    // JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
    //   .default(10)
    //   .description('minutes after which reset password token expires'),
    //   DB_HOST:Joi.string().required().description('MYSQL host'), 
    //   DB_PASSWORD:Joi.string().required().description('MYSQL password'),
    //   DB_USER:Joi.string().required().description('MYSQL user name'), 
    //   DB_NAME:Joi.string().required().description('MYSQL Datbase name'), 
    //   DB_PORT : Joi.number().default(3306).description('Database port'),
    //   COUPON_MICROSERVICE_API_KEY: Joi.string().required(),
    //   MICROSERVICE_BASE_URL:Joi.string()
  })
  .unknown();


const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);


if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export default {
  env: envVars.NODE_ENV,
  // corsOrigin: envVars.CORS_ORIGIN,
  // appName: envVars.APP_NAME,
  port: envVars.PORT,
  jwtSecret: envVars.COMMON_JWT_KEY,
  // awsRegion: envVars.AWS_REGION,
  // awsBucketName: envVars.AWS_BUCKET_NAME,
  // awsAccessKeyId: envVars.AWS_ACCESS_KEY_ID,
  // awsSecretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
  // jwtAccessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
  // jwtRefreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
  // jwtResetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
  // dbHost: envVars.DB_HOST,
  // dbPassword: envVars.DB_PASSWORD,
  // dbUser: envVars.DB_USER,
  // dbName: envVars.DB_NAME,
  // dbPort: envVars.DB_PORT,
  mongoDb : envVars.MONGO_DB,
  // apiSchemaKey : envVars.COUPON_MICROSERVICE_API_KEY,
  // apiUrl:envVars.MICROSERVICE_BASE_URL
};