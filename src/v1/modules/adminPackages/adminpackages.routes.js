import express from 'express';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';
import { 
  createBasicAdminPackage,
  addDaysToAdminPackage,
  deleteDaysFromAdminPackage,
  getAllAdminPackages,
  addDetailsToAdminPackage,
  getAdminPackageActivityDetailsById,
  getAdminPackageById,
  toggleAdminPackageActiveStatus,
  getAdminPackagesByDestinationId,
  getAdminPackagesByCategory
} from './adminPackages.controller.js';

const router = express.Router();

router.get('/packages', getAllAdminPackages);
router.get('/packages/destination/:destinationId', getAdminPackagesByDestinationId); 
router.post('/package/basic', casbinMiddleware, createBasicAdminPackage);
router.post('/package/details', casbinMiddleware, addDetailsToAdminPackage);
router.patch('/package/:adminPackageId/addDays/:cityIndex', casbinMiddleware, addDaysToAdminPackage);
router.patch('/package/:adminPackageId/deleteDays/:cityIndex', casbinMiddleware, deleteDaysFromAdminPackage);
router.patch('/package/:adminPackageId/toggleAdminPackageStatus', toggleAdminPackageActiveStatus);
router.get('/package/activity/:gptActivityId', casbinMiddleware, getAdminPackageActivityDetailsById);
router.get('/package/:adminPackageId', casbinMiddleware, getAdminPackageById);
router.get('/packages/category/:category', getAdminPackagesByCategory);


export default router;
