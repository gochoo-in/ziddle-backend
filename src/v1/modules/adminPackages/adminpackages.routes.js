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
  getAdminPackagesByCategory,
  getAllAdminPackageActivities,
  deleteAdminPackageById,
  createUserItinerary,
  addGeneralDiscount,
  getAdminPackagesByMaxBudget
} from './adminPackages.controller.js';
import { verifyToken } from '../../../utils/token.js';

const router = express.Router();

router.get('/packages', getAllAdminPackages);
router.get('/packages/destination/:destinationId', getAdminPackagesByDestinationId); 
router.get('/packages/budget', getAdminPackagesByMaxBudget);
router.post('/package/basic', casbinMiddleware, createBasicAdminPackage);
router.post('/package/details', casbinMiddleware, addDetailsToAdminPackage);
router.patch('/package/:adminPackageId/addDays/:cityIndex', casbinMiddleware, addDaysToAdminPackage);
router.patch('/package/:adminPackageId/deleteDays/:cityIndex', casbinMiddleware, deleteDaysFromAdminPackage);
router.patch('/package/:adminPackageId/toggleAdminPackageStatus', casbinMiddleware, toggleAdminPackageActiveStatus);
router.get('/package/activity/:AdminPackageActivityId', casbinMiddleware, getAdminPackageActivityDetailsById);
router.get('/package/:adminPackageId', getAdminPackageById);
router.get('/packages/category/:category', getAdminPackagesByCategory);
router.get('/package/:packageId/activities', getAllAdminPackageActivities );
router.delete('/packages/:adminPackageId', casbinMiddleware, deleteAdminPackageById);
router.post('/package/:adminPackageId/itinerary', verifyToken, createUserItinerary);
router.patch('/package/:adminPackageId/itinerary/:itineraryId/addCoupon/:discountId', verifyToken, addGeneralDiscount)


export default router;
