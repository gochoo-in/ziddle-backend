import express from 'express';
import { 
    addProfileDetails, 
    getProfileById, 
    updateProfileDetails, 
    deleteProfile,
    addOrUpdateCommunicationPreferences,
    addContact,
    getContacts,
    updateContact,
    deleteContact
} from './profiles.controller.js';


const router = express.Router();

router.post('/:userId', addProfileDetails);
router.get('/:userId', getProfileById);
router.patch('/:userId', updateProfileDetails);
router.delete('/:userId', deleteProfile);
router.post('/:userId/communicationPreferences', addOrUpdateCommunicationPreferences);
router.post('/:userId/addContact', addContact)
router.get('/:userId/contact', getContacts)
router.patch('/:userId/contact/:contactId', updateContact);
router.delete('/:userId/contact/:contactId', deleteContact);


export default router;
