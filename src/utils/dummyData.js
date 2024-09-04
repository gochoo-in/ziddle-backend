export function addGeneralDummyData(itinerary) {
    itinerary.itinerary.forEach(segment => {
      if (segment.transport) {
        const mode = segment.transport.mode;
  
        // Get transport details only if mode is defined
        segment.transport.modeDetails = getDummyTransportDetails(mode, segment);
      } else {
        // Handle cases where segment.transport is null or undefined
        segment.transport = {
          modeDetails: { message: 'Transport details are not available' }
        };
      }
      // Add hotel booking details
      segment.hotelDetails = [
        {
          hotelName: "Hotel Sonnenberg",
          checkInDate: "2024-08-02",
          checkOutDate: "2024-08-03",
          location: "Near Natur-Museum",
          rooms: [
            {
              roomName: "Room 1",
              type: "Single room",
              area: "86 sqft",
              accommodates: "1 adult",
              bedType: "1 Queen bed",
              nonRefundable: true,
              amenities: [
                "Wifi",
                "Breakfast",
                "Air conditioner",
                "Elevator",
                "Pets allowed"
              ],
              rating: 3,
              starRating: "3 star",
              roomCategory: "Luxe"
            },
            {
              roomName: "Room 2",
              type: "Single room",
              area: "86 sqft",
              accommodates: "1 adult",
              bedType: "1 Twin bed",
              nonRefundable: false,
              amenities: [
                "Wifi",
                "Breakfast",
                "Air conditioner",
                "Elevator",
                "Pets allowed"
              ],
              additionalFacilities: 8,
              rating: 3,
              starRating: "3 star",
              roomCategory: "Luxe"
            }
          ]
        }
      ];
    });
  
    return itinerary;
  }
  function getDummyTransportDetails(mode, segment) {
    if (!mode) {
      // Handle the case where mode is null or undefined
      return {
        message: 'Transport mode is not specified'
      };
    }
    switch (mode) {
      case 'Ferry':
        return {
          ferryNumber: `FR${Math.floor(Math.random() * 1000)}`,
          departure: `${segment.current_city} Pier`,
          arrival: `${segment.current_city} Island Pier`,
          departureTime: `${segment.days[0].date}T08:00:00`, // Use segment.date if available
          arrivalTime: `${segment.days[0].date}T10:30:00`,  // Use segment.date if available
          duration: '2 hours 30 minutes',
          refundable: true
        };
      case 'Car':
        return {
          carNumber: `CAR${Math.floor(Math.random() * 1000)}`,
          pickupPoint: `${segment.current_city} Hotel`,
          dropOffPoint: `${segment.current_city} Market`,
          pickupTime: `${segment.days[0].date}T08:00:00`,  // Use segment.date if available
          dropOffTime: `${segment.days[0].date}T08:30:00`, // Use segment.date if available
          duration: '30 minutes',
          refundable: true
        };
      case 'Train':
        return {
          trainNumber: `TR${Math.floor(Math.random() * 1000)}`,
          departure: `${segment.current_city} Station`,
          arrival: `Next City Station`,
          departureTime: `${segment.days[0].date}T10:00:00`,  // Use segment.date if available
          arrivalTime: `${segment.days[0].date}T18:00:00`,  // Use segment.date if available
          duration: '8 hours',
          refundable: true
        };
        case 'Flight':
        return segment.transport.modeDetails || { message: 'No transport details available for mode: Flight' };
      default:
        return {
          message: `No transport details available for mode`
        };
    }
  }
  