import httpFormatter from '../../../utils/formatter.js';
import Profile from '../../models/profile.js';
import User from '../../models/user.js'; 
import StatusCodes from 'http-status-codes';
import logger from '../../../config/logger.js';
import CommunicationPreference from '../../models/communicationPreference.js'; 
import SavedContact from '../../models/savedContact.js'; 

export const addOrUpdateCommunicationPreferences = async (req, res) => {
    try {
        const { profileId } = req.params;
        const { preferences } = req.body;

        if (!preferences) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                httpFormatter({}, 'Preferences are required', false)
            );
        }

        const profile = await Profile.findById(profileId);
        if (!profile) {
            return res.status(StatusCodes.NOT_FOUND).json(
                httpFormatter({}, 'Profile not found', false)
            );
        }

        const userId = profile.user;

        let existingPreferences = await CommunicationPreference.findOne({ profile: profileId });

        if (existingPreferences) {
            existingPreferences.preferences = preferences;
            await existingPreferences.save();

            return res.status(StatusCodes.OK).json(
                httpFormatter({ preferences: existingPreferences }, 'Preferences updated successfully', true)
            );
        } else {
            const newPreferences = await CommunicationPreference.create({ user: userId, preferences });

            return res.status(StatusCodes.CREATED).json(
                httpFormatter({ preferences: newPreferences }, 'Preferences created successfully', true)
            );
        }

    } catch (error) {
        logger.error('Error adding or updating communication preferences:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            httpFormatter({}, 'Internal server error', false)
        );
    }
};


// Add profile details
export const addProfileDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const { fullName, email, preferredLanguage, address, profilePhoto, phoneNumber } = req.body;

        if (!fullName || !email || !address || !address.line1 || !address.pincode || !phoneNumber) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Required fields are missing', false));
        }

        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'User not found', false));
        }

        const profileData = {
            fullName,
            email,
            preferredLanguage,
            address,
            profilePhoto,
            user: userId, 
            phoneNumber
        };

        const savedProfile = await Profile.create(profileData);

        return res.status(StatusCodes.CREATED).json(httpFormatter({ profile: savedProfile }, 'Profile created successfully', true));
    } catch (error) {
        logger.error('Error adding profile details:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};


// Get profile by ID
export const getProfileById = async (req, res) => {
    try {
        const { profileId } = req.params;
        const profile = await Profile.findById(profileId);

        if (!profile) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Profile not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ profile }, 'Profile retrieved successfully', true));
    } catch (error) {
        logger.error('Error retrieving profile:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Update profile details
export const updateProfileDetails = async (req, res) => {
    try {
        const { profileId } = req.params;
        const updates = req.body;

        const updatedProfile = await Profile.findByIdAndUpdate(profileId, updates, { new: true, runValidators: true });

        if (!updatedProfile) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Profile not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ profile: updatedProfile }, 'Profile updated successfully', true));
    } catch (error) {
        logger.error('Error updating profile details:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Delete profile by ID
export const deleteProfile = async (req, res) => {
    try {
        const { profileId } = req.params;

        const deletedProfile = await Profile.findByIdAndDelete(profileId);

        if (!deletedProfile) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Profile not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({}, 'Profile deleted successfully', true));
    } catch (error) {
        logger.error('Error deleting profile:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const addContact = async (req, res) => {
    try {
        const { profileId } = req.params;
        const { salutation, firstName, surname, dob, passport } = req.body;

        if (!salutation || !firstName || !passport?.passportNumber || !passport?.expiryDate) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                httpFormatter({}, 'Required fields are missing', false)
            );
        }

        const profile = await Profile.findById(profileId);
        if (!profile) {
            return res.status(StatusCodes.NOT_FOUND).json(
                httpFormatter({}, 'Profile not found', false)
            );
        }

        const userId = profile.user;

        const contactData = {
            user: userId,
            salutation,
            firstName,
            surname,
            dob,
            passport: {
                passportNumber: passport.passportNumber,
                expiryDate: passport.expiryDate
            }
        };

        const savedContact = await SavedContact.create( contactData );

        return res.status(StatusCodes.CREATED).json(
            httpFormatter({ contact: savedContact }, 'Contact saved successfully', true)
        );
    } catch (error) {
        logger.error('Error adding contact:', error);
        console.log(error)
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
            httpFormatter({}, 'Internal server error', false)
        );
    }
};