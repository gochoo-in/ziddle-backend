import express from 'express';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';
import { createBasicAdminPackage, getAllAdminPackages, addDetailsToAdminPackage, getAdminPackageActivityDetailsById, getAdminPackageById, toggleAdminPackageActiveStatus, getAdminPackagesByDestinationId } from './adminPackages.controller.js';

const router = express.Router();

router.get('/packages', getAllAdminPackages);
router.get('/packages/destination/:destinationId', getAdminPackagesByDestinationId); 
router.post('/package/basic', casbinMiddleware, createBasicAdminPackage);
router.post('/package/details', casbinMiddleware, addDetailsToAdminPackage);
router.patch('/package/:adminPackageId/toggleAdminPackageStatus', toggleAdminPackageActiveStatus);
router.get('/package/activity/:gptActivityId', casbinMiddleware, getAdminPackageActivityDetailsById);
router.get('/package/:adminPackageId', casbinMiddleware, getAdminPackageById);

export default router;
