import { newEnforcer } from 'casbin';
import { MongoAdapter } from 'casbin-mongodb-adapter';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mongoURI = process.env.MONGO_DB;

export const getCasbinEnforcer = async () => {
    try {
        const adapter = await MongoAdapter.newAdapter({
            uri: mongoURI,
            database: 'test',  
            collection: 'casbinpolicies',  
        });

        const modelPath = path.resolve(__dirname, '../utils/model.conf'); 

        const enforcer = await newEnforcer(modelPath, adapter);

        await enforcer.loadPolicy();

        logger.info('Casbin enforcer created and policy loaded successfully'); 

        return enforcer;
    } catch (error) {
        logger.error('Error creating Casbin enforcer or loading policy', { error: error });
        throw new Error('Failed to create Casbin enforcer');
    }
};
