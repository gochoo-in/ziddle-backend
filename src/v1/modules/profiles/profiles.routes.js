import express from 'express';
import { addProfileDetails, getProfileById, updateProfileDetails, deleteProfile } from './profiles.controller.js';

const router = express.Router();

router.post('/:userId', addProfileDetails);
router.get('/:profileId', getProfileById);
router.patch('/:profileId', updateProfileDetails);
router.delete('/:profileId', deleteProfile);

export default router;
