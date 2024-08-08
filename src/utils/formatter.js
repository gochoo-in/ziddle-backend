const httpFormatter = (data, message = 'ok', success = true) => {
    if (success === false && data.code === 11000) {
        message = ``;
        Object.keys(data.keyValue).forEach(key => {
            message += `${key} : ${data.keyValue[key]} already exist in our record. `
        })
    }
    if (success === false && data.name === "ValidationError") message = {message};
    return { message, data, success };
}

export default  httpFormatter;