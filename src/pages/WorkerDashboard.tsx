import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { QRScanner } from "@/components/qr/QRScanner";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WasteReports } from "@/components/worker/WasteReports";
import { WasteSelling } from "@/components/worker/WasteSelling";
import { MunicipalProfile } from "@/components/profile/MunicipalProfile";
import { SoldHistory } from "@/components/municipality/SoldHistory";
import { MunicipalPenalties } from "@/components/penalties/MunicipalPenalties";
import {
  QrCode,
  Truck,
  Scale,
  MapPin,
  Clock,
  CheckCircle,
  Users,
  TrendingUp,
  Trash2,
  Calendar,
  Camera,
  X,
  Trash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dataSync } from "@/lib/dataSync";
import { dataRecovery } from "@/lib/dataRecovery";
import dataPersistence from "@/lib/dataPersistence";

export const WorkerDashboard = () => {
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedHouse, setScannedHouse] = useState<any>(null);
  const [wasteType, setWasteType] = useState("");
  const [wasteWeight, setWasteWeight] = useState("");
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [wasteCollected, setWasteCollected] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedWaste, setSelectedWaste] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [collectionNotes, setCollectionNotes] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationTracking, setLocationTracking] = useState(false);
  const [houseSearchTerm, setHouseSearchTerm] = useState("");
  const [selectedHouse, setSelectedHouse] = useState<any>(null);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [municipalHouses, setMunicipalHouses] = useState<any[]>([]);
  const [wasteTypeFilter, setWasteTypeFilter] = useState("all");
  const [recyclingCentersData, setRecyclingCentersData] = useState<any[]>([]);
  const [selectedCenterProfile, setSelectedCenterProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  
  const fetchSentInvitations = async () => {
    try {
      const response = await api.get('/invitations/sent');
      setSentInvitations(response || []);
    } catch (error) {
      console.error('Failed to fetch sent invitations:', error);
      setSentInvitations([]);
    }
  };
  
  const filteredHouses = municipalHouses.filter(house => 
    house.houseId.toLowerCase().includes(houseSearchTerm.toLowerCase()) ||
    house.name.toLowerCase().includes(houseSearchTerm.toLowerCase())
  );
  
  const filteredRecyclingCenters = recyclingCentersData.filter(center => {
    // Filter out centers that already have pending invitations
    const hasInvitation = sentInvitations.some(inv => 
      inv.recyclingCenterId?._id === center._id && inv.status === 'pending'
    );
    if (hasInvitation) return false;
    
    if (wasteTypeFilter === "all") return true;
    return center.wasteTypesProcessed && center.wasteTypesProcessed.includes(wasteTypeFilter);
  });

  const [workerData, setWorkerData] = useState({
    id: "WORKER_001",
    name: "Municipal Worker",
    vehicle: "TRUCK_001",
    route: "Route A - Collection Area",
    collectionsToday: 0,
    totalCollected: 0,
    efficiency: 0,
    reportsResolved: 0,
    overallCollected: 0,
    monthlyTotal: 0
  });

  const [householdData, setHouseholdData] = useState<{ [key: string]: any }>({
    "1": {
      id: "1",
      owner: "Venkat",
      address: "Kambalapalli,Beerangi post, B.kothakota",
      phone: "8019482406",
      municipalId: "MU01",
      totalWaste: "0",
      lastCollection: "Never"
    }
  });
  const [todaysRoute, setTodaysRoute] = useState<any[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [wasteList, setWasteList] = useState<any[]>([]);
  const [pendingWaste, setPendingWaste] = useState<any[]>([]);
  const [collectedWaste, setCollectedWaste] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState(() => {
    const saved = localStorage.getItem('workerLastUpdate');
    return saved ? new Date(saved) : new Date();
  });

  const startLocationTracking = () => {
    setLocationTracking(true);
    if (navigator.geolocation) {
      // Get initial high-accuracy position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast({
            title: "Location Acquired",
            description: `Accuracy: ${Math.round(position.coords.accuracy)}m`,
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Enable location services for accurate tracking",
            variant: "destructive"
          });
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 0 
        }
      );
      
      // Watch position with high accuracy
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (position.coords.accuracy <= 50) { // Only update if accuracy is good
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          }
        },
        (error) => console.error('Location watch error:', error),
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 5000 
        }
      );
      
      (window as any).locationWatchId = watchId;
    }
  };

  const stopLocationTracking = () => {
    setLocationTracking(false);
    if ((window as any).locationWatchId) {
      navigator.geolocation.clearWatch((window as any).locationWatchId);
    }
  };

  useEffect(() => {
    const fetchWorkerStats = async (showErrors = false) => {
      // Check authentication first
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        console.log('No authentication found, redirecting to login');
        window.location.href = '/auth/worker';
        return;
      }
      
      // Try to load from cache first
      if (!dataSync.needsRefresh('workerData') && pendingWaste.length > 0) {
        return;
      }
      
      try {
        // Get current user's municipal ID
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const municipalId = user?.municipalId;
        
        if (!municipalId) {
          console.warn('No municipal ID found for worker - showing all pending waste');
        }
        
        // Fetch data with proper error handling
        let statsResponse = { totalHouseholds: 0, wasteCollectedToday: 0, collectionsToday: 0, totalCollected: 0, monthlyTotal: 0 };
        let reportsResponse = [];
        let allWasteResponse = [];
        
        try {
          reportsResponse = await api.get('/reports/all');
        } catch (error) {
          console.error('Failed to fetch reports:', error);
          // Try to load from cache
          const cachedReports = dataSync.getCachedData('workerReports', 24 * 60 * 60 * 1000);
          if (cachedReports) reportsResponse = cachedReports;
        }
        
        try {
          allWasteResponse = await api.get('/waste/all');
          console.log('Fetched waste data:', allWasteResponse.length, 'items');
          // Debug: Log first item to check structure
          if (allWasteResponse.length > 0) {
            console.log('Sample waste item:', allWasteResponse[0]);
          }
        } catch (error) {
          console.error('Failed to fetch waste:', error);
          // Try to load from cache
          const cachedWaste = dataSync.getCachedData('workerWaste', 24 * 60 * 60 * 1000);
          if (cachedWaste) allWasteResponse = cachedWaste;
        }
        
        // Fetch real citizen houses from database
        try {
          const citizensResponse = await api.get(`/auth/citizens?municipalId=${municipalId || 'MU01'}`);
          const houses = citizensResponse.map((citizen: any) => ({
            houseId: citizen.houseId || citizen._id,
            name: citizen.name,
            address: citizen.address || 'Address not provided',
            municipalId: citizen.municipalId,
            phone: citizen.phone,
            email: citizen.email,
            qrCode: citizen.qrCode,
            wasteStatus: allWasteResponse.some((w: any) => 
              (w.citizenHouseId === citizen.houseId || w.citizenHouseId === citizen._id) && w.status === 'collected'
            ) ? 'collected' : 'pending'
          }));
          setMunicipalHouses(houses);
        } catch (error) {
          console.error('Failed to fetch citizens:', error);
          // Fallback to default house if API fails
          const houses = [
            {
              houseId: '1',
              name: 'Venkat',
              address: 'Kambalapalli,Beerangi post, B.kothakota',
              municipalId: 'MU01',
              phone: '8019482406',
              email: 'venkat@example.com',
              qrCode: 'WW001',
              wasteStatus: allWasteResponse.some((w: any) => 
                w.citizenHouseId === '1' && w.status === 'collected'
              ) ? 'collected' : 'pending'
            }
          ];
          setMunicipalHouses(houses);
        }
        
        // Filter pending waste - show all pending waste
        const filteredPendingWaste = allWasteResponse.filter((w: any) => {
          return w.status === 'pending';
        });
        
        // Filter collected waste - show all collected waste regardless of municipal ID for now
        const filteredCollectedWaste = allWasteResponse.filter((w: any) => {
          return w.status === 'collected';
        }).sort((a: any, b: any) => new Date(b.collectedAt || b.updatedAt).getTime() - new Date(a.collectedAt || a.updatedAt).getTime());
        
        console.log('Filtered pending waste:', filteredPendingWaste.length, 'items');
        console.log('Filtered collected waste:', filteredCollectedWaste.length, 'items');
        
        // Debug: Log sample items
        if (filteredCollectedWaste.length > 0) {
          console.log('Sample collected waste:', filteredCollectedWaste[0]);
        }
        
        const resolvedCount = reportsResponse.filter((r: any) => r.status === 'resolved').length;
        const pendingReportsList = reportsResponse.filter((r: any) => r.status === 'pending');
        
        const newWorkerData = {
          ...workerData,
          collectionsToday: statsResponse.collectionsToday || 0,
          totalCollected: statsResponse.wasteCollectedToday || 0,
          reportsResolved: resolvedCount,
          overallCollected: statsResponse.totalCollected || 0,
          monthlyTotal: statsResponse.monthlyTotal || 0
        };
        
        setWorkerData(newWorkerData);
        setPendingWaste(filteredPendingWaste);
        setCollectedWaste(filteredCollectedWaste);
        setPendingReports(pendingReportsList);
        
        // Cache the data
        dataSync.cacheData('workerData', newWorkerData);
        dataSync.cacheData('workerReports', reportsResponse);
        dataSync.cacheData('workerWaste', allWasteResponse);
        dataSync.cacheData('pendingWaste', filteredPendingWaste);
        dataSync.cacheData('collectedWaste', filteredCollectedWaste);
        
        // Store in persistent storage
        dataPersistence.storeWorkerStats(newWorkerData);
        dataPersistence.storePendingWaste(filteredPendingWaste);
        dataPersistence.storeCollectedWaste(filteredCollectedWaste);
        
        // Fetch actual recycling centers from database
        try {
          const centersResponse = await api.get('/auth/users/role/recycler');
          const processedCenters = centersResponse.map((center: any) => ({
            ...center,
            _id: center._id,
            centerName: center.centerName || center.name,
            wasteTypesProcessed: center.wasteTypesProcessed || ['plastic', 'paper', 'metal', 'glass']
          }));
          setRecyclingCentersData(processedCenters);
          dataSync.cacheData('recyclingCenters', processedCenters);
        } catch (error) {
          console.error('Failed to fetch recycling centers:', error);
          const cachedCenters = dataSync.getCachedData('recyclingCenters', 24 * 60 * 60 * 1000);
          if (cachedCenters) {
            setRecyclingCentersData(cachedCenters);
          } else {
            setRecyclingCentersData([]);
          }
        }
        
        const currentTime = new Date();
        setLastUpdate(currentTime);
        localStorage.setItem('workerLastUpdate', currentTime.toISOString());
        
      } catch (error: any) {
        console.error('Error fetching worker stats:', error);
        
        // Check if it's an authentication error
        if (error.message?.includes('authorization') || error.message?.includes('token') || error.message?.includes('401')) {
          console.log('Authentication failed, clearing storage and redirecting');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/auth/worker';
          return;
        }
        
        // Try to load from cache on error
        const cachedWorkerData = dataSync.getCachedData('workerData', 24 * 60 * 60 * 1000) || dataPersistence.getWorkerStats();
        const cachedPendingWaste = dataSync.getCachedData('pendingWaste', 24 * 60 * 60 * 1000) || dataPersistence.getPendingWaste();
        const cachedCollectedWaste = dataSync.getCachedData('collectedWaste', 24 * 60 * 60 * 1000) || dataPersistence.getCollectedWaste();
        
        if (cachedWorkerData) setWorkerData(cachedWorkerData);
        if (cachedPendingWaste) setPendingWaste(cachedPendingWaste);
        if (cachedCollectedWaste) setCollectedWaste(cachedCollectedWaste);
        
        if (showErrors && !cachedWorkerData) {
          toast({
            title: "Connection Error",
            description: "Failed to fetch data and no cached data available.",
            variant: "destructive"
          });
        }
      }
    };

    fetchWorkerStats(true); // Show errors on initial load
    fetchSentInvitations();
    
    // Set up polling every 30 seconds (less aggressive)
    const interval = setInterval(() => {
      fetchWorkerStats(false); // Don't show errors for background updates
    }, 30000);
    
    // Set up house data refresh every 30 seconds
    const houseRefreshInterval = setInterval(async () => {
      try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const municipalId = user?.municipalId || 'MU01';
        
        const [citizensResponse, allWasteResponse] = await Promise.all([
          api.get(`/auth/citizens?municipalId=${municipalId}`),
          api.get('/waste/all')
        ]);
        
        const houses = citizensResponse.map((citizen: any) => ({
          houseId: citizen.houseId || citizen._id,
          name: citizen.name,
          address: citizen.address || 'Address not provided',
          municipalId: citizen.municipalId,
          phone: citizen.phone,
          email: citizen.email,
          qrCode: citizen.qrCode,
          wasteStatus: allWasteResponse.some((w: any) => 
            (w.citizenHouseId === citizen.houseId || w.citizenHouseId === citizen._id) && w.status === 'collected'
          ) ? 'collected' : 'pending'
        }));
        setMunicipalHouses(houses);
      } catch (error) {
        console.error('Auto-refresh houses failed:', error);
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(houseRefreshInterval);
    };
  }, []);

  const handleQRScan = (result: string) => {
    const household = householdData[result];
    if (household) {
      setScannedHouse(household);
      setShowScanner(false);
      toast({
        title: "QR Code Scanned!",
        description: `Loaded details for ${household.owner}`,
      });
    } else {
      toast({
        title: "Invalid QR Code",
        description: "House not found in database",
        variant: "destructive",
      });
    }
  };

  const handleWasteCollection = async () => {
    if (!scannedHouse || !wasteType || !wasteWeight) {
      toast({
        title: "Missing Information",
        description: "Please scan QR code and fill all waste details",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create waste record with house details
      const wasteData = {
        type: wasteType,
        weight: parseFloat(wasteWeight),
        location: scannedHouse.address,
        description: `Collected from ${scannedHouse.owner} - House ID: ${scannedHouse.id}`,
        status: 'collected',
        citizenName: scannedHouse.owner,
        citizenHouseId: scannedHouse.id
      };

      await api.post('/waste', wasteData);

      // Update local statistics
      setWorkerData(prev => ({
        ...prev,
        collectionsToday: prev.collectionsToday + 1,
        totalCollected: prev.totalCollected + parseFloat(wasteWeight)
      }));

      toast({
        title: "Waste Collected!",
        description: `Recorded ${wasteWeight}kg of ${wasteType} waste from ${scannedHouse.owner} (House ID: ${scannedHouse.id})`,
      });

      // Reset form
      setWasteType("");
      setWasteWeight("");
      setScannedHouse(null);
    } catch (error) {
      toast({
        title: "Collection Failed",
        description: error instanceof Error ? error.message : "Failed to record waste collection",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-error/20 text-error";
      case "medium":
        return "bg-warning/20 text-warning";
      case "low":
        return "bg-success/20 text-success";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    return status === "completed" ?
      <CheckCircle className="h-4 w-4 text-success" /> :
      <Clock className="h-4 w-4 text-warning" />;
  };

  const handleVerifyCollection = async () => {
    if (!selectedWaste) {
      toast({
        title: "Missing Information",
        description: "No waste selected for collection",
        variant: "destructive",
      });
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Verification Code Required",
        description: "Please enter the 6-digit verification code from the citizen",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await api.patch(`/waste/${selectedWaste._id}/verify-collection`, {
        verificationCode: verificationCode.trim(),
        completionNotes: collectionNotes
      });
      
      // Update local state with the actual response from backend
      const updatedWaste = response.waste || response;
      
      setPendingWaste(prev => prev.filter(w => w._id !== selectedWaste._id));
      setCollectedWaste(prev => [updatedWaste, ...prev]);
      setWorkerData(prev => ({
        ...prev,
        collectionsToday: prev.collectionsToday + 1,
        totalCollected: prev.totalCollected + selectedWaste.weight
      }));
      
      toast({
        title: "✅ Waste Collected!",
        description: `Successfully collected ${selectedWaste.weight}kg of ${selectedWaste.type} waste from ${selectedWaste.citizenName || 'citizen'}.`,
      });
      
      // Reset modal state
      setShowVerificationModal(false);
      setSelectedWaste(null);
      setVerificationCode("");
      setCollectionNotes("");
      
      // Update municipal houses status in real-time
      setMunicipalHouses(prev => 
        prev.map(h => 
          (h.houseId === selectedWaste.citizenHouseId || h.houseId === selectedWaste.userId?.houseId)
            ? { ...h, wasteStatus: 'collected' }
            : h
        )
      );
      
      // Store the update in persistent storage
      dataPersistence.storeWasteCollection(selectedWaste._id, {
        status: 'collected',
        collectedAt: new Date().toISOString(),
        collectedBy: 'current-worker',
        completionNotes: collectionNotes || 'Collected by municipal worker'
      });
      
      // Update persistent storage with new data
      dataPersistence.storePendingWaste(pendingWaste.filter(w => w._id !== selectedWaste._id));
      dataPersistence.storeCollectedWaste([updatedWaste, ...collectedWaste]);
      
    } catch (error: any) {
      console.error('Collection error:', error);
      
      let errorMessage = "Collection failed";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "❌ Collection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCompleteWithProof = async () => {
    if (!selectedReport || !wasteCollected) return;

    try {
      await api.patch(`/reports/${selectedReport._id}/status`, { 
        status: 'resolved',
        completionNotes,
        completionPhoto: proofPhoto ? 'uploaded' : null,
        wasteCollected: parseFloat(wasteCollected)
      });
      
      setPendingReports(prev => prev.filter(r => r._id !== selectedReport._id));
      setWorkerData(prev => ({
        ...prev,
        reportsResolved: prev.reportsResolved + 1,
        totalCollected: prev.totalCollected + parseFloat(wasteCollected)
      }));
      
      toast({
        title: "Report Completed!",
        description: `Collected ${wasteCollected}kg of waste from ${selectedReport.location} and marked report as complete.`,
      });
      
      // Reset modal state
      setShowProofModal(false);
      setSelectedReport(null);
      setProofPhoto(null);
      setCompletionNotes("");
      setWasteCollected("");
    } catch (error) {
      toast({
        title: "Completion Failed",
        description: "Failed to mark report as complete",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCollectedWaste = async (wasteId: string) => {
    try {
      await api.delete(`/waste/${wasteId}`);
      const updatedCollectedWaste = collectedWaste.filter(w => w._id !== wasteId);
      setCollectedWaste(updatedCollectedWaste);
      dataPersistence.storeCollectedWaste(updatedCollectedWaste);
      
      toast({
        title: "Waste Deleted",
        description: "Collected waste record has been deleted.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete waste record",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Municipal Dashboard</h1>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Welcome, {workerData.name} | Vehicle: {workerData.vehicle} | {workerData.route}
          </p>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${dataSync.isConnected() ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {dataSync.isConnected() ? 'Online' : 'Offline'}
                </span>
              </div>
              {dataRecovery.needsRecovery('worker') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await dataRecovery.recoverWorkerData();
                      toast({
                        title: "Data Recovered",
                        description: "Your dashboard data has been restored from the server.",
                      });
                      // Refresh the page to show recovered data
                      window.location.reload();
                    } catch (error) {
                      toast({
                        title: "Recovery Failed",
                        description: "Failed to recover data. Please try again.",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="text-xs h-6"
                >
                  Recover Data
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-6">
        <DashboardCard
          title="Collections Today"
          value={workerData.collectionsToday}
          icon={Users}
          description="Houses visited"
          variant="success"
        />
        <DashboardCard
          title="Today Collected"
          value={`${workerData.totalCollected} kg`}
          icon={Scale}
          description="Today's waste collection"
        />
        <DashboardCard
          title="Pending Waste"
          value={pendingWaste.length + pendingReports.length}
          icon={Clock}
          description="Collections & reports pending"
          variant="warning"
        />
        <DashboardCard
          title="Reports Resolved"
          value={workerData.reportsResolved}
          icon={CheckCircle}
          description="Citizen reports completed"
          variant="success"
        />
        <DashboardCard
          title="Route Progress"
          value={workerData.collectionsToday > 0 ? `${Math.min(100, (workerData.collectionsToday / 10) * 100)}%` : "0%"}
          icon={MapPin}
          description="Route completion"
        />
        <DashboardCard
          title="Efficiency Score"
          value={`${Math.min(100, (workerData.collectionsToday + workerData.reportsResolved) * 10)}%`}
          icon={TrendingUp}
          description="Weekly performance"
          variant="success"
        />
        <DashboardCard
          title="Total Collected"
          value={`${workerData.overallCollected || 0} kg`}
          icon={Trash2}
          description="All-time citywide total"
          variant="default"
        />
        <DashboardCard
          title="Monthly Total"
          value={`${workerData.monthlyTotal || 0} kg`}
          icon={Calendar}
          description="This month citywide"
          variant="default"
        />
      </div>

      <Tabs defaultValue="collection" className="space-y-6">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="collection">Waste Collection</TabsTrigger>
          <TabsTrigger value="pending">Pending Waste</TabsTrigger>
          <TabsTrigger value="reports">Waste Reports</TabsTrigger>
          <TabsTrigger value="penalties">Penalties</TabsTrigger>
          <TabsTrigger value="route">Today's Route</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle Status</TabsTrigger>
          <TabsTrigger value="selling">Sell to Recyclers</TabsTrigger>
          <TabsTrigger value="connections">Recycling Connections</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="space-y-6">
            <MunicipalProfile />
            
            {/* Admin-controlled achievements and ratings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 mb-4">
                    {[1,2,3,4,5].map((star) => {
                      const adminRating = parseInt(localStorage.getItem(`worker_${workerData.id}_rating`) || '0');
                      return (
                        <span key={star} className={`text-lg ${star <= adminRating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                      );
                    })}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({parseInt(localStorage.getItem(`worker_${workerData.id}_rating`) || '0')}/5)
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Current Role: {localStorage.getItem(`worker_${workerData.id}_role`) || 'Not assigned'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Efficiency Expert', desc: 'High performance rating' },
                      { name: 'Route Master', desc: 'Excellent route completion' },
                      { name: 'Green Champion', desc: 'Environmental excellence' },
                      { name: 'Community Hero', desc: 'Outstanding service' }
                    ].map((achievement) => {
                      const isEarned = localStorage.getItem(`worker_${workerData.id}_achievement_${achievement.name}`) === 'true';
                      return (
                        <div key={achievement.name} className={`p-3 rounded-lg border ${isEarned ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${isEarned ? 'text-green-600' : 'text-gray-400'}`}>
                              {isEarned ? '✓' : '○'}
                            </span>
                            <div>
                              <p className={`font-medium text-sm ${isEarned ? 'text-green-800' : 'text-gray-500'}`}>
                                {achievement.name}
                              </p>
                              <p className={`text-xs ${isEarned ? 'text-green-600' : 'text-gray-400'}`}>
                                {achievement.desc}
                              </p>
                            </div>
                          </div>
                          {isEarned && (
                            <div className="mt-2">
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Earned</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="collection" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Scanner Section */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  <span>QR Code Scanner</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showScanner ? (
                  <Button
                    onClick={() => setShowScanner(true)}
                    variant="hero"
                    className="w-full"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Start QR Scanner
                  </Button>
                ) : (
                  <QRScanner
                    onScan={handleQRScan}
                    onClose={() => setShowScanner(false)}
                  />
                )}

                {scannedHouse && (
                  <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-2">🏠 Household Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">House ID:</span> {scannedHouse.id}</p>
                      <p><span className="font-medium">Owner:</span> {scannedHouse.owner}</p>
                      <p><span className="font-medium">Address:</span> {scannedHouse.address}</p>
                      <p><span className="font-medium">Phone:</span> {scannedHouse.phone}</p>
                      <p><span className="font-medium">Municipal ID:</span> {scannedHouse.municipalId}</p>
                      <p><span className="font-medium">Last Collection:</span> {scannedHouse.lastCollection}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Waste Entry Section */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Scale className="h-5 w-5 text-primary" />
                  <span>Record Waste Collection</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wasteType">Waste Type</Label>
                  <Select value={wasteType} onValueChange={setWasteType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select waste type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organic">Organic Waste</SelectItem>
                      <SelectItem value="plastic">Plastic Waste</SelectItem>
                      <SelectItem value="paper">Paper Waste</SelectItem>
                      <SelectItem value="glass">Glass Waste</SelectItem>
                      <SelectItem value="metal">Metal Waste</SelectItem>
                      <SelectItem value="mixed">Mixed Waste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="Enter weight from IoT scale"
                    value={wasteWeight}
                    onChange={(e) => setWasteWeight(e.target.value)}
                    step="0.1"
                  />
                </div>

                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  📡 IoT Integration: Weight data will be automatically captured from smart weighing devices
                </div>

                <Button
                  onClick={handleWasteCollection}
                  variant="success"
                  className="w-full"
                  disabled={!scannedHouse}
                >
                  <Scale className="mr-2 h-4 w-4" />
                  Record Collection
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Scale className="h-5 w-5 text-primary" />
                <span>Waste Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pending">Pending Collections</TabsTrigger>
                  <TabsTrigger value="history">Collection History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending">
                  {pendingWaste.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No pending waste collections.</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingWaste.map((waste: any) => (
                        <div key={waste._id} className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg shadow-sm">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-4 h-4 rounded-full bg-orange-500 mt-1 animate-pulse" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">{waste.type.charAt(0).toUpperCase() + waste.type.slice(1)} Waste</h4>
                                <div className="space-y-2">
                                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                                    <h5 className="font-semibold text-blue-900 mb-2">👤 Citizen Details</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                      <p className="text-blue-800">
                                        <span className="font-medium">Name:</span> {waste.citizenName || waste.userId?.name || 'Unknown Citizen'}
                                      </p>
                                      <p className="text-blue-800">
                                        <span className="font-medium">House ID:</span> {waste.citizenHouseId || waste.userId?.houseId || 'No House ID'}
                                      </p>
                                      <p className="text-blue-800">
                                        <span className="font-medium">Address:</span> {waste.location || waste.userId?.address || 'Address not provided'}
                                      </p>
                                      <p className="text-blue-800">
                                        <span className="font-medium">Municipal ID:</span> {waste.municipalId || waste.userId?.municipalId || 'Not assigned'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-orange-600">{waste.weight} kg</p>
                              <p className="text-xs text-gray-500">Weight</p>
                            </div>
                          </div>
                          
                          {waste.location && (
                            <div className="mb-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                              <p className="text-sm text-blue-800">
                                <span className="font-medium">📍 Location:</span> {waste.location}
                              </p>
                            </div>
                          )}
                          
                          {waste.description && (
                            <div className="mb-3 p-2 bg-gray-50 rounded">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">📝 Description:</span> {waste.description}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <div className="text-xs text-gray-500 space-y-1">
                              <p>Uploaded: {new Date(waste.createdAt).toLocaleDateString()} at {new Date(waste.createdAt).toLocaleTimeString()}</p>
                              <p>Waste ID: {waste._id.slice(-6).toUpperCase()}</p>
                            </div>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                              onClick={() => {
                                setSelectedWaste(waste);
                                setShowVerificationModal(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete Collection
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="history">
                  {collectedWaste.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No waste collected yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {collectedWaste.slice(0, 10).map((waste: any) => (
                        <div key={waste._id} className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg shadow-sm">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-4 h-4 rounded-full bg-green-500 mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">{waste.type.charAt(0).toUpperCase() + waste.type.slice(1)} Waste</h4>
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">COLLECTED</span>
                                </div>
                                <div className="space-y-2">
                                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                                    <h5 className="font-semibold text-blue-900 mb-2">👤 Citizen Details</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                      <p className="text-blue-800">
                                        <span className="font-medium">Name:</span> {waste.citizenName || waste.userId?.name || 'Unknown Citizen'}
                                      </p>
                                      <p className="text-blue-800">
                                        <span className="font-medium">House ID:</span> {waste.citizenHouseId || waste.userId?.houseId || 'No House ID'}
                                      </p>
                                      <p className="text-blue-800">
                                        <span className="font-medium">Address:</span> {waste.location || waste.userId?.address || 'Address not provided'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">{waste.weight} kg</p>
                              <p className="text-xs text-gray-500">Weight</p>
                            </div>
                          </div>
                          
                          {waste.location && (
                            <div className="mb-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                              <p className="text-sm text-blue-800">
                                <span className="font-medium">📍 Location:</span> {waste.location}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <div className="text-xs text-gray-500 space-y-1">
                              <p>Collected: {new Date(waste.collectedAt || waste.updatedAt).toLocaleDateString()} at {new Date(waste.collectedAt || waste.updatedAt).toLocaleTimeString()}</p>
                              <p>Collected by: {waste.collectedBy?.name || 'Worker'}</p>
                              <p>Waste ID: {waste._id.slice(-6).toUpperCase()}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                                ✓ Completed
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteCollectedWaste(waste._id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <WasteReports />
        </TabsContent>

        <TabsContent value="penalties">
          <MunicipalPenalties />
        </TabsContent>

        <TabsContent value="selling">
          <WasteSelling />
        </TabsContent>

        <TabsContent value="connections">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Recycling Center Connections</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="available" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="available">Available Centers</TabsTrigger>
                  <TabsTrigger value="invitations">Sent Invitations</TabsTrigger>
                </TabsList>
                
                <TabsContent value="available">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Filter by Waste Type</Label>
                      <Select value={wasteTypeFilter} onValueChange={setWasteTypeFilter}>
                        <SelectTrigger className="max-w-sm">
                          <SelectValue placeholder="All waste types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Waste Types</SelectItem>
                          <SelectItem value="plastic">Plastic</SelectItem>
                          <SelectItem value="paper">Paper</SelectItem>
                          <SelectItem value="glass">Glass</SelectItem>
                          <SelectItem value="metal">Metal</SelectItem>
                          <SelectItem value="organic">Organic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredRecyclingCenters.map((center) => (
                        <div key={center._id} className="p-4 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">{center.centerName || center.name}</h4>
                              <p className="text-sm text-muted-foreground">{center.email}</p>
                            </div>
                            <div className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              Active
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">{center.address}</p>
                            <div className="flex flex-wrap gap-1">
                              {center.wasteTypesProcessed && center.wasteTypesProcessed.length > 0 ? (
                                center.wasteTypesProcessed.map((type: string) => (
                                  <span key={type} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </span>
                                ))
                              ) : (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                                  No waste types specified
                                </span>
                              )}
                            </div>
                            <div className="flex space-x-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => {
                                  setSelectedCenterProfile(center);
                                  setShowProfileModal(true);
                                }}
                              >
                                View Profile
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="flex-1"
                                onClick={async () => {
                                  try {
                                    await api.post('/invitations', {
                                      recyclingCenterId: center._id,
                                      message: 'Partnership invitation for waste recycling'
                                    });
                                    
                                    toast({
                                      title: "Invitation Sent",
                                      description: `Invitation sent to ${center.centerName || center.name}`
                                    });
                                    
                                    fetchSentInvitations();
                                  } catch (error: any) {
                                    toast({
                                      title: "Failed to Send Invitation",
                                      description: error.message || "Could not send invitation",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                Send Invitation
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="invitations">
                  <div className="space-y-4">
                    {sentInvitations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No invitations sent yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {sentInvitations.map((invitation) => (
                          <div key={invitation._id} className="p-3 border rounded-lg bg-yellow-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{invitation.recyclingCenterId?.centerName || invitation.recyclingCenterId?.name}</p>
                                <p className="text-sm text-muted-foreground">{invitation.recyclingCenterId?.email}</p>
                                <p className="text-xs text-muted-foreground">Sent: {new Date(invitation.sentAt).toLocaleString()}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {invitation.status}
                                </span>
                                {invitation.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      try {
                                        await api.delete(`/invitations/${invitation._id}`);
                                        toast({
                                          title: "Invitation Cancelled",
                                          description: `Invitation cancelled successfully`
                                        });
                                        fetchSentInvitations();
                                      } catch (error: any) {
                                        toast({
                                          title: "Failed to Cancel",
                                          description: error.message || "Could not cancel invitation",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="route" className="space-y-4">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>Today's Route - Municipal Houses</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Refresh house data
                    const fetchHouses = async () => {
                      try {
                        const userStr = localStorage.getItem('user');
                        const user = userStr ? JSON.parse(userStr) : null;
                        const municipalId = user?.municipalId || 'MU01';
                        
                        const citizensResponse = await api.get(`/auth/citizens?municipalId=${municipalId}`);
                        const allWasteResponse = await api.get('/waste/all');
                        
                        const houses = citizensResponse.map((citizen: any) => ({
                          houseId: citizen.houseId || citizen._id,
                          name: citizen.name,
                          address: citizen.address || 'Address not provided',
                          municipalId: citizen.municipalId,
                          phone: citizen.phone,
                          email: citizen.email,
                          qrCode: citizen.qrCode,
                          wasteStatus: allWasteResponse.some((w: any) => 
                            (w.citizenHouseId === citizen.houseId || w.citizenHouseId === citizen._id) && w.status === 'collected'
                          ) ? 'collected' : 'pending'
                        }));
                        setMunicipalHouses(houses);
                        
                        toast({
                          title: "✨ Data Refreshed",
                          description: "House data updated successfully"
                        });
                      } catch (error) {
                        toast({
                          title: "Refresh Failed",
                          description: "Failed to refresh house data",
                          variant: "destructive"
                        });
                      }
                    };
                    fetchHouses();
                  }}
                >
                  🔄 Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Input
                    placeholder="Search by House ID or Name..."
                    value={houseSearchTerm}
                    onChange={(e) => setHouseSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                  <div className="text-sm text-muted-foreground">
                    Total Houses: {filteredHouses.length}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-green-600 font-medium">
                      ✓ Collected: {filteredHouses.filter(h => h.wasteStatus === 'collected').length}
                    </div>
                    <div className="text-xs text-orange-600 font-medium">
                      ⏳ Pending: {filteredHouses.filter(h => h.wasteStatus === 'pending').length}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${dataSync.isConnected() ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-xs text-muted-foreground">
                      {dataSync.isConnected() ? 'Live Updates' : 'Offline Mode'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHouses.map((house) => (
                  <div key={house.houseId} className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-200" onClick={() => {
                    setSelectedHouse(house);
                    setShowHouseModal(true);
                  }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">House ID: {house.houseId}</h4>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        house.wasteStatus === 'collected' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {house.wasteStatus === 'collected' ? '✓ Collected' : '⏳ Pending'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-800">👤 {house.name}</p>
                      <p className="text-xs text-gray-600">📍 {house.address}</p>
                      {house.phone && (
                        <p className="text-xs text-gray-600">📞 {house.phone}</p>
                      )}
                      <p className="text-xs text-blue-600 font-medium">🏛️ Municipal ID: {house.municipalId}</p>
                      {house.qrCode && (
                        <p className="text-xs text-purple-600">🔗 QR: {house.qrCode}</p>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Click to update collection status</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicle" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GPS & Location Tracking */}
            <Card className="card-shadow border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-800">GPS Location Tracking</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">GPS Status:</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${locationTracking ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`font-bold ${locationTracking ? 'text-green-600' : 'text-red-600'}`}>
                      {locationTracking ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
                
                {currentLocation && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <p className="font-semibold text-green-800 mb-2">📍 Current Position</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-green-700"><span className="font-medium">Latitude:</span> {currentLocation.lat.toFixed(6)}</p>
                      <p className="text-green-700"><span className="font-medium">Longitude:</span> {currentLocation.lng.toFixed(6)}</p>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => window.open(`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`, '_blank')}
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        View on Maps
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${currentLocation.lat}, ${currentLocation.lng}`);
                          toast({ title: "Coordinates Copied", description: "Location copied to clipboard" });
                        }}
                      >
                        Copy Location
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  {!locationTracking ? (
                    <Button
                      onClick={startLocationTracking}
                      className="flex-1 bg-green-600 hover:bg-green-700 h-12"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Start GPS Tracking
                    </Button>
                  ) : (
                    <Button
                      onClick={stopLocationTracking}
                      variant="destructive"
                      className="flex-1 h-12"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Stop Tracking
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Status & Load Management */}
            <Card className="card-shadow border-2 border-orange-200">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-100">
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-orange-600" />
                  <span className="text-orange-800">Vehicle Status - {workerData.vehicle}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Load Capacity:</span>
                    <span className="font-bold text-lg">{Math.round((workerData.totalCollected / 1000) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full transition-all duration-500 ${
                        (workerData.totalCollected / 1000) * 100 > 80 ? 'bg-red-500' :
                        (workerData.totalCollected / 1000) * 100 > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (workerData.totalCollected / 1000) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>0 kg</span>
                    <span>500 kg</span>
                    <span>1000 kg (Max)</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{workerData.totalCollected}</p>
                    <p className="text-xs text-blue-800">Current Load (kg)</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{workerData.collectionsToday}</p>
                    <p className="text-xs text-green-800">Collections Today</p>
                  </div>
                </div>
                
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Vehicle Model:</span>
                    <span className="font-medium">Municipal Truck</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Max Capacity:</span>
                    <span className="font-medium">1000 kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Remaining Space:</span>
                    <span className="font-medium text-green-600">{1000 - workerData.totalCollected} kg</span>
                  </div>
                </div>
                
                {(workerData.totalCollected / 1000) * 100 > 80 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium text-sm">⚠️ Vehicle Near Capacity</p>
                    <p className="text-red-600 text-xs">Consider unloading at disposal site</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </TabsContent>
      </Tabs>

      {/* Proof Submission Modal */}
      {showProofModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Submit Completion Proof</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowProofModal(false);
                  setSelectedReport(null);
                  setProofPhoto(null);
                  setCompletionNotes("");
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="font-medium mb-2">Report Location:</p>
                <p className="text-sm text-muted-foreground">{selectedReport.location}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="proof-photo">Upload Proof Photo</Label>
                <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="proof-photo"
                    accept="image/*"
                    onChange={(e) => setProofPhoto(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="proof-photo" className="cursor-pointer">
                    <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {proofPhoto ? proofPhoto.name : "Click to upload completion photo"}
                    </p>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waste-collected">Waste Collected (kg)</Label>
                <Input
                  id="waste-collected"
                  type="number"
                  placeholder="Enter weight of waste collected"
                  value={wasteCollected}
                  onChange={(e) => setWasteCollected(e.target.value)}
                  step="0.1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completion-notes">Completion Notes</Label>
                <Input
                  id="completion-notes"
                  placeholder="Add notes about the completion..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleCompleteWithProof}
                  className="flex-1"
                  disabled={!proofPhoto || !wasteCollected}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProofModal(false);
                    setSelectedReport(null);
                    setProofPhoto(null);
                    setCompletionNotes("");
                    setWasteCollected("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Code Modal */}
      {showVerificationModal && selectedWaste && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Verify Waste Collection</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowVerificationModal(false);
                  setSelectedWaste(null);
                  setVerificationCode("");
                  setCollectionNotes("");
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Waste Details</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><span className="font-medium">Type:</span> {selectedWaste.type.charAt(0).toUpperCase() + selectedWaste.type.slice(1)}</p>
                  <p><span className="font-medium">Weight:</span> {selectedWaste.weight} kg</p>
                  <p><span className="font-medium">Citizen:</span> {selectedWaste.citizenName || selectedWaste.userId?.name}</p>
                  <p><span className="font-medium">House ID:</span> {selectedWaste.citizenHouseId || selectedWaste.userId?.houseId}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code (Required)</Label>
                <Input
                  id="verification-code"
                  placeholder="Enter 6-digit code from citizen"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-lg font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit verification code provided by the citizen
                </p>
              </div>



              <div className="space-y-2">
                <Label htmlFor="collection-notes">Collection Notes (Optional)</Label>
                <Input
                  id="collection-notes"
                  placeholder="Add notes about the collection..."
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleVerifyCollection}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={!verificationCode || verificationCode.length !== 6}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify & Collect
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVerificationModal(false);
                    setSelectedWaste(null);
                    setVerificationCode("");
                    setCollectionNotes("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* House Status Update Modal */}
      {showHouseModal && selectedHouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Update House Status</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHouseModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">🏠 House Details</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-blue-800"><span className="font-medium">House ID:</span> {selectedHouse.houseId}</p>
                    <p className="text-blue-800"><span className="font-medium">Owner:</span> {selectedHouse.name}</p>
                    <p className="text-blue-800"><span className="font-medium">Address:</span> {selectedHouse.address}</p>
                    {selectedHouse.phone && (
                      <p className="text-blue-800"><span className="font-medium">Phone:</span> {selectedHouse.phone}</p>
                    )}
                    <p className="text-blue-800"><span className="font-medium">Municipal ID:</span> {selectedHouse.municipalId}</p>
                    {selectedHouse.qrCode && (
                      <p className="text-blue-800"><span className="font-medium">QR Code:</span> {selectedHouse.qrCode}</p>
                    )}
                  </div>
                </div>
                <div className={`p-2 rounded text-center text-sm font-medium ${
                  selectedHouse.wasteStatus === 'collected' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  Current Status: {selectedHouse.wasteStatus === 'collected' ? '✓ Collected' : '⏳ Pending Collection'}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={async () => {
                    try {
                      // Check if user is authenticated
                      const token = localStorage.getItem('token');
                      if (!token) {
                        toast({
                          title: "Authentication Required",
                          description: "Please login again to continue",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      // Create waste collection record
                      await api.post('/waste', {
                        type: 'mixed',
                        weight: 5, // Default weight
                        location: selectedHouse.address,
                        description: `House collection for ${selectedHouse.name} - ${selectedHouse.houseId}`,
                        citizenName: selectedHouse.name,
                        citizenHouseId: selectedHouse.houseId
                      });
                      
                      // Update local state and refresh data
                      setMunicipalHouses(prev => 
                        prev.map(h => 
                          h.houseId === selectedHouse.houseId 
                            ? { ...h, wasteStatus: 'collected' }
                            : h
                        )
                      );
                      
                      // Update worker stats
                      setWorkerData(prev => ({
                        ...prev,
                        collectionsToday: prev.collectionsToday + 1,
                        totalCollected: prev.totalCollected + 5 // Default 5kg
                      }));
                      
                      toast({
                        title: "✅ Waste Collected",
                        description: `House ${selectedHouse.houseId} (${selectedHouse.name}) - Collection recorded successfully`
                      });
                      
                      setShowHouseModal(false);
                      
                      // Refresh data to ensure real-time updates
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
                    } catch (error: any) {
                      console.error('Waste collection error:', error);
                      if (error.message.includes('403') || error.message.includes('Forbidden')) {
                        toast({
                          title: "Authentication Error",
                          description: "Please login as a worker to record collections",
                          variant: "destructive"
                        });
                      } else {
                        toast({
                          title: "Update Failed",
                          description: error.message || "Failed to record waste collection",
                          variant: "destructive"
                        });
                      }
                    }
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Mark as Collected
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowHouseModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Recycling Center Profile Modal */}
      {showProfileModal && selectedCenterProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Recycling Center Profile</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowProfileModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-medium text-lg">{selectedCenterProfile.centerName}</h4>
                <p className="text-sm text-muted-foreground">{selectedCenterProfile.email}</p>
                <p className="text-sm text-muted-foreground">{selectedCenterProfile.phone}</p>
              </div>
              
              <div>
                <p className="font-medium">Address:</p>
                <p className="text-sm text-muted-foreground">{selectedCenterProfile.address}</p>
              </div>
              
              <div>
                <p className="font-medium">Waste Types Processed:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCenterProfile.wasteTypesProcessed && selectedCenterProfile.wasteTypesProcessed.length > 0 ? (
                    selectedCenterProfile.wasteTypesProcessed.map((type: string) => (
                      <span key={type} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                    ))
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                      No waste types specified
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <p className="font-medium">Contact Information:</p>
                <p className="text-sm text-muted-foreground">Phone: {selectedCenterProfile.phone}</p>
                <p className="text-sm text-muted-foreground">Status: {selectedCenterProfile.status}</p>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={() => {
                    toast({
                      title: "Invitation Sent",
                      description: `Partnership invitation sent to ${selectedCenterProfile.centerName}`
                    });
                    setShowProfileModal(false);
                  }}
                  className="flex-1"
                >
                  Send Partnership Invitation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowProfileModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};