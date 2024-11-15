import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import styled from 'styled-components';
import { jwtDecode } from 'jwt-decode';

const HomeContainer = styled.div`
  padding: 20px;
`;

const CalendarWrapper = styled.div`
  margin: 20px 0;
`;

const ServiceSelection = styled.div`
  margin-top: 20px;
`;

const Button = styled.button`
  background-color: #01295F;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background-color: #00509E;
  }
`;

function Home() {
  const [date, setDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [availableHours, setAvailableHours] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [services, setServices] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [workshops, setWorkshops] = useState([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState('');
  const [user, setUser] = useState(null);

  const token = localStorage.getItem('token');
  const userId = token ? jwtDecode(token).nameid : null;

  useEffect(() => {
    if (!userId || !token) return;

    const fetchUserData = async () => {
      try {
        const [userResponse, vehiclesResponse] = await Promise.all([
          axios.get(`http://localhost:5109/api/user/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`http://localhost:5109/api/user/${userId}/vehicles`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setUser(userResponse.data);
        setVehicles(vehiclesResponse.data);
      } catch (error) {
        console.error("Error fetching user data:", error.response?.data || error.message);
      }
    };

    fetchUserData();
  }, [userId, token]);

  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        const response = await axios.get('http://localhost:5109/api/AutoRepairShop/workshops');
        setWorkshops(response.data);
      } catch (error) {
        console.error('Error fetching workshops:', error);
      }
    };

    fetchWorkshops();
  }, []);

  const handleDateChange = async (selectedDate) => {
    setDate(selectedDate);
    if (selectedWorkshop) {
      await fetchAvailableHours(selectedDate);  // Fetch available hours for the new date
    }
  };

  const fetchAvailableHours = async (selectedDate) => {
    if (!selectedWorkshop) return;  // If no workshop is selected, do nothing

    console.log("Fetching available hours for", selectedDate);  // Debugging: Check the selected date

    try {
      const response = await axios.get(
        `http://localhost:5109/api/AutoRepairShop/${selectedWorkshop}/terms`,
        { params: { date: selectedDate.toISOString() } }
      );
      
      console.log("Available hours:", response.data);  // Debugging: Check the response from API
      setAvailableHours(response.data);
    } catch (error) {
      console.error('Error fetching available hours:', error);
      setAvailableHours([]);  // Reset available hours on error
    }
  };

  const handleWorkshopChange = async (e) => {
    const workshopId = e.target.value;
    setSelectedWorkshop(workshopId);
    setAvailableHours([]);  // Reset available hours
    setServices([]);  // Reset services

    if (workshopId && date) {
      await fetchAvailableHours(date);  // Fetch available hours after workshop change
    }

    try {
      const response = await axios.get(`http://localhost:5109/api/AutoRepairShop/${workshopId}/favours`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTime) {
      alert('Proszę wybrać godzinę.');
      return;
    }

    const selectedDateTime = new Date(selectedTime);

    try {
      await axios.post('http://localhost:5109/api/appointments', {
        date: selectedDateTime.toISOString(),
        serviceId: selectedService,
        vehicleId: selectedVehicle,
        workshopId: selectedWorkshop
      });
      alert('Wizyta została umówiona!');
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      alert('Nie udało się umówić wizyty.');
    }
  };

  const handleHourSelection = (hourId) => {
    const selectedHour = availableHours.find((hour) => hour.id === hourId);
    if (selectedHour) {
      setSelectedTime(selectedHour.startDate);
      setSelectedService(selectedHour.serviceId); // Assign service based on selected hour
    }
  };

  return (
    <HomeContainer>
      <h2>Pan Alternator</h2>

      <CalendarWrapper>
        <h3>Wybierz datę naprawy</h3>
        <DatePicker selected={date} onChange={handleDateChange} />
      </CalendarWrapper>

      <ServiceSelection>
        <h3>Wybierz warsztat</h3>
        <select value={selectedWorkshop} onChange={handleWorkshopChange}>
          <option value="">Wybierz warsztat</option>
          {workshops.map((workshop) => (
            <option key={workshop.id} value={workshop.id}>
              {workshop.address}
            </option>
          ))}
        </select>
      </ServiceSelection>

      <ServiceSelection>
        <h3>Wybierz godzinę</h3>
        <select value={selectedTime} onChange={(e) => handleHourSelection(e.target.value)}>
          <option value="">Wybierz godzinę</option>
          {availableHours.length > 0 ? (
            availableHours.map((hour) => (
              <option key={hour.id} value={hour.id}>
                {new Date(hour.startDate).toLocaleTimeString('pl-PL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {hour.serviceId && ` - Usługa: ${services.find(service => service.id === hour.serviceId)?.typeName}`}
              </option>
            ))
          ) : (
            <option disabled>Brak dostępnych godzin</option>
          )}
        </select>
      </ServiceSelection>

      <ServiceSelection>
        <h3>Wybierz usługę</h3>
        <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
          <option value="">Wybierz usługę</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.typeName}
            </option>
          ))}
        </select>
      </ServiceSelection>

      <ServiceSelection>
        <h3>Wybierz pojazd</h3>
        <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
          <option value="">Wybierz pojazd</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.brand} {vehicle.model} {vehicle.registrationNumber}
            </option>
          ))}
        </select>
      </ServiceSelection>

      <Button onClick={handleSubmit}>Zatwierdź naprawę</Button>
    </HomeContainer>
  );
}

export default Home;
