import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, MapPin, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet with Vite-compatible URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom truck icon
const truckIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="8" width="20" height="8" rx="2" fill="#22c55e"/>
      <circle cx="7" cy="18" r="2" fill="#16a34a"/>
      <circle cx="17" cy="18" r="2" fill="#16a34a"/>
      <rect x="2" y="6" width="12" height="2" rx="1" fill="#16a34a"/>
    </svg>
  `)}`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

interface Vehicle {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "collecting" | "en_route" | "available";
  route: string;
  capacity: number;
  currentLoad: number;
}

// Mock vehicle data with dynamic movement

// Mock vehicle data with dynamic movement
const initialVehicles: Vehicle[] = [
  {
    id: "TRUCK_001",
    name: "Waste Truck Gamma",
    lat: 13.5500, // Madanapalle
    lng: 78.5000,
    status: "collecting",
    route: "Route A - Madanapalle Town",
    capacity: 1000,
    currentLoad: 650,


  },
  {
    id: "TRUCK_002",
    name: "Waste Truck Beta",
    lat: 13.574135, // Near Chittoor outskirts
    lng: 78.494043,
    status: "en_route",
    route: "Route B - My house",
    capacity: 1200,
    currentLoad: 800,
  },
  {
    id: "TRUCK_003",
    name: "Waste Truck Alpha",
    lat: 13.560017, // Near mits
    lng: 78.5040,
    status: "available",
    route: "Route C - Mits",
    capacity: 1200,
    currentLoad: 300,
  },


];


const MapUpdater = ({ vehicles }: { vehicles: Vehicle[] }) => {
  const map = useMap();

  useEffect(() => {
    if (vehicles.length > 0) {
      const bounds = L.latLngBounds(vehicles.map(v => [v.lat, v.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [vehicles, map]);

  return null;
};

export const VehicleMap = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);

  // Simulate vehicle movement
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles(prev =>
        prev.map(vehicle => ({
          ...vehicle,
          lat: vehicle.lat + (Math.random() - 0.5) * 0.001,
          lng: vehicle.lng + (Math.random() - 0.5) * 0.001,
          currentLoad: vehicle.status === "collecting"
            ? Math.min(vehicle.capacity, vehicle.currentLoad + Math.random() * 50)
            : vehicle.currentLoad,
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: Vehicle["status"]) => {
    switch (status) {
      case "collecting":
        return "text-warning";
      case "en_route":
        return "text-primary";
      case "available":
        return "text-success";
      default:
        return "text-muted-foreground";
    }
  };

  const getLoadPercentage = (vehicle: Vehicle) => {
    return Math.round((vehicle.currentLoad / vehicle.capacity) * 100);
  };

  return (
    <div className="space-y-6">
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="h-5 w-5 text-primary" />
            <span>Live Vehicle Tracking</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 rounded-lg overflow-hidden">
            <MapContainer
              center={[28.6139, 77.2090]}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              className="rounded-lg"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater vehicles={vehicles} />
              {vehicles.map((vehicle) => (
                <Marker
                  key={vehicle.id}
                  position={[vehicle.lat, vehicle.lng]}
                  icon={truckIcon}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-semibold text-foreground">{vehicle.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{vehicle.route}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={`font-medium ${getStatusColor(vehicle.status)}`}>
                            {vehicle.status.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Load:</span>
                          <span className="font-medium">
                            {vehicle.currentLoad}kg / {vehicle.capacity}kg
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all duration-300"
                            style={{ width: `${getLoadPercentage(vehicle)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{vehicle.name}</h3>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${vehicle.status === "collecting" ? "bg-warning/20 text-warning" :
                  vehicle.status === "en_route" ? "bg-primary/20 text-primary" :
                    "bg-success/20 text-success"
                  }`}>
                  {vehicle.status.replace("_", " ").toUpperCase()}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{vehicle.route}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Load:</span>
                  <span className="font-medium">{getLoadPercentage(vehicle)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all duration-300"
                    style={{ width: `${getLoadPercentage(vehicle)}%` }}
                  />
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span>{vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};