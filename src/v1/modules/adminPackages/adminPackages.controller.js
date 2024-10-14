import AdminPackage from '../../models/adminPackage.js';
import AdminPackageActivity from '../../models/adminPackageActivity.js';
import Destination from '../../models/destination.js';
import City from '../../models/city.js';
import Activity from '../../models/activity.js';
import Hotel from '../../models/hotel.js';
import fetchHotelDetails from '../../services/hotelDetails.js';
import mongoose from 'mongoose';

export const createBasicAdminPackage = async (req, res) => {
  try {
    const {
      packageName,
      description,
      destinationId,
      totalDays,
      startDate,
      endDate,
      price,
      createdBy,
    } = req.body;

    const destination = await Destination.findById(destinationId);
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }

    const newAdminPackage = new AdminPackage({
      packageName,
      description,
      destination: destination._id,
      totalDays,
      startDate: startDate,
      endDate: endDate,
      price,
      createdBy,
    });

    const savedPackage = await newAdminPackage.save();

    return res.status(201).json({
      message: 'Basic admin package created successfully',
      adminPackageId: savedPackage._id,
    });
  } catch (error) {
    console.error('Error creating basic admin package:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const addDetailsToAdminPackage = async (req, res) => {
  try {
    const { adminPackageId, cities } = req.body;

    const adminPackage = await AdminPackage.findById(adminPackageId);
    if (!adminPackage) {
      return res.status(404).json({ message: 'Admin package not found' });
    }

    const citiesWithDetails = await Promise.all(
      cities.map(async (city, index) => {
        const cityRecord = await City.findById(city.cityId);
        if (!cityRecord) {
          throw new Error(`City with ID ${city.cityId} not found`);
        }

        const updatedDays = [];

        // Only add the travel activity on Day 1 of cities except the first city
        if (index > 0) {
          const prevCity = await City.findById(cities[index - 1].cityId);
          const travelActivity = new AdminPackageActivity({
            name: `Travel from ${prevCity.name} to ${cityRecord.name}`,
            duration: '3 hours', // Hardcoded duration
            category: 'Travel',
            startTime: '09:00 AM', // Hardcoded start time
            endTime: '12:00 PM',   // Hardcoded end time
            cityId: city.cityId,
          });
          const savedTravelActivity = await travelActivity.save();

          // Add the travel activity as Day 1
          updatedDays.push({
            day: 1,
            activities: [savedTravelActivity._id],
          });

          // Shift the existing activities to subsequent days
          const shiftedActivities = await Promise.all(
            city.days.map(async (day) => {
              const processedActivities = await Promise.all(
                day.activities.map(async ({ activityId, startTime, endTime }) => {
                  const activityDetails = await Activity.findById(activityId);
                  if (!activityDetails) {
                    throw new Error(`Activity with ID ${activityId} not found`);
                  }

                  const newActivity = new AdminPackageActivity({
                    name: activityDetails.name,
                    duration: activityDetails.duration,
                    category: activityDetails.category,
                    cityId: city.cityId,
                    startTime,
                    endTime,
                  });

                  const savedActivity = await newActivity.save();
                  return savedActivity._id;
                })
              );

              return {
                day: day.day + 1, // Increment day number
                activities: processedActivities,
              };
            })
          );

          // Push shifted activities to updatedDays array
          updatedDays.push(...shiftedActivities);
        } else {
          // For the first city, don't add the travel activity, just process normally
          const normalActivities = await Promise.all(
            city.days.map(async (day) => {
              const processedActivities = await Promise.all(
                day.activities.map(async ({ activityId, startTime, endTime }) => {
                  const activityDetails = await Activity.findById(activityId);
                  if (!activityDetails) {
                    throw new Error(`Activity with ID ${activityId} not found`);
                  }

                  const newActivity = new AdminPackageActivity({
                    name: activityDetails.name,
                    duration: activityDetails.duration,
                    category: activityDetails.category,
                    cityId: city.cityId,
                    startTime,
                    endTime,
                  });

                  const savedActivity = await newActivity.save();
                  return savedActivity._id;
                })
              );

              return {
                day: day.day,
                activities: processedActivities,
              };
            })
          );

          updatedDays.push(...normalActivities);
        }

        const arrivalDate = adminPackage.startDate;
        const departureDate = new Date(new Date(arrivalDate).setDate(new Date(arrivalDate).getDate() + updatedDays.length - 1));

        let hotelDetails = null;
        try {
          hotelDetails = await fetchHotelDetails(
            cityRecord.latitude,
            cityRecord.longitude,
            arrivalDate,
            departureDate,
            city.adults || 1,
            city.childrenAges || [],
            city.rooms || 1,
            city.cityId
          );
        } catch (error) {
          console.error('Error fetching hotel details:', error.message);
        }

        let savedHotel = null;
        if (hotelDetails) {
          const newHotel = new Hotel(hotelDetails);
          savedHotel = await newHotel.save();
        }

        return {
          city: city.cityId,
          stayDays: updatedDays.length, // Update stay days to reflect the new number of days
          days: updatedDays,
          transportToNextCity: {
            mode: city.transportToNextCity.mode,
          },
          hotelDetails: savedHotel ? savedHotel._id : null,
        };
      })
    );

    adminPackage.cities = citiesWithDetails;
    await adminPackage.save();

    return res.status(200).json({
      message: 'Admin package updated with details successfully',
      adminPackage,
    });
  } catch (error) {
    console.error('Error adding details to admin package:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


export const getAdminPackageActivityDetailsById = async (req, res) => {
  const { AdminPackageActivityId } = req.params;

  try {
    const AdminPackageActivity = await AdminPackageActivity.findById(AdminPackageActivityId);
    if (!AdminPackageActivity) {
      return res.status(404).json({ message: 'AdminPackageActivity not found' });
    }

    const detailedActivity = await Activity.findOne({ name: AdminPackageActivity.name });

    return res.status(200).json({
      message: 'AdminPackageActivity details retrieved successfully',
      data: {
        AdminPackageActivity,
        detailedActivity: detailedActivity || null,
      },
    });
  } catch (error) {
    console.error('Error retrieving AdminPackageActivity details:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdminPackageById = async (req, res) => {
  const { adminPackageId } = req.params;

  try {
    const adminPackage = await AdminPackage.findById(adminPackageId)
      .populate({
        path: 'cities.city',
        select: '_id',
      })
      .populate({
        path: 'cities.days.activities',
        model: 'AdminPackageActivity',
      })
      .populate({
        path: 'cities.hotelDetails',
        model: 'Hotel',
      });

    if (!adminPackage) {
      return res.status(404).json({ message: 'Admin package not found' });
    }

    const transformedCities = adminPackage.cities.map(city => ({
      transportToNextCity: city.transportToNextCity,
      hotelDetails: city.hotelDetails,
      city: {
        cityId: city.city._id,
      },
      stayDays: city.stayDays,
      days: city.days.map(day => ({
        day: day.day,
        activities: day.activities.map(activity => activity._id),
      })),
    }));

    const response = {
      startDate: adminPackage.startDate,
      endDate: adminPackage.endDate,
      id: adminPackage._id,
      packageName: adminPackage.packageName,
      description: adminPackage.description,
      destination: adminPackage.destination,
      totalDays: adminPackage.totalDays,
      price: adminPackage.price,
      cities: transformedCities,
      imageUrls: adminPackage.imageUrls,
      createdAt: adminPackage.createdAt,
      updatedAt: adminPackage.updatedAt,
      createdBy: adminPackage.createdBy, 
    };
    return res.status(200).json({
      message: 'Admin package retrieved successfully',
      data: response,
    });
  } catch (error) {
    console.error('Error retrieving admin package:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
