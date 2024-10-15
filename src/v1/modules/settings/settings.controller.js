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
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
            });
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

        res.status(201).json({
            success: true,
            message: 'Settings added successfully',
            data: savedSettings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error adding settings',
            error: error.message
        });
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
            return res.status(404).json({
                success: false,
                message: 'Settings not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: updatedSettings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error updating settings',
            error: error.message
        });
    }
};

export const getSettings = async (req, res) => {
    try {
        const { id } = req.params;

        let settings;
        if (id) {
            settings = await Settings.findById(id);
            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'Settings not found'
                });
            }
        } else {
            settings = await Settings.find();
        }

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error fetching settings',
            error: error.message
        });
    }
};