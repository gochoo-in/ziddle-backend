import express from 'express';
import { addSection, getAllSections, getSectionById, updateSection, deleteSection } from './category.controller.js'; 
import { categorySectionValidation } from '../../validation/index.js'
import validate from '../../../utils/validate.js';
const router = express.Router();

router.post('/', validate(categorySectionValidation),  addSection);
router.get('/',  getAllSections);
router.get('/:sectionId',  getSectionById);
router.patch('/:sectionId',  updateSection);
router.delete('/:sectionId',  deleteSection);

export default router;
