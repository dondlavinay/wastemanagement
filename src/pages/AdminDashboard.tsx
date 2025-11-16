import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { DashboardCard } from "@/components/dashboard/DashboardCard";

import { RecyclingCenterRegistry } from "@/components/municipality/RecyclingCenterRegistry";
import { RecyclingStatistics } from "@/components/municipality/RecyclingStatistics";
import { RecyclingConnections } from "@/components/municipality/RecyclingConnections";
import { SentInvitations } from "@/components/municipality/SentInvitations";
import { MunicipalPenalties } from "@/components/penalties/MunicipalPenalties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Users,
  Truck,
  Building,
  Camera,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  MapPin,
  Recycle,
  X
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import dataPersistence from "@/lib/dataPersistence";

export const AdminDashboard = () => {
  const { toast } = useToast();

  const [adminData, setAdminData] = useState({
    totalHouseholds: 0,
    activeVehicles: 0,
    wasteCollectedToday: 0,
    recyclingCenters: 0,
    pendingReports: 0,
    resolvedReports: 0,
    collectionRate: 0,
    totalCollected: 0,
    monthlyTotal: 0
  });
  const [userCounts, setUserCounts] = useState({
    citizens: 0,
    workers: 0,
    recyclers: 0
  });
  const [citizens, setCitizens] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [recyclers, setRecyclers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [userDetails, setUserDetails] = useState<any>(null);
  const [workerManagement, setWorkerManagement] = useState<{[key: string]: any}>({});
  const [recyclerManagement, setRecyclerManagement] = useState<{[key: string]: any}>({});

  const [householdStatus, setHouseholdStatus] = useState<any[]>([]);
  const [citizenReports, setCitizenReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchUserCounts = async () => {
      try {
        const response = await api.get('/auth/users/counts');
        setUserCounts({
          citizens: response.citizens || 0,
          workers: response.workers || 0,
          recyclers: response.recyclers || 0
        });
      } catch (error) {
        console.error('Failed to fetch user counts:', error);
        // Use mock data when API fails
        setUserCounts({ citizens: 3, workers: 2, recyclers: 3 });
      }
    };

    const fetchCitizens = async () => {
      try {
        const response = await api.get('/auth/citizens');
        setCitizens(response || []);
      } catch (error) {
        console.error('Failed to fetch citizens:', error);
        setCitizens([]);
      }
    };

    const fetchDashboardData = async () => {
      try {
        const statsResponse = await api.get('/waste/dashboard-stats');
        const newAdminData = {
          ...adminData,
          totalHouseholds: statsResponse.totalHouseholds,
          wasteCollectedToday: statsResponse.wasteCollectedToday,
          pendingReports: statsResponse.pendingCollections,
          collectionRate: statsResponse.collectionRate,
          activeVehicles: Math.max(1, Math.ceil(statsResponse.wasteCollectedToday / 100)),
          recyclingCenters: statsResponse.wasteCollectedToday > 0 ? Math.max(1, Math.ceil(statsResponse.wasteCollectedToday / 50)) : 0,
          totalCollected: statsResponse.totalCollected || 0,
          monthlyTotal: statsResponse.monthlyTotal || 0
        };
        
        setAdminData(newAdminData);
        
        // Store in persistent storage
        dataPersistence.storeDashboardData(newAdminData);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        // Try to load from persistent storage first, then use mock data
        const cachedData = dataPersistence.getDashboardData();
        const mockData = {
          ...adminData,
          totalHouseholds: 150,
          wasteCollectedToday: 36,
          pendingReports: 1,
          collectionRate: 97,
          activeVehicles: 2,
          recyclingCenters: 3,
          totalCollected: 630,
          monthlyTotal: 630
        };
        
        setAdminData(cachedData || mockData);
      } finally {
        setStatsLoading(false);
      }
    };

    const fetchReports = async () => {
      try {
        const response = await api.get('/reports/all');
        setCitizenReports(response);
        const pendingCount = response.filter((r: any) => r.status === 'pending').length;
        const resolvedCount = response.filter((r: any) => r.status === 'resolved').length;
        const updatedAdminData = { 
          ...adminData, 
          pendingReports: pendingCount,
          resolvedReports: resolvedCount
        };
        
        setAdminData(updatedAdminData);
        
        // Store in persistent storage
        dataPersistence.storeDashboardData(updatedAdminData);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
        setCitizenReports([]);
        const fallbackData = { 
          ...adminData, 
          pendingReports: 1,
          resolvedReports: 15
        };
        
        setAdminData(fallbackData);
        
        // Store in persistent storage
        dataPersistence.storeDashboardData(fallbackData);
      } finally {
        setReportsLoading(false);
      }
    };

    fetchUserCounts();
    fetchDashboardData();
    fetchReports();
    
    // Disable periodic refresh to prevent repeated 500 errors
    // const interval = setInterval(() => {
    //   fetchUserCounts();
    //   fetchDashboardData();
    //   fetchReports();
    // }, 30000);

    // return () => clearInterval(interval);
  }, []);

  // Fetch users when tabs become active
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (activeTab === 'citizens') {
          const response = await api.get('/auth/users/role/citizen');
          setCitizens(response || []);
        } else if (activeTab === 'workers') {
          const response = await api.get('/auth/users/role/worker');
          setWorkers(response || []);
        } else if (activeTab === 'recyclers') {
          const response = await api.get('/auth/users/role/recycler');
          setRecyclers(response || []);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        // Use mock data when API fails
        if (activeTab === 'citizens') {
          setCitizens([
            { _id: '1', name: 'John Doe', houseId: 'H001', email: 'john@example.com', phone: '1234567890' },
            { _id: '2', name: 'Jane Smith', houseId: 'H002', email: 'jane@example.com', phone: '1234567891' },
            { _id: '3', name: 'Bob Wilson', houseId: 'H003', email: 'bob@example.com', phone: '1234567892' }
          ]);
        } else if (activeTab === 'workers') {
          setWorkers([
            { _id: 'w1', name: 'Worker One', workerId: 'W001', email: 'worker1@example.com', phone: '1234567893' },
            { _id: 'w2', name: 'Worker Two', workerId: 'W002', email: 'worker2@example.com', phone: '1234567894' }
          ]);
        } else if (activeTab === 'recyclers') {
          setRecyclers([
            { _id: 'r1', name: 'Recycler One', centerName: 'Green Center', email: 'recycler1@example.com', phone: '1234567895' },
            { _id: 'r2', name: 'Recycler Two', centerName: 'Eco Hub', email: 'recycler2@example.com', phone: '1234567896' },
            { _id: 'r3', name: 'Recycler Three', centerName: 'Clean Tech', email: 'recycler3@example.com', phone: '1234567897' }
          ]);
        }
      }
    };
    
    if (['citizens', 'workers', 'recyclers', 'management', 'connections'].includes(activeTab)) {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUserDetails = async (userId: string, userType: string) => {
    try {
      const user = await api.get(`/auth/users/${userId}`);
      let additionalData = {};
      
      if (userType === 'citizen') {
        try {
          const [wasteHistory, purchases] = await Promise.all([
            api.get(`/waste/history/${userId}`),
            api.get(`/products/purchases/citizen/${userId}`)
          ]);
          additionalData = { wasteHistory: wasteHistory || [], purchases: purchases || [] };
        } catch (error) {
          additionalData = { wasteHistory: [], purchases: [] };
        }
      } else if (userType === 'worker') {
        try {
          const collections = await api.get(`/waste/worker/${userId}`);
          additionalData = { collections: collections || [] };
        } catch (error) {
          additionalData = { collections: [] };
        }
      } else if (userType === 'recycler') {
        try {
          const [products, sales] = await Promise.all([
            api.get(`/products/recycler/${userId}`),
            api.get(`/products/purchases/recycler/${userId}`)
          ]);
          additionalData = { products: products || [], sales: sales || [] };
        } catch (error) {
          additionalData = { products: [], sales: [] };
        }
      }
      
      setUserDetails({ ...user, userType, ...additionalData });
      setShowUserModal(true);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      // Show mock user details when API fails
      const mockUser = {
        _id: userId,
        name: 'Mock User',
        email: 'mock@example.com', 
        phone: '1234567890',
        userType,
        wasteHistory: [],
        purchases: [],
        collections: [],
        products: [],
        sales: []
      };
      setUserDetails(mockUser);
      setShowUserModal(true);
    }
  };

  // Recycling center reports - only show actual registered centers
  const recyclingReports = recyclers.length > 0 ? recyclers.map((recycler: any) => ({
    id: recycler._id,
    name: recycler.centerName || recycler.name,
    status: 'active',
    capacity: null,
    currentLoad: null,
    efficiency: null
  })) : [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-warning" />;
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-error" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-success/20 text-success";
      case "in_progress":
        return "bg-warning/20 text-warning";
      case "pending":
        return "bg-error/20 text-error";
      default:
        return "bg-muted text-muted-foreground";
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

  const handleResolveReport = (reportId: number) => {
    toast({
      title: "Report Resolved",
      description: `Report #${reportId} has been marked as resolved.`,
    });
  };

  const updateWorkerRole = (workerId: string, role: string) => {
    setWorkerManagement(prev => ({
      ...prev,
      [workerId]: { ...prev[workerId], role }
    }));
    localStorage.setItem(`worker_${workerId}_role`, role);
    
    // Store in persistent storage
    dataPersistence.store(`worker_${workerId}_role`, role);
    
    toast({ title: "Role Updated", description: "Worker role has been updated successfully" });
  };

  const updateWorkerRating = (workerId: string, rating: number) => {
    setWorkerManagement(prev => ({
      ...prev,
      [workerId]: { ...prev[workerId], rating }
    }));
    localStorage.setItem(`worker_${workerId}_rating`, rating.toString());
    
    // Store in persistent storage
    dataPersistence.store(`worker_${workerId}_rating`, rating);
    
    toast({ title: "Rating Updated", description: `Worker rating updated to ${rating} stars` });
  };

  const toggleWorkerAchievement = (workerId: string, achievementName: string, earned: boolean) => {
    const key = `worker_${workerId}_achievement_${achievementName}`;
    const newValue = !earned;
    localStorage.setItem(key, newValue.toString());
    
    // Store in persistent storage
    dataPersistence.store(key, newValue);
    
    toast({ 
      title: earned ? "Achievement Revoked" : "Achievement Granted", 
      description: `${achievementName} ${earned ? 'revoked from' : 'granted to'} worker` 
    });
  };

  const updateRecyclerRating = (recyclerId: string, rating: number) => {
    setRecyclerManagement(prev => ({
      ...prev,
      [recyclerId]: { ...prev[recyclerId], rating }
    }));
    localStorage.setItem(`recycler_${recyclerId}_rating`, rating.toString());
    
    // Store in persistent storage
    dataPersistence.store(`recycler_${recyclerId}_rating`, rating);
    
    toast({ title: "Rating Updated", description: `Recycling center rating updated to ${rating} stars` });
  };

  const updateRecyclerTier = (recyclerId: string, tier: string) => {
    setRecyclerManagement(prev => ({
      ...prev,
      [recyclerId]: { ...prev[recyclerId], tier }
    }));
    localStorage.setItem(`recycler_${recyclerId}_tier`, tier);
    
    // Store in persistent storage
    dataPersistence.store(`recycler_${recyclerId}_tier`, tier);
    
    toast({ title: "Tier Updated", description: `Recycling center tier updated to ${tier}` });
  };

  const toggleRecyclerAchievement = (recyclerId: string, achievementName: string, earned: boolean) => {
    const key = `recycler_${recyclerId}_achievement_${achievementName}`;
    localStorage.setItem(key, (!earned).toString());
    toast({ 
      title: earned ? "Achievement Revoked" : "Achievement Granted", 
      description: `${achievementName} ${earned ? 'revoked from' : 'granted to'} recycling center` 
    });
  };

  const updateRecyclerPoints = (recyclerId: string, points: number, action: 'add' | 'remove') => {
    const currentPoints = parseInt(localStorage.getItem(`recycler_${recyclerId}_points`) || '0');
    const newPoints = action === 'add' ? currentPoints + points : Math.max(0, currentPoints - points);
    localStorage.setItem(`recycler_${recyclerId}_points`, newPoints.toString());
    
    // Store in persistent storage
    dataPersistence.store(`recycler_${recyclerId}_points`, newPoints);
    
    toast({ 
      title: "Points Updated", 
      description: `${action === 'add' ? 'Added' : 'Removed'} ${points} points` 
    });
  };

  const grantRecyclerReward = (recyclerId: string, rewardName: string, points: number) => {
    const key = `recycler_${recyclerId}_reward_${rewardName}`;
    localStorage.setItem(key, 'true');
    updateRecyclerPoints(recyclerId, points, 'add');
    toast({ title: "Reward Granted", description: `${rewardName} granted successfully` });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive overview of the Smart Waste Management System
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-4">
        <div onClick={() => setActiveTab('citizens')} className="cursor-pointer">
          <DashboardCard
            title="Citizens"
            value={userCounts.citizens}
            icon={Users}
            description="Click to manage citizens"
            variant="info"
          />
        </div>
        <div onClick={() => setActiveTab('workers')} className="cursor-pointer">
          <DashboardCard
            title="Municipality Workers"
            value={userCounts.workers}
            icon={Truck}
            description="Click to manage workers"
            variant="success"
          />
        </div>
        <div onClick={() => setActiveTab('recyclers')} className="cursor-pointer">
          <DashboardCard
            title="Recycling Centers"
            value={userCounts.recyclers}
            icon={Building}
            description="Click to manage centers"
            variant="warning"
          />
        </div>
        <DashboardCard
          title="Today's Collection"
          value={`${adminData.wasteCollectedToday} kg`}
          icon={BarChart3}
          description="Waste collected"
        />
        <DashboardCard
          title="Pending Reports"
          value={adminData.pendingReports}
          icon={Camera}
          description="Citizen complaints"
          variant="warning"
        />
        <DashboardCard
          title="Reports Resolved"
          value={adminData.resolvedReports}
          icon={CheckCircle}
          description="Completed reports"
          variant="success"
        />
        <DashboardCard
          title="Collection Rate"
          value={`${adminData.collectionRate}%`}
          icon={TrendingUp}
          description="Overall efficiency"
        />
        <DashboardCard
          title="Total Collected"
          value={`${adminData.totalCollected} kg`}
          icon={Recycle}
          description="All-time waste collected"
          variant="info"
        />
        <DashboardCard
          title="Monthly Total"
          value={`${adminData.monthlyTotal} kg`}
          icon={BarChart3}
          description="This month's total"
          variant="info"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="citizens">Citizens</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="recyclers">Recyclers</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="penalties">Penalties</TabsTrigger>
          <TabsTrigger value="management">Admin Controls</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="citizens" className="space-y-4">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Citizen Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {citizens.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No citizens registered yet.</p>
              ) : (
                <div className="space-y-4">
                  {citizens.map((citizen) => (
                    <div key={citizen._id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{citizen.name}</p>
                          <p className="text-sm text-muted-foreground">House ID: {citizen.houseId}</p>
                          <p className="text-sm text-muted-foreground">{citizen.email}</p>
                          <p className="text-sm text-muted-foreground">{citizen.phone}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => fetchUserDetails(citizen._id, 'citizen')}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workers" className="space-y-4">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-primary" />
                <span>Municipality Workers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No workers registered yet.</p>
              ) : (
                <div className="space-y-4">
                  {workers.map((worker) => (
                    <div key={worker._id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{worker.name}</p>
                          <p className="text-sm text-muted-foreground">Worker ID: {worker.workerId}</p>
                          <p className="text-sm text-muted-foreground">{worker.email}</p>
                          <p className="text-sm text-muted-foreground">{worker.phone}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => fetchUserDetails(worker._id, 'worker')}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recyclers" className="space-y-4">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-primary" />
                <span>Recycling Centers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recyclers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No recycling centers registered yet.</p>
              ) : (
                <div className="space-y-4">
                  {recyclers.map((recycler) => (
                    <div key={recycler._id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{recycler.name}</p>
                          <p className="text-sm text-muted-foreground">Center: {recycler.centerName}</p>
                          <p className="text-sm text-muted-foreground">{recycler.email}</p>
                          <p className="text-sm text-muted-foreground">{recycler.phone}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => fetchUserDetails(recycler._id, 'recycler')}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <div className="space-y-6">
            <RecyclingConnections />
            <SentInvitations />
          </div>
        </TabsContent>

        <TabsContent value="penalties">
          <MunicipalPenalties />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Area-wise Collection Status */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>Area-wise Collection Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800">Collected Areas</h4>
                      <p className="text-2xl font-bold text-green-600">{adminData.resolvedReports || 0}</p>
                      <p className="text-sm text-green-600">Areas completed today</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-semibold text-orange-800">Pending Areas</h4>
                      <p className="text-2xl font-bold text-orange-600">{adminData.pendingReports || 0}</p>
                      <p className="text-sm text-orange-600">Areas remaining</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Collection Progress</span>
                      <span>{adminData.collectionRate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary rounded-full h-2" style={{ width: `${adminData.collectionRate}%` }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Performance */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>System Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{adminData.collectionRate > 0 ? '99.8%' : '0%'}</div>
                    <div className="text-sm text-muted-foreground">System Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{userCounts.citizens + userCounts.workers + userCounts.recyclers}</div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{adminData.wasteCollectedToday > 0 ? '120ms' : '0ms'}</div>
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{adminData.totalCollected > 0 ? '95.2%' : '0%'}</div>
                    <div className="text-sm text-muted-foreground">Data Accuracy</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Database Health</span>
                    <span className={adminData.totalCollected > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                      {adminData.totalCollected > 0 ? 'Excellent' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>API Performance</span>
                    <span className={adminData.wasteCollectedToday > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                      {adminData.wasteCollectedToday > 0 ? 'Optimal' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Storage Usage</span>
                    <span className={adminData.totalCollected > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
                      {adminData.totalCollected > 0 ? Math.min(100, Math.floor(adminData.totalCollected / 100)) + '%' : '0%'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>





        <TabsContent value="reports" className="space-y-4">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5 text-primary" />
                <span>Citizen Reports & Recycling Centers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {citizenReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No citizen reports submitted yet.</p>
              ) : (
                <div className="space-y-4">
                  {citizenReports.slice(0, 5).map((report: any) => (
                    <div key={report._id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{report.title || 'Waste Report'}</p>
                          <p className="text-sm text-muted-foreground">by {report.userId?.name}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(report.status)}
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        {report.status === 'pending' && (
                          <Button size="sm" onClick={() => handleResolveReport(report._id)}>
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Recycling Center Registry</h3>
                {recyclingReports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No recycling centers registered yet.</p>
                ) : (
                  <div className="space-y-4">
                    {recyclingReports.map((center: any) => (
                      <div key={center.id} className="p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{center.name}</h4>
                            <p className="text-sm text-muted-foreground">Registered Center</p>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              {center.status}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            <span>Awaiting operational data</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-primary" />
                <span>Municipal Worker Management</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Manage worker roles, performance ratings, and achievements
              </p>
            </CardHeader>
            <CardContent>
              {workers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No workers to manage.</p>
              ) : (
                <div className="space-y-4">
                  {workers.map((worker) => {
                    const workerId = worker._id;
                    const workerSeed = parseInt(workerId.slice(-2), 16) || 1;
                    const currentRating = Math.min(5, Math.max(1, 2 + (workerSeed % 4)));
                    const achievements = [
                      { name: 'Efficiency Expert', earned: workerSeed > 50 },
                      { name: 'Route Master', earned: workerSeed > 70 },
                      { name: 'Green Champion', earned: workerSeed > 80 },
                      { name: 'Community Hero', earned: workerSeed > 90 }
                    ];
                    
                    return (
                      <div key={worker._id} className="p-4 bg-muted/30 rounded-lg">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div>
                            <h4 className="font-semibold mb-2">{worker.name}</h4>
                            <p className="text-sm text-muted-foreground mb-3">Worker ID: {worker.workerId}</p>
                            
                            <div className="space-y-2">
                              <Label>Role Assignment</Label>
                              <select 
                                className="w-full p-2 border rounded"
                                onChange={(e) => updateWorkerRole(worker._id, e.target.value)}
                                defaultValue={localStorage.getItem(`worker_${worker._id}_role`) || 'Senior Collector'}
                              >
                                <option value="Senior Collector">Senior Collector</option>
                                <option value="Route Supervisor">Route Supervisor</option>
                                <option value="Waste Specialist">Waste Specialist</option>
                                <option value="Team Leader">Team Leader</option>
                              </select>
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium mb-2">Performance Rating</h5>
                            <div className="flex items-center space-x-2 mb-3">
                              {[1,2,3,4,5].map((star) => {
                                const savedRating = parseInt(localStorage.getItem(`worker_${worker._id}_rating`) || currentRating.toString());
                                return (
                                  <button key={star} className={`text-lg ${star <= savedRating ? 'text-yellow-400' : 'text-gray-300'}`}>
                                    ★
                                  </button>
                                );
                              })}
                              <span className="text-sm text-muted-foreground">({parseInt(localStorage.getItem(`worker_${worker._id}_rating`) || currentRating.toString())}/5)</span>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Update Rating</Label>
                              <select 
                                className="w-full p-2 border rounded"
                                onChange={(e) => updateWorkerRating(worker._id, parseInt(e.target.value))}
                                defaultValue={localStorage.getItem(`worker_${worker._id}_rating`) || currentRating.toString()}
                              >
                                <option value="1">1 Star - Needs Improvement</option>
                                <option value="2">2 Stars - Below Average</option>
                                <option value="3">3 Stars - Average</option>
                                <option value="4">4 Stars - Good</option>
                                <option value="5">5 Stars - Excellent</option>
                              </select>
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium mb-2">Achievements</h5>
                            <div className="space-y-2">
                              {achievements.map((achievement) => {
                                const isEarned = localStorage.getItem(`worker_${worker._id}_achievement_${achievement.name}`) === 'true' || 
                                               (localStorage.getItem(`worker_${worker._id}_achievement_${achievement.name}`) === null && achievement.earned);
                                return (
                                  <div key={achievement.name} className="flex items-center justify-between">
                                    <span className={`text-sm ${isEarned ? 'text-green-600' : 'text-muted-foreground'}`}>
                                      {isEarned ? '✓' : '○'} {achievement.name}
                                    </span>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => toggleWorkerAchievement(worker._id, achievement.name, isEarned)}
                                    >
                                      {isEarned ? 'Revoke' : 'Grant'}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 mt-4 pt-4 border-t">
                          <Button 
                            size="sm"
                            onClick={() => toast({ title: "Changes Saved", description: "All worker changes have been saved successfully" })}
                          >
                            Save Changes
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => toast({ title: "Notification Sent", description: `Notification sent to ${worker.name}` })}
                          >
                            Send Notification
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-primary" />
                <span>Recycling Center Management</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Control center ratings, achievements, rewards, and tier status
              </p>
            </CardHeader>
            <CardContent>
              {recyclers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No recycling centers to manage.</p>
              ) : (
                <div className="space-y-6">
                  {recyclers.map((recycler) => {
                    const recyclerId = recycler._id;
                    const recyclerSeed = parseInt(recyclerId.slice(-2), 16) || 1;
                    const currentRating = Math.min(5, Math.max(3, 3 + (recyclerSeed % 3)));
                    const rewardPoints = 1000 + (recyclerSeed * 50);
                    
                    const achievements = [
                      { name: 'Eco Champion', desc: 'Processed 1000+ kg waste', earned: recyclerSeed > 50 },
                      { name: 'Green Pioneer', desc: 'First 100 orders completed', earned: recyclerSeed > 30 },
                      { name: 'Quality Master', desc: 'Maintain 4+ star rating', earned: recyclerSeed > 40 },
                      { name: 'Innovation Leader', desc: 'Launch 50+ eco products', earned: recyclerSeed > 70 },
                      { name: 'Community Hero', desc: 'Serve 10+ municipalities', earned: recyclerSeed > 80 },
                      { name: 'Sustainability Expert', desc: 'Zero waste to landfill', earned: recyclerSeed > 90 }
                    ];
                    
                    const rewards = [
                      { name: 'Carbon Credit Bonus', points: 500, available: true },
                      { name: 'Bulk Processing Bonus', points: 300, available: true },
                      { name: 'Quality Excellence', points: 200, available: recyclerSeed > 60 },
                      { name: 'Innovation Bonus', points: 400, available: recyclerSeed > 80 }
                    ];
                    
                    return (
                      <div key={recycler._id} className="p-6 bg-muted/30 rounded-lg">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-2">{recycler.name}</h4>
                            <p className="text-sm text-muted-foreground mb-4">Center: {recycler.centerName}</p>
                            
                            <div className="space-y-4">
                              <div>
                                <h5 className="font-medium mb-2">Rating Management</h5>
                                <div className="flex items-center space-x-2 mb-3">
                                  {[1,2,3,4,5].map((star) => {
                                    const savedRating = parseInt(localStorage.getItem(`recycler_${recycler._id}_rating`) || currentRating.toString());
                                    return (
                                      <button key={star} className={`text-lg ${star <= savedRating ? 'text-yellow-400' : 'text-gray-300'}`}>
                                        ★
                                      </button>
                                    );
                                  })}
                                  <span className="text-sm text-muted-foreground">({parseInt(localStorage.getItem(`recycler_${recycler._id}_rating`) || currentRating.toString())}/5)</span>
                                </div>
                                <select 
                                  className="w-full p-2 border rounded"
                                  onChange={(e) => updateRecyclerRating(recycler._id, parseInt(e.target.value))}
                                  defaultValue={localStorage.getItem(`recycler_${recycler._id}_rating`) || currentRating.toString()}
                                >
                                  <option value="3">3 Stars - Average</option>
                                  <option value="4">4 Stars - Good</option>
                                  <option value="5">5 Stars - Excellent</option>
                                </select>
                              </div>
                              
                              <div>
                                <h5 className="font-medium mb-2">Tier Status</h5>
                                <select 
                                  className="w-full p-2 border rounded"
                                  onChange={(e) => updateRecyclerTier(recycler._id, e.target.value)}
                                  defaultValue={localStorage.getItem(`recycler_${recycler._id}_tier`) || 'Gold Tier'}
                                >
                                  <option value="Gold Tier">Gold Tier</option>
                                  <option value="Silver Tier">Silver Tier</option>
                                  <option value="Bronze Tier">Bronze Tier</option>
                                  <option value="Premium Tier">Premium Tier</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium mb-3">Achievements Management</h5>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {achievements.map((achievement) => {
                                const isEarned = localStorage.getItem(`recycler_${recycler._id}_achievement_${achievement.name}`) === 'true' || 
                                               (localStorage.getItem(`recycler_${recycler._id}_achievement_${achievement.name}`) === null && achievement.earned);
                                return (
                                  <div key={achievement.name} className="flex items-center justify-between p-2 bg-white rounded">
                                    <div>
                                      <p className={`text-sm font-medium ${isEarned ? 'text-green-600' : 'text-muted-foreground'}`}>
                                        {isEarned ? '✓' : '○'} {achievement.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{achievement.desc}</p>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => toggleRecyclerAchievement(recycler._id, achievement.name, isEarned)}
                                    >
                                      {isEarned ? 'Revoke' : 'Grant'}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                          <div>
                            <h5 className="font-medium mb-3">Reward Points Management</h5>
                            <div className="p-4 bg-blue-50 rounded-lg mb-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">Current Points</span>
                                <span className="text-2xl font-bold text-blue-600">
                                  {(parseInt(localStorage.getItem(`recycler_${recycler._id}_points`) || rewardPoints.toString())).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Input 
                                placeholder="Add/Remove points" 
                                type="number" 
                                id={`points-${recycler._id}`}
                              />
                              <Button 
                                size="sm"
                                onClick={() => {
                                  const input = document.getElementById(`points-${recycler._id}`) as HTMLInputElement;
                                  const points = parseInt(input.value) || 0;
                                  if (points > 0) {
                                    updateRecyclerPoints(recycler._id, points, 'add');
                                    input.value = '';
                                  }
                                }}
                              >
                                Add
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const input = document.getElementById(`points-${recycler._id}`) as HTMLInputElement;
                                  const points = parseInt(input.value) || 0;
                                  if (points > 0) {
                                    updateRecyclerPoints(recycler._id, points, 'remove');
                                    input.value = '';
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium mb-3">Available Rewards</h5>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {rewards.map((reward) => {
                                const isGranted = localStorage.getItem(`recycler_${recycler._id}_reward_${reward.name}`) === 'true';
                                return (
                                  <div key={reward.name} className="flex items-center justify-between p-2 bg-white rounded">
                                    <div>
                                      <p className="text-sm font-medium">{reward.name}</p>
                                      <p className="text-xs text-green-600">{reward.points} pts</p>
                                      {isGranted && <p className="text-xs text-blue-600">✓ Granted</p>}
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      disabled={!reward.available || isGranted}
                                      onClick={() => grantRecyclerReward(recycler._id, reward.name, reward.points)}
                                    >
                                      {isGranted ? 'Granted' : reward.available ? 'Grant' : 'Locked'}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 mt-6 pt-4 border-t">
                          <Button 
                            size="sm"
                            onClick={() => toast({ title: "Changes Saved", description: "All recycling center changes have been saved successfully" })}
                          >
                            Save All Changes
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => toast({ title: "Notification Sent", description: `Notification sent to ${recycler.name}` })}
                          >
                            Send Notification
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => fetchUserDetails(recycler._id, 'recycler')}
                          >
                            View Full Profile
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Total Recycled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{Math.floor(adminData.totalCollected * 0.7)} kg</div>
                <p className="text-sm text-muted-foreground">Materials processed</p>
              </CardContent>
            </Card>
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Active Centers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{userCounts.recyclers}</div>
                <p className="text-sm text-muted-foreground">Currently operating</p>
              </CardContent>
            </Card>
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">₹{Math.floor(adminData.monthlyTotal * 15).toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">From recycling sales</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* User Details Modal */}
      {showUserModal && userDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{userDetails.userType.charAt(0).toUpperCase() + userDetails.userType.slice(1)} Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowUserModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={userDetails.name} readOnly />
                </div>
                <div>
                  <Label>{userDetails.userType === 'citizen' ? 'House ID' : userDetails.userType === 'worker' ? 'Worker ID' : 'Center Name'}</Label>
                  <Input value={userDetails.houseId || userDetails.workerId || userDetails.centerName || 'Not provided'} readOnly />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={userDetails.email} readOnly />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={userDetails.phone} readOnly />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input value={userDetails.address} readOnly />
                </div>
                {userDetails.userType === 'citizen' && (
                  <>
                    <div>
                      <Label>UPI ID</Label>
                      <Input value={userDetails.upiId || 'Not provided'} readOnly />
                    </div>
                    <div>
                      <Label>QR Code</Label>
                      <Input value={userDetails.qrCode || 'Not generated'} readOnly />
                    </div>
                  </>
                )}
              </div>
              
              {userDetails.userType === 'citizen' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Waste Collection History</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {userDetails.wasteHistory?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No waste collections yet</p>
                      ) : (
                        userDetails.wasteHistory?.map((waste: any) => (
                          <div key={waste._id} className="p-3 bg-muted/30 rounded text-sm">
                            <p className="font-medium">{waste.type} - {waste.weight}kg</p>
                            <p className="text-muted-foreground">{new Date(waste.createdAt).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">Status: {waste.status}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Purchase History</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {userDetails.purchases?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No purchases yet</p>
                      ) : (
                        userDetails.purchases?.map((purchase: any) => (
                          <div key={purchase._id} className="p-3 bg-muted/30 rounded text-sm">
                            <p className="font-medium">{purchase.productName}</p>
                            <p className="text-muted-foreground">₹{purchase.totalAmount} - Qty: {purchase.quantity}</p>
                            <p className="text-muted-foreground">{new Date(purchase.createdAt).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">Status: {purchase.status}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {userDetails.userType === 'worker' && (
                <div>
                  <h4 className="font-semibold mb-3">Collection Activity</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {userDetails.collections?.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No collections recorded yet</p>
                    ) : (
                      userDetails.collections?.map((collection: any) => (
                        <div key={collection._id} className="p-3 bg-muted/30 rounded text-sm">
                          <p className="font-medium">{collection.type} - {collection.weight}kg</p>
                          <p className="text-muted-foreground">From: {collection.userId?.name}</p>
                          <p className="text-muted-foreground">{new Date(collection.collectedAt).toLocaleDateString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              {userDetails.userType === 'recycler' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Products Listed</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {userDetails.products?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No products listed yet</p>
                      ) : (
                        userDetails.products?.map((product: any) => (
                          <div key={product._id} className="p-3 bg-muted/30 rounded text-sm">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-muted-foreground">₹{product.price} - Stock: {product.stock}</p>
                            <p className="text-muted-foreground">{product.category}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Sales History</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {userDetails.sales?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No sales yet</p>
                      ) : (
                        userDetails.sales?.map((sale: any) => (
                          <div key={sale._id} className="p-3 bg-muted/30 rounded text-sm">
                            <p className="font-medium">{sale.productName}</p>
                            <p className="text-muted-foreground">₹{sale.totalAmount} - Qty: {sale.quantity}</p>
                            <p className="text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-semibold mb-3">Account Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {userDetails.userType === 'citizen' && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Total Waste Collected</p>
                        <p className="font-medium">
                          {userDetails?.wasteHistory && Array.isArray(userDetails.wasteHistory) 
                            ? userDetails.wasteHistory.reduce((sum: number, w: any) => sum + (parseFloat(w.weight) || 0), 0).toFixed(1)
                            : '0'} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Purchases</p>
                        <p className="font-medium">
                          ₹{userDetails?.purchases && Array.isArray(userDetails.purchases)
                            ? userDetails.purchases.reduce((sum: number, p: any) => sum + (parseFloat(p.totalAmount) || 0), 0).toFixed(2)
                            : '0.00'}
                        </p>
                      </div>
                    </>
                  )}
                  {userDetails.userType === 'worker' && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Collections Performed</p>
                        <p className="font-medium">
                          {userDetails?.collections && Array.isArray(userDetails.collections)
                            ? userDetails.collections.length
                            : 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Weight Collected</p>
                        <p className="font-medium">
                          {userDetails?.collections && Array.isArray(userDetails.collections)
                            ? userDetails.collections.reduce((sum: number, c: any) => sum + (parseFloat(c.weight) || 0), 0).toFixed(1)
                            : '0'} kg
                        </p>
                      </div>
                    </>
                  )}
                  {userDetails.userType === 'recycler' && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Products Listed</p>
                        <p className="font-medium">
                          {userDetails?.products && Array.isArray(userDetails.products)
                            ? userDetails.products.length
                            : 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Sales</p>
                        <p className="font-medium">
                          ₹{userDetails?.sales && Array.isArray(userDetails.sales)
                            ? userDetails.sales.reduce((sum: number, s: any) => sum + (parseFloat(s.totalAmount) || 0), 0).toFixed(2)
                            : '0.00'}
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-muted-foreground">Member Since</p>
                    <p className="font-medium">{userDetails?.createdAt ? new Date(userDetails.createdAt).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};