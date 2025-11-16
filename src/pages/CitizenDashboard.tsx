import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { WasteUploadForm } from "@/components/waste/WasteUploadForm";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { VehicleMap } from "@/components/map/VehicleMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CitizenProfile } from "@/components/profile/CitizenProfile";
import { EcoShopping } from "@/components/EcoShopping";
import { CitizenPenalties } from "@/components/penalties/CitizenPenalties";

import {
  Trash2,
  TrendingUp,
  Camera,
  MapPin,
  Calendar,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  ShoppingBag,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dataSync } from "@/lib/dataSync";
import { dataRecovery } from "@/lib/dataRecovery";

export const CitizenDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reportImage, setReportImage] = useState<File | null>(null);
  const [reportLocation, setReportLocation] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [wasteHistory, setWasteHistory] = useState(() => {
    const saved = localStorage.getItem('wasteHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [myReports, setMyReports] = useState(() => {
    const saved = localStorage.getItem('myReports');
    return saved ? JSON.parse(saved) : [];
  });
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('wasteStats');
    return saved ? JSON.parse(saved) : { todayWaste: 0, totalWaste: 0, thisMonth: 0, recycledPercent: 0 };
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(() => {
    const saved = localStorage.getItem('lastUpdate');
    return saved ? new Date(saved) : new Date();
  });
  const [purchaseHistory, setPurchaseHistory] = useState(() => {
    const saved = localStorage.getItem('purchaseHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const fetchDashboardData = async (showErrors = false) => {
    // First, try to load from cache if we need fresh data
    if (!dataSync.needsRefresh('wasteHistory') && !loading) {
      const cachedWaste = dataSync.getCachedData('wasteHistory');
      const cachedReports = dataSync.getCachedData('myReports');
      const cachedStats = dataSync.getCachedData('wasteStats');
      const cachedPurchases = dataSync.getCachedData('purchaseHistory');
      
      if (cachedWaste && cachedReports && cachedStats) {
        setWasteHistory(cachedWaste);
        setMyReports(cachedReports);
        setStats(cachedStats);
        setPurchaseHistory(cachedPurchases || []);
        return;
      }
    }
    
    try {
      const [wasteRes, reportsRes, statsRes] = await Promise.all([
        api.get('/waste/history'),
        api.get('/reports/my-reports'),
        api.get('/waste/stats')
      ]);
      
      let purchasesRes = [];
      try {
        purchasesRes = await api.get('/products/purchases/my');
        console.log('Fetched purchases:', purchasesRes);
      } catch (purchaseError) {
        console.error('Failed to fetch purchases:', purchaseError);
      }
      
      const newStats = statsRes || { todayWaste: 0, totalWaste: 0, thisMonth: 0, recycledPercent: 0 };
      
      // Check if stats have increased (waste was collected)
      if (stats.totalWaste > 0 && newStats.totalWaste > stats.totalWaste) {
        const increase = newStats.totalWaste - stats.totalWaste;
        toast({
          title: "Waste Collected!",
          description: `${increase}kg of your waste was collected by municipality`,
          variant: "default"
        });
      }
      
      // Update state and cache data
      const wasteData = wasteRes || [];
      const reportsData = reportsRes || [];
      const purchaseData = purchasesRes || [];
      const currentTime = new Date();
      
      setWasteHistory(wasteData);
      setMyReports(reportsData);
      setStats(newStats);
      setPurchaseHistory(purchaseData);
      setLastUpdate(currentTime);
      
      // Cache data using sync service
      dataSync.cacheData('wasteHistory', wasteData);
      dataSync.cacheData('myReports', reportsData);
      dataSync.cacheData('wasteStats', newStats);
      dataSync.cacheData('purchaseHistory', purchaseData);
      
      // Also persist to localStorage as backup
      localStorage.setItem('wasteHistory', JSON.stringify(wasteData));
      localStorage.setItem('myReports', JSON.stringify(reportsData));
      localStorage.setItem('wasteStats', JSON.stringify(newStats));
      localStorage.setItem('purchaseHistory', JSON.stringify(purchaseData));
      localStorage.setItem('lastUpdate', currentTime.toISOString());
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      
      // Try to load from cache on error
      const cachedWaste = dataSync.getCachedData('wasteHistory', 24 * 60 * 60 * 1000); // 24 hours
      const cachedReports = dataSync.getCachedData('myReports', 24 * 60 * 60 * 1000);
      const cachedStats = dataSync.getCachedData('wasteStats', 24 * 60 * 60 * 1000);
      const cachedPurchases = dataSync.getCachedData('purchaseHistory', 24 * 60 * 60 * 1000);
      
      if (cachedWaste || cachedReports || cachedStats) {
        if (cachedWaste) setWasteHistory(cachedWaste);
        if (cachedReports) setMyReports(cachedReports);
        if (cachedStats) setStats(cachedStats);
        if (cachedPurchases) setPurchaseHistory(cachedPurchases);
        
        if (showErrors) {
          toast({
            title: "Using Cached Data",
            description: "Showing previously saved data. Will sync when connection is restored.",
            variant: "default"
          });
        }
      } else if (showErrors) {
        toast({
          title: "Connection Error",
          description: "Failed to fetch data and no cached data available.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true); // Show errors on initial load
    
    // Set up polling every 30 seconds (less aggressive)
    const interval = setInterval(() => {
      fetchDashboardData(false); // Don't show errors for background updates
    }, 30000);

    return () => clearInterval(interval);
  }, []);
  
  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('wasteHistory', JSON.stringify(wasteHistory));
  }, [wasteHistory]);
  
  useEffect(() => {
    localStorage.setItem('myReports', JSON.stringify(myReports));
  }, [myReports]);
  
  useEffect(() => {
    localStorage.setItem('wasteStats', JSON.stringify(stats));
  }, [stats]);
  
  useEffect(() => {
    localStorage.setItem('purchaseHistory', JSON.stringify(purchaseHistory));
  }, [purchaseHistory]);

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          setReportLocation(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
          setLocationLoading(false);
          toast({
            title: "Location Captured",
            description: "Your current location has been captured for the report.",
          });
        },
        (error) => {
          setLocationLoading(false);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enter manually.",
            variant: "destructive",
          });
        }
      );
    } else {
      setLocationLoading(false);
      toast({
        title: "Location Not Supported",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
    }
  };

  const handleReportSubmit = async () => {
    if (!reportLocation || !reportDescription) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('location', reportLocation);
      formData.append('description', reportDescription);
      if (currentLocation) {
        formData.append('coordinates', JSON.stringify(currentLocation));
      }
      if (reportImage) {
        formData.append('image', reportImage);
      }

      const response = await fetch('http://localhost:3001/api/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }
      
      toast({
        title: "Report Submitted!",
        description: "Your waste dumping report has been sent to the municipality.",
      });

      setReportLocation("");
      setReportDescription("");
      setReportImage(null);
      setCurrentLocation(null);
      
      const reportsRes = await api.get('/reports/my-reports');
      setMyReports(reportsRes);
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelPurchase = async (purchaseId: string) => {
    try {
      await api.patch(`/products/purchases/${purchaseId}/cancel`, {});
      toast({
        title: "Purchase Cancelled",
        description: "Your purchase has been cancelled successfully.",
      });
      fetchDashboardData();
    } catch (error) {
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel purchase. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-error" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Citizen Dashboard</h1>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Welcome back, {user?.name} {user?.houseId && `(House ID: ${user.houseId})`}
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
              {dataRecovery.needsRecovery('citizen') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await dataRecovery.recoverCitizenData();
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <DashboardCard
          title="Today Waste Collected"
          value={`${stats.todayWaste || 0} kg`}
          icon={Clock}
          description="Collected today"
        />
        <DashboardCard
          title="Total Waste Collected"
          value={`${stats.totalWaste} kg`}
          icon={Trash2}
          description="Successfully collected by municipality"
        />
        <DashboardCard
          title="This Month Collected"
          value={`${stats.thisMonth} kg`}
          icon={Calendar}
          description="Waste collected this month"
          variant="success"
        />
        <DashboardCard
          title="Recycling Rate"
          value={`${stats.recycledPercent}%`}
          icon={TrendingUp}
          description="Your contribution to recycling"
          variant="success"
        />
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="upload">Upload Waste</TabsTrigger>
          <TabsTrigger value="history">Waste History</TabsTrigger>
          <TabsTrigger value="tracking">Vehicle Tracking</TabsTrigger>
          <TabsTrigger value="report">Report Waste</TabsTrigger>
          <TabsTrigger value="reports">My Reports</TabsTrigger>
          <TabsTrigger value="penalties">Penalties</TabsTrigger>
          <TabsTrigger value="shopping">Eco Shopping</TabsTrigger>
          <TabsTrigger value="purchases">My Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <CitizenProfile />
        </TabsContent>

        <TabsContent value="upload">
          <WasteUploadForm onUploadSuccess={fetchDashboardData} />
        </TabsContent>

        <TabsContent value="shopping">
          <EcoShopping />
        </TabsContent>

        <TabsContent value="penalties">
          <CitizenPenalties />
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <span>My Purchase History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading purchase history...</p>
              ) : purchaseHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No purchases yet.</p>
              ) : (
                <div className="space-y-4">
                  {purchaseHistory.map((purchase: any) => (
                    <div key={purchase._id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {purchase.productId?.imageUrl ? (
                              <img src={purchase.productId.imageUrl} alt={purchase.productName} className="w-full h-full object-contain" />
                            ) : (
                              <ShoppingBag className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{purchase.productName}</p>
                            <p className="text-sm text-muted-foreground">From: {purchase.sellerId?.name}</p>
                            <p className="text-xs text-muted-foreground">{new Date(purchase.createdAt).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Delivery: {purchase.deliveryAddress}</p>
                            {purchase.notes && (
                              <p className="text-xs text-muted-foreground">Notes: {purchase.notes}</p>
                            )}
                            {purchase.verificationCode ? (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                <p className="text-xs font-medium text-blue-800">🔐 Verification Code:</p>
                                <p className="text-lg font-mono font-bold text-blue-900 bg-white px-2 py-1 rounded border">{purchase.verificationCode}</p>
                                <p className="text-xs text-blue-700 mt-1">Share this code with seller for order verification</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-1 text-xs"
                                  onClick={() => {
                                    navigator.clipboard.writeText(purchase.verificationCode);
                                    toast({ title: "Code Copied!", description: "Verification code copied to clipboard" });
                                  }}
                                >
                                  Copy Code
                                </Button>
                              </div>
                            ) : (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                <p className="text-xs font-medium text-yellow-800">🔑 Generate Verification Code</p>
                                <p className="text-xs text-yellow-700">Create a 6-digit code for order verification</p>
                                <Button
                                  size="sm"
                                  className="mt-1 text-xs bg-blue-600 hover:bg-blue-700"
                                  onClick={async () => {
                                    try {
                                      console.log('Generating code for purchase:', purchase._id);
                                      const response = await api.patch(`/products/purchases/${purchase._id}/generate-code`, {});
                                      console.log('Code generation response:', response);
                                      
                                      toast({
                                        title: "🔐 Code Generated!",
                                        description: `Verification code: ${response.verificationCode}`
                                      });
                                      
                                      // Force refresh the data
                                      setTimeout(() => {
                                        fetchDashboardData();
                                      }, 500);
                                    } catch (error) {
                                      console.error('Generate code error:', error);
                                      toast({
                                        title: "Generation Failed",
                                        description: error.response?.data?.message || error.message || "Could not generate verification code",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                >
                                  Generate Code
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <p className="font-bold text-green-600">₹{purchase.totalAmount}</p>
                          <p className="text-sm text-muted-foreground">Qty: {purchase.quantity}</p>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            purchase.status === 'completed' ? 'bg-green-100 text-green-800' :
                            purchase.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            purchase.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                          </div>
                          {purchase.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelPurchase(purchase._id)}
                              className="text-xs"
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trash2 className="h-5 w-5 text-primary" />
                <span>Waste Collection History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading waste history...</p>
              ) : wasteHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No waste collection history found.</p>
              ) : (
                <div className="space-y-4">
                  {wasteHistory.map((entry: any) => (
                    <div key={entry._id} className="p-4 bg-muted/30 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${entry.status === 'collected' ? "bg-success" : "bg-warning"}`} />
                          <div className="flex-1">
                            <p className="font-medium">{entry.type.charAt(0).toUpperCase() + entry.type.slice(1)} Waste</p>
                            <p className="text-sm text-muted-foreground">Uploaded: {new Date(entry.createdAt).toLocaleDateString()} at {new Date(entry.createdAt).toLocaleTimeString()}</p>
                            {entry.status === 'collected' && entry.collectedAt && (
                              <p className="text-xs text-success">✅ Collected: {new Date(entry.collectedAt).toLocaleDateString()} at {new Date(entry.collectedAt).toLocaleTimeString()}</p>
                            )}
                            
                            {/* Show exact waste details */}
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                              <p><span className="font-medium">Weight:</span> {entry.weight} kg</p>
                              <p><span className="font-medium">Location:</span> {entry.location || 'Not specified'}</p>
                              {entry.description && (
                                <p><span className="font-medium">Description:</span> {entry.description}</p>
                              )}
                              <p><span className="font-medium">Waste ID:</span> {entry._id.slice(-6).toUpperCase()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div>
                            <p className="font-medium text-lg">{entry.weight} kg</p>
                            <p className={`text-sm font-medium px-2 py-1 rounded ${entry.status === 'collected' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                              {entry.status === 'collected' ? '✅ Collected' : '⏳ Pending'}
                            </p>
                            {entry.status === 'collected' && entry.collectedBy && (
                              <p className="text-xs text-muted-foreground">by Municipal Worker</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              const confirmed = window.confirm('Are you sure you want to delete this waste record? This action cannot be undone.');
                              if (!confirmed) return;
                              
                              try {
                                console.log('Deleting waste with ID:', entry._id);
                                const token = localStorage.getItem('token');
                                if (!token) {
                                  throw new Error('Authentication required. Please log in again.');
                                }
                                
                                await api.delete(`/waste/${entry._id}`);
                                toast({
                                  title: "✅ Waste Deleted",
                                  description: "Waste record has been deleted successfully.",
                                });
                                fetchDashboardData();
                              } catch (error: any) {
                                console.error('Delete waste error:', error);
                                toast({
                                  title: "❌ Delete Failed",
                                  description: error.message || "Failed to delete waste record",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      {entry.status === 'pending' && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-orange-900">⏳ Awaiting Collection</p>
                              <p className="text-xs text-orange-700">Municipal worker will collect this waste</p>
                            </div>
                          </div>
                          
                          {entry.verificationCode ? (
                            <div className="bg-blue-50 border border-blue-200 rounded p-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-blue-900">🔐 Verification Code</p>
                                  <p className="text-xs text-blue-700">Share this code with municipal worker for collection</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold text-blue-600 font-mono bg-white px-3 py-2 rounded border shadow-sm">{entry.verificationCode}</p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-1 text-xs"
                                    onClick={() => {
                                      navigator.clipboard.writeText(entry.verificationCode);
                                      toast({ title: "Code Copied!", description: "Verification code copied to clipboard" });
                                    }}
                                  >
                                    Copy Code
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-orange-900">🔑 Generate Verification Code</p>
                                <p className="text-xs text-orange-700">Create a code for secure collection verification</p>
                              </div>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={async () => {
                                  try {
                                    const response = await api.patch(`/waste/${entry._id}/generate-code`);
                                    toast({
                                      title: "🔐 Code Generated!",
                                      description: `Verification code: ${response.verificationCode}. Share with municipal worker.`,
                                    });
                                    fetchDashboardData();
                                  } catch (error: any) {
                                    console.error('Generate code error:', error);
                                    toast({
                                      title: "❌ Generation Failed",
                                      description: error.response?.data?.message || error.message || "Failed to generate verification code",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                🔑 Generate Code
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      {entry.status === 'collected' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-900">✅ Collection Completed</p>
                              <p className="text-xs text-green-700">
                                {entry.verificationCode 
                                  ? `Verified with code: ${entry.verificationCode}` 
                                  : 'Collected by municipal worker'
                                }
                              </p>
                              {entry.completionNotes && (
                                <p className="text-xs text-green-600 mt-1">Notes: {entry.completionNotes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <CheckCircle className="h-6 w-6 text-green-600" />
                              <p className="text-xs text-green-600 mt-1">Verified</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <VehicleMap />
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5 text-primary" />
                <span>Report Dumped Waste</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="flex space-x-2">
                  <Input
                    id="location"
                    placeholder="Enter location or use current location"
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={locationLoading}
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    {locationLoading ? "Getting..." : "Use Current"}
                  </Button>
                </div>
                {currentLocation && (
                  <p className="text-xs text-green-600">
                    📍 Location captured: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the waste dumping situation..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Upload Photo (Optional)</Label>
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="photo"
                    accept="image/*"
                    onChange={(e) => setReportImage(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="photo" className="cursor-pointer block">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {reportImage ? `📷 ${reportImage.name}` : "Click to upload photo"}
                    </p>
                  </label>
                </div>
                {reportImage && (
                  <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                    <span className="text-sm text-green-800">✅ Photo selected: {reportImage.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReportImage(null)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              <Button onClick={handleReportSubmit} className="w-full" variant="hero">
                <Camera className="mr-2 h-4 w-4" />
                Submit Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>My Submitted Reports</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading reports...</p>
              ) : myReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No reports submitted yet.</p>
              ) : (
                <div className="space-y-4">
                  {myReports.map((report: any) => (
                    <div key={report._id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(report.status)}
                          <span className="font-medium">{report.location}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                      {report.image && (
                        <div className="mb-2">
                          <div className="relative inline-block">
                            <img 
                              src={`http://localhost:3001/uploads/${report.image}`} 
                              alt="Report evidence" 
                              className="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(`http://localhost:3001/uploads/${report.image}`, '_blank')}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-all rounded-lg">
                              <Eye className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">📷 Your submitted photo - Click to view</p>
                        </div>
                      )}

                      {report.status === 'resolved' && report.completionNotes && (
                        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-xs font-medium text-green-800">Completion Notes:</p>
                          <p className="text-xs text-green-700">{report.completionNotes}</p>
                        </div>
                      )}
                      {report.status === 'resolved' && report.wasteCollected && (
                        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs font-medium text-blue-800">Waste Collected: {report.wasteCollected}kg</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${report.status === "resolved" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            const confirmed = window.confirm('Are you sure you want to delete this report? This action cannot be undone.');
                            if (!confirmed) return;
                            
                            try {
                              console.log('Deleting report with ID:', report._id);
                              const token = localStorage.getItem('token');
                              if (!token) {
                                throw new Error('Authentication required. Please log in again.');
                              }
                              
                              await api.delete(`/reports/${report._id}`);
                              toast({
                                title: "✅ Report Deleted",
                                description: "Report has been deleted successfully.",
                              });
                              fetchDashboardData();
                            } catch (error: any) {
                              console.error('Delete report error:', error);
                              toast({
                                title: "❌ Delete Failed",
                                description: error.message || "Failed to delete report",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};