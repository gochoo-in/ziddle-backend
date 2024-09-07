import express from 'express';
import { addSection, getAllSections, getSectionById, updateSection, deleteSection } from './category.controller.js'; 
import { categorySectionValidation } from '../../validation/index.js'
import validate from '../../../utils/validate.js';
import isAdmin from '../../../utils/middleware.js';
const router = express.Router();

router.post('/', validate(categorySectionValidation), isAdmin, addSection);
router.get('/', isAdmin, getAllSections);
router.get('/:sectionId', isAdmin, getSectionById);
router.patch('/:sectionId', isAdmin, updateSection);
router.delete('/:sectionId', isAdmin, deleteSection);

export default router;
