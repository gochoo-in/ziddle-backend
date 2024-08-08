import Joi from 'joi';
import {constants}  from '../../utils/constants'

const headersContantlangAndAuthentication ={
    headers:Joi.object().keys({
        'contentlanguage': Joi.string().required().description('lang'),
        authorization: Joi.string().required().description('Bearer Token'),
    })
}

const headersAll ={
    headers:Joi.object().keys({
        'devicetype': Joi.string().valid(...Object.keys(constants.DEVICE_TYPE)).required().error((er)=>{return constants.MESSAGE.INVALID_HEADERS}),
        utcoffset: Joi.number().required().description('utc offset').error((er)=>{return constants.MESSAGE.INVALID_HEADERS}),
        authorization: Joi.string().required().description('Bearer Token').error((er)=>{return constants.MESSAGE.INVALID_HEADERS}),
        'contentlanguage': Joi.string().required().description('lang').error((er)=>{return constants.MESSAGE.INVALID_HEADERS}),
     })
}

export default {
    headersAll,
    headersContantlangAndAuthentication
}