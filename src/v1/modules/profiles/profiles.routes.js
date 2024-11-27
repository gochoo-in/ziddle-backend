import express from 'express';
import { 
    addProfileDetails, 
    getProfileById, 
    updateProfileDetails, 
    deleteProfile,
    upsertCommunicationPreferences,
    getCommunicationPreferences,
    addContact,
    getContacts,
    updateContact,
    deleteContact
} from './profiles.controller.js';
import { verifyToken } from '../../../utils/token.js';


const router = express.Router();

router.post('/:userId', verifyToken, addProfileDetails);
router.get('/:userId', getProfileById);
router.patch('/:userId', verifyToken, updateProfileDetails);
router.delete('/:userId', verifyToken, deleteProfile);
router.get('/:userId/getCommunicationPreferences', getCommunicationPreferences)
router.post('/:userId/communicationPreferences', verifyToken, upsertCommunicationPreferences);
router.post('/:userId/addContact', verifyToken, addContact)
router.get('/:userId/contact', getContacts)
router.patch('/:userId/contact/:contactId', verifyToken, updateContact);
router.delete('/:userId/contact/:contactId', verifyToken, deleteContact);


export default router;
