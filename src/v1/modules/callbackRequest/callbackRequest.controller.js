import { StatusCodes } from "http-status-codes";
import httpFormatter from "../../../utils/formatter.js";
import CallbackRequest from "../../models/requestCallback.js";

export const callbackRequest = async(req,res,next) => {
    try{
        const { fullName, email, phoneNumber, destination } = req.body;
    if(!fullName){
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Full name is required', false));
    }
    if(!email){
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Email is required', false));
    }
    if(!phoneNumber){
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'phoneNumber is required', false));
    }
    if(!destination){
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Full name is required', false));
    }

    const data = await CallbackRequest.create({fullName, email, phoneNumber, destination});
    return res.status(StatusCodes.CREATED).json(httpFormatter({ data }, 'Callback request sent sucessfully', true));
    }
    catch(error){
        console.error('Error sending callback request:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};