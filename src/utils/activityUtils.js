import GptActivity from '../v1/models/gptactivity.js';

// Function to create leisure activity if it does not exist
export const createLeisureActivityIfNotExist = async (cityId) => {
  
    const leisureActivity = await GptActivity.create({
      name: 'Leisure Activity',
      startTime: '00:00',
      endTime: '23:59',
      duration: 'Full day',
      timeStamp: new Date().toISOString(),
      category: 'Leisure',
      cityId: cityId,
    });
  

  return leisureActivity._id;
};
