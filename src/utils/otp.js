export const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000); 
    return otp.toString();
};

export const isOTPExpired = (expiryDate) => {
    return new Date() > expiryDate; 
};
