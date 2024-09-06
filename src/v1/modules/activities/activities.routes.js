import express from 'express';
import { addActivity,updateActivity ,deleteActivity, getActivity} from './activities.controller.js';
import isAdmin from '../../../utils/middleware.js';

const router = express.Router();
router.get('/:activityId',getActivity)
router.post('/', isAdmin, addActivity); 
router.patch('/:activityId', isAdmin, updateActivity);
router.delete('/:activityId', isAdmin, deleteActivity);

export default router;
