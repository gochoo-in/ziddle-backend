import express from 'express';
import {
    addDiscount,
    updateDiscount,
    getAllDiscounts,
    getDiscounts,
    applyDiscount,
    getDiscountsByDestination
} from './discount.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js'

const router = express.Router();

router.post('/', casbinMiddleware, addDiscount);

router.patch('/:id', casbinMiddleware, updateDiscount);

router.post('/apply', applyDiscount);

router.get('/', casbinMiddleware, getAllDiscounts);

router.get('/:id?', casbinMiddleware, getDiscounts);

router.get('/destination/:destinationId', getDiscountsByDestination);


export default router;
