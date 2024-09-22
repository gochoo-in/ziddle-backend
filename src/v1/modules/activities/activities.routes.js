import express from 'express';
import { addActivity,updateActivity ,deleteActivity, getActivity, toggleActivityActiveStatus} from './activities.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';

const router = express.Router();
router.get('/:activityId', getActivity)
router.post('/', casbinMiddleware,  addActivity); 
router.patch('/:activityId', casbinMiddleware,  updateActivity);
router.delete('/:activityId', casbinMiddleware, deleteActivity);

router.patch('/:id/toggle-activity-active',toggleActivityActiveStatus)

export default router;
