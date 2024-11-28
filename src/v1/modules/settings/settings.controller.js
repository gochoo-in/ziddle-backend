import httpFormatter from '../../../utils/formatter.js';
import StatusCodes from 'http-status-codes';
import Settings from '../../models/settings.js'; 

export const addSettings = async (req, res) => {
    try {
        const { 
            flightMarkup, 
            taxiMarkup, 
            ferryMarkup, 
            interantionalFlightMarkup,  
            stayMarkup, 
            serviceFee, 
            orderPercentageReferringUser, 
            orderPercentageReferredUser, 
            maxAmount 
        } = req.body;

        if (
            flightMarkup === undefined ||
            taxiMarkup === undefined ||
            ferryMarkup === undefined ||
            interantionalFlightMarkup === undefined ||
            stayMarkup === undefined ||
            serviceFee === undefined ||
            orderPercentageReferringUser === undefined ||
            orderPercentageReferredUser === undefined ||
            maxAmount === undefined
        ) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                httpFormatter({}, 'All fields are required', false)
            );
        }

        const newSettings = new Settings({
            flightMarkup,
            taxiMarkup,
            ferryMarkup,
            interantionalFlightMarkup, 
            stayMarkup,
            serviceFee,
            orderPercentageReferringUser,
            orderPercentageReferredUser,
            maxAmount
        });

        const savedSettings = await newSettings.save();

        return res.status(StatusCodes.CREATED).json(
            httpFormatter({ data: savedSettings }, 'Settings added successfully', true)
        );
    } catch (error) {
        console.error('Error adding settings:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            httpFormatter({}, 'Error adding settings', false)
        );
    }
};

export const updateSettings = async (req, res) => {
    try {
        const { id } = req.params; 
        const { 
            flightMarkup, 
            taxiMarkup, 
            ferryMarkup, 
            interantionalFlightMarkup, 
            stayMarkup, 
            serviceFee, 
            orderPercentageReferringUser, 
            orderPercentageReferredUser, 
            maxAmount 
        } = req.body;

        const updatedSettings = await Settings.findByIdAndUpdate(
            id,
            {
                flightMarkup,
                taxiMarkup,
                ferryMarkup,
                interantionalFlightMarkup,
                stayMarkup,
                serviceFee,
                orderPercentageReferringUser,
                orderPercentageReferredUser,
                maxAmount
            },
            { new: true } 
        );

        if (!updatedSettings) {
            return res.status(StatusCodes.NOT_FOUND).json(
                httpFormatter({}, 'Settings not found', false)
            );
        }

        return res.status(StatusCodes.OK).json(
            httpFormatter({ data: updatedSettings }, 'Settings updated successfully', true)
        );
    } catch (error) {
        console.error('Error updating settings:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            httpFormatter({}, 'Error updating settings', false)
        );
    }
};

export const getSettings = async (req, res) => {
    try {
        const { id } = req.params;

        let settings;
        if (id) {
            settings = await Settings.findById(id);
            if (!settings) {
                return res.status(StatusCodes.NOT_FOUND).json(
                    httpFormatter({}, 'Settings not found', false)
                );
            }
        } else {
            settings = await Settings.find();
        }

        return res.status(StatusCodes.OK).json(
            httpFormatter({ data: settings }, 'Settings retrieved successfully', true)
        );
    } catch (error) {
        console.error('Error fetching settings:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            httpFormatter({}, 'Error fetching settings', false)
        );
    }
};
