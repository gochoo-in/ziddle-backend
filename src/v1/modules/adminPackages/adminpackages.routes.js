import express from 'express';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';
import { createBasicAdminPackage, addDetailsToAdminPackage, getGptActivityDetailsById, getAdminPackageById } from './adminPackages.controller.js';

const router = express.Router();

router.post('/package/basic', casbinMiddleware, createBasicAdminPackage);

router.post('/package/details', casbinMiddleware, addDetailsToAdminPackage);

router.get('/package/activity/:gptActivityId', casbinMiddleware, getGptActivityDetailsById);

router.get('/package/:adminPackageId', casbinMiddleware, getAdminPackageById);

export default router;
