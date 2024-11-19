import express from 'express';
import {
    addDiscount,
    updateDiscount,
    getAllDiscounts,
    getDiscounts,
    applyDiscount,
    getDiscountsByDestination,
    toggleArchivedStatus,
    toggleActiveStatus,
    deleteDiscount
} from './discount.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js'

const router = express.Router();

router.post('/', casbinMiddleware, addDiscount);

router.patch('/:id/archive', casbinMiddleware, toggleArchivedStatus);

router.patch('/:id/active', casbinMiddleware, toggleActiveStatus);

router.patch('/:id', casbinMiddleware, updateDiscount);

router.post('/apply', applyDiscount);

router.get('/', casbinMiddleware, getAllDiscounts);

router.get('/:id', getDiscounts);

router.get('/destination/:destinationId', getDiscountsByDestination);

router.delete("/:id", casbinMiddleware, deleteDiscount);

export default router;
