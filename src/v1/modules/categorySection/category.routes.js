import express from 'express';
import { addSection, getAllSections, getSectionById, updateSection, deleteSection } from './category.controller.js'; 
import { categorySectionValidation } from '../../validation/index.js'
import validate from '../../../utils/validate.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js'
const router = express.Router();

router.post('/', validate(categorySectionValidation), casbinMiddleware,  addSection);
router.get('/',  getAllSections);
router.get('/:sectionId',  getSectionById);
router.patch('/:sectionId', casbinMiddleware,  updateSection);
router.delete('/:sectionId', casbinMiddleware,  deleteSection);

export default router;
