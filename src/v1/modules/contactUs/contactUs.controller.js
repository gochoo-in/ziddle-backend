import httpFormatter from "../../../utils/formatter.js";
import { contactUs } from "../../models/contactUs.js";
import { StatusCodes } from "http-status-codes";

export const contactSupport = async(req, res, next) => {
    try{
        const { fullName, email, message } = req.body;

    if(!fullName){
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Full name is required', false));
    }
    if(!email){
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Email is required', false));
    }
    if(!message){
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Contact message is required', false));
    }

    const data = await contactUs.create({fullName, email, message});
    return res.status(StatusCodes.CREATED).json(httpFormatter({ data }, 'Contact support request sent sucessfully', true));
    }
    catch(error){
        console.error('Error contacting GoChoo Support:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
}