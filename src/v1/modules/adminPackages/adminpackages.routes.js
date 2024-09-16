import express from 'express';
import { createPackageTemplate , getFilteredPackages,updatePackageTemplate,deletePackageTemplate } from './adminPackages.controller.js';

const router = express.Router();

// Route to create a new package template
router.post('/:employeeId/package', createPackageTemplate);
router.get('/packages', getFilteredPackages);
router.patch('/:employeeId/package/:packageId', updatePackageTemplate);

router.delete('/:employeeId/package/:packageId', deletePackageTemplate);

export default router;
