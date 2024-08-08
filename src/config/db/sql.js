import mysql from 'mysql2/promise';
import logger from "../logger.js";
import config from '../index.js';



const pool = mysql.createPool({
    host: config.dbHost,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    port: config.dbPort,
    connectionLimit: 70,
    waitForConnections: true,
});

export const checkSqlDatabaseHealth = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT 1'); // Simple query to check connection
        connection.release(); // Release connection back to the pool
        logger.info('Database health check successful!');
        return { status: 'healthy', message: 'Database connection successful' };
    } catch (error) {
        logger.error('Database health check failed:', error.message);
        return { status: 'unhealthy', message: `Database connection failed: ${error.message}` };
    }
};

// Method to check if the database connection is alive
export const checkSDatabaseConnection = async () => {
    try {
        const connection = await pool.getConnection();
        logger.info('Database connection successful!');
        connection.release(); // Release connection back to the pool    
        
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1); // Exit process with failure code
      
    }
};


export default pool
