import { VehicleMap } from "@/components/map/VehicleMap";

export const VehicleTracking = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Live Vehicle Tracking</h1>
        <p className="text-muted-foreground">
          Real-time GPS tracking of waste collection vehicles across the city
        </p>
      </div>

      <VehicleMap />
    </div>
  );
};