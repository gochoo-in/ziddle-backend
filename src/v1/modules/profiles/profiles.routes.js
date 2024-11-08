import express from 'express';
import { 
    addProfileDetails, 
    getProfileById, 
    updateProfileDetails, 
    deleteProfile,
    addOrUpdateCommunicationPreferences
} from './profiles.controller.js';
import validate from '../../../utils/validate.js';
import profileValidation from '../../validation/profile.validation.js';


const router = express.Router();

router.post('/:userId', validate(profileValidation), addProfileDetails);
router.get('/:profileId', getProfileById);
router.patch('/:profileId', updateProfileDetails);
router.delete('/:profileId', deleteProfile);
router.post('/:profileId/communication-preferences', addOrUpdateCommunicationPreferences);

export default router;
