import GptActivity from '../v1/models/gptactivity.js';

// Function to create leisure activity if it does not exist
export const createLeisureActivityIfNotExist = async (cityId) => {
  
    const leisureActivity = await GptActivity.create({
      name: 'Leisure',
      startTime: '10:00 AM',
      endTime: '5:00 PM',
      duration: '7 hours',
      timeStamp: 'All day',
      category: 'Leisure',
      cityId: cityId,
    });
  

  return leisureActivity._id;
};
