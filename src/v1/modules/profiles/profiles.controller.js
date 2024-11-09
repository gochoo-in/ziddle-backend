import httpFormatter from '../../../utils/formatter.js';
import Profile from '../../models/profile.js';
import User from '../../models/user.js'; 
import StatusCodes from 'http-status-codes';
import logger from '../../../config/logger.js';
import CommunicationPreference from '../../models/communicationPreference.js'; 
import SavedContact from '../../models/savedContact.js'; 

// Add or update communication preferences using userId
export const addOrUpdateCommunicationPreferences = async (req, res) => {
    try {
        const { userId } = req.params;  // changed from profileId to userId
        const { preferences } = req.body;

        if (!preferences) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                httpFormatter({}, 'Preferences are required', false)
            );
        }

        const profile = await Profile.findOne({ user: userId });
        if (!profile) {
            return res.status(StatusCodes.NOT_FOUND).json(
                httpFormatter({}, 'Profile not found', false)
            );
        }

        let existingPreferences = await CommunicationPreference.findOne({ profile: profile._id });

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

export const addProfileDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const { preferredLanguage, address, profilePhoto } = req.body;

        if (!address || !address.line1 || !address.pincode) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Required fields are missing', false));
        }

        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'User not found', false));
        }

        // Use fullName, email, and phoneNumber from the User table
        const profileData = {
            fullName: `${userExists.firstName} ${userExists.lastName}`,  // assuming full name is a combination of first and last names
            email: userExists.email,
            phoneNumber: userExists.phoneNumber,
            preferredLanguage,
            address,
            profilePhoto,
            user: userId
        };

        const savedProfile = await Profile.create(profileData);

        return res.status(StatusCodes.CREATED).json(httpFormatter({ profile: savedProfile }, 'Profile created successfully', true));
    } catch (error) {
        logger.error('Error adding profile details:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const getProfileById = async (req, res) => {
    try {
        const { userId } = req.params;

        const profile = await Profile.findOne({ user: userId });

        if (profile) {
            return res.status(StatusCodes.OK).json(httpFormatter({
                profile: {
                    address: profile.address,
                    _id: profile._id,
                    fullName: profile.fullName,
                    email: profile.email,
                    preferredLanguage: profile.preferredLanguage,
                    profilePhoto: profile.profilePhoto,
                    phoneNumber: profile.phoneNumber,
                    user: profile.user,
                    createdAt: profile.createdAt,
                    updatedAt: profile.updatedAt
                }
            }, 'Profile retrieved successfully', true));
        } else {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'User not found', false));
            }

            const userProfile = {
                _id: userId,
                fullName: `${user.firstName} ${user.lastName}`,
                phoneNumber: user.phoneNumber,
                email: user.email,
                address: {}, 
                preferredLanguage: '',
                profilePhoto: '',
                user: userId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };

            return res.status(StatusCodes.OK).json(httpFormatter({
                profile: userProfile
            }, 'Profile retrieved successfully', true));
        }
    } catch (error) {
        logger.error('Error retrieving profile:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};


export const updateProfileDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        // Check if the profile exists
        const profile = await Profile.findOne({ user: userId });
        if (!profile) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Profile not found', false));
        }

        // Update the Profile document
        const updatedProfile = await Profile.findOneAndUpdate(
            { user: userId },
            updates,
            { new: true, runValidators: true }
        );

        // Update User table if specific fields are included in the updates
        const userUpdates = {};
        if (updates.fullName) {
            const [firstName, ...lastName] = updates.fullName.split(' ');
            userUpdates.firstName = firstName;
            userUpdates.lastName = lastName.join(' ') || '';
        }
        if (updates.email) {
            userUpdates.email = updates.email;
        }
        if (updates.phoneNumber) {
            userUpdates.phoneNumber = updates.phoneNumber;
        }

        // If user updates are present, update the User table
        if (Object.keys(userUpdates).length > 0) {
            await User.findByIdAndUpdate(userId, userUpdates, { new: true });
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ profile: updatedProfile }, 'Profile updated successfully', true));
    } catch (error) {
        logger.error('Error updating profile details:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Delete profile by userId
export const deleteProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const deletedProfile = await Profile.findOneAndDelete({ user: userId });

        if (!deletedProfile) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Profile not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({}, 'Profile deleted successfully', true));
    } catch (error) {
        logger.error('Error deleting profile:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Add contact by userId
export const addContact = async (req, res) => {
    try {
        const { userId } = req.params;
        const { salutation, firstName, surname, dob, passport } = req.body;

        if (!salutation || !firstName || !passport?.passportNumber || !passport?.expiryDate) {
            return res.status(StatusCodes.BAD_REQUEST).json(
                httpFormatter({}, 'Required fields are missing', false)
            );
        }

        const profile = await Profile.findOne({ user: userId });
        if (!profile) {
            return res.status(StatusCodes.NOT_FOUND).json(
                httpFormatter({}, 'Profile not found', false)
            );
        }

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

        const savedContact = await SavedContact.create(contactData);

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
