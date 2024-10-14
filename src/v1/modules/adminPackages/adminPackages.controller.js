import AdminPackage from '../../models/adminPackage.js';
import AdminPackageActivity from '../../models/adminPackageActivity.js';
import Destination from '../../models/destination.js';
import City from '../../models/city.js';
import Activity from '../../models/activity.js';
import Hotel from '../../models/hotel.js';
import fetchHotelDetails from '../../services/hotelDetails.js';
import mongoose from 'mongoose';
import { addDatesToItinerary } from '../../../utils/dateUtils.js'; 
import moment from 'moment'
import { addHotelDetailsToItinerary } from '../../services/hotelDetails.js';


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

    // Process each city and its details
    const citiesWithDetails = await Promise.all(
      cities.map(async (city, index) => {
        const cityRecord = await City.findById(city.cityId);
        if (!cityRecord) {
          throw new Error(`City with ID ${city.cityId} not found`);
        }

        const updatedDays = [];
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

            const dayEntry = {
              date: moment(day.date).format('YYYY-MM-DD'), // Store the date directly
              activities: processedActivities,
            };

            updatedDays.push(dayEntry);
            return dayEntry;
          })
        );

        // If not the first city, add travel activity
        if (index > 0) {
          const prevCity = await City.findById(cities[index - 1].cityId);
          const travelActivity = new AdminPackageActivity({
            name: `Travel from ${prevCity.name} to ${cityRecord.name}`,
            duration: '3 hours', // Hardcoded duration
            category: 'Travel',
            cityId: city.cityId,
            startTime: '09:00 AM', // Hardcoded start time
            endTime: '12:00 PM',   // Hardcoded end time
          });
          const savedTravelActivity = await travelActivity.save();

          updatedDays.unshift({
            date: moment(updatedDays[0].date).subtract(1, 'days').format('YYYY-MM-DD'), // Previous date
            activities: [savedTravelActivity._id],
          });
        }

        return {
          city: city.cityId,
          stayDays: updatedDays.length,
          days: updatedDays,
          transportToNextCity: {
            mode: city.transportToNextCity.mode,
          },
          hotelDetails: null, // Placeholder, to be filled later
        };
      })
    );

    // Now that we have the base city details, we can proceed with adding hotel details.
    let itineraryWithHotelDetails = {
      itinerary: citiesWithDetails
    };

    const adults = 1 
    const childrenAges = []
    const rooms = 1

    itineraryWithHotelDetails = await addHotelDetailsToItinerary(
      itineraryWithHotelDetails,
      adults,
      childrenAges,
      rooms
    );

    const startDate = adminPackage.startDate;
    const updatedItineraryData = addDatesToItinerary(itineraryWithHotelDetails, startDate);

    let dayCounter = 1;
    for (const city of updatedItineraryData.itinerary) {
      for (const day of city.days) {
        day.day = dayCounter++; 
      }
    }

    adminPackage.cities = updatedItineraryData.itinerary;
    await adminPackage.save();

    return res.status(200).json({
      message: 'Admin package updated with details and hotel information successfully',
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

export const getAllAdminPackages = async (req, res) => {
  try {
    const { active } = req.query;

    let query = {};

    if (active === 'true') {
      query.active = true;
    } else if (active === 'false') {
      query.active = false;
    }

    const adminPackages = await AdminPackage.find(query);

    return res.status(200).json({
      data: adminPackages,
      message: 'Admin packages retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving admin packages:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


export const toggleAdminPackageActiveStatus = async (req, res) => {
  const { adminPackageId } = req.params;

  try {
    const adminPackage = await AdminPackage.findById(adminPackageId);
    
    if (!adminPackage) {
      return res.status(404).json({ message: 'Admin package not found' });
    }

    adminPackage.active = !adminPackage.active;

    await adminPackage.updateOne({ active: adminPackage.active }); 

    return res.status(200).json({
      success: true,
      message: `Admin package ${adminPackage.active ? 'activated' : 'deactivated'} successfully`,
      active: adminPackage.active,
    });
  } catch (error) {
    console.error('Error toggling admin package status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdminPackagesByDestinationId = async (req, res) => {
  const { destinationId } = req.params; 

  try {
    const adminPackages = await AdminPackage.find({ destination: destinationId });

    if (adminPackages.length === 0) {
      return res.status(404).json({ message: 'No admin packages found for this destination' });
    }

    return res.status(200).json({
      message: 'Admin packages retrieved successfully',
      data: adminPackages,
    });
  } catch (error) {
    console.error('Error retrieving admin packages by destination ID:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
