import express from 'express';
import { addActivity,updateActivity ,deleteActivity, getActivity} from './activities.controller.js';

const router = express.Router();
router.get('/:activityId',getActivity)
router.post('/',  addActivity); 
router.patch('/:activityId',  updateActivity);
router.delete('/:activityId', deleteActivity);

export default router;
