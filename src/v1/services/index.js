import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../../config/logger.js'; // Import your logger

dotenv.config();

const messageAuthKey = process.env.MESSAGE_AUTH_KEY;
const messageTemplate = process.env.MESSAGE_TEMPLATE;

export const prependCountryCode = (phoneNumber) => {
    return `91${phoneNumber}`;
};

export const sendOTPMessage = async (otp, phoneNumber) => {
    const mobileWithCountryCode = prependCountryCode(phoneNumber);

    const options = {
        method: 'POST',
        url: 'https://control.msg91.com/api/v5/flow',
        headers: {
            authkey: messageAuthKey,
            accept: 'application/json',
            'content-type': 'application/json',
        },
        data: {
            template_id: messageTemplate,
            short_url: '1',
            realTimeResponse: '1',
            recipients: [
                {
                    mobiles: mobileWithCountryCode,
                    OTP: otp,
                },
            ],
        },
    };

    try {
        const response = await axios.request(options);
        logger.info('Message sent successfully', { response: response.data });
    } catch (error) {
        logger.error('Error sending message', { error: error.message });
    }
};
