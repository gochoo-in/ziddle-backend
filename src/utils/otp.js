export const generateOTP = () => {
    // const otp = Math.floor(1000 + Math.random() * 9000); 
    // return otp.toString();
    return '1111'
};

export const isOTPExpired = (expiryDate) => {
    return new Date() > expiryDate; 
};
