import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, Check, X, LogOut, Inbox, Clock, CheckCircle, 
  Calendar, FileText, MapPin, Users, DollarSign, 
  Settings, PieChart, History, List, Handshake, 
  BarChart2, TrendingUp, AlertCircle, Plus 
} from "lucide-react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, getDoc, query, where } from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import styles from "./ProviderDashboard.module.css";

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
  });
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all");
  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    action: null,
    id: null,
    message: "",
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profile, setProfile] = useState({
    businessName: "",
    businessType: "",
    email: "",
    sponsorshipAmount: "",
    eventCount: "",
    willingToSponsorOtherCriteria: false,
    selectedEventCriteria: [],
  });

  const COLORS = ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const userId = user?.uid;

        if (!userId || user.userType !== "provider") {
          navigate("/login");
          return;
        }

        // Fetch sponsorship requests
        const requestsRef = collection(db, "providers", userId, "sponsorshipRequests");
        const requestsSnapshot = await getDocs(requestsRef);
        const requestsData = requestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRequests(requestsData);

        setStats({
          totalRequests: requestsData.length,
          pendingRequests: requestsData.filter(req => req.status === "pending").length,
          approvedRequests: requestsData.filter(req => req.status === "approved").length,
          rejectedRequests: requestsData.filter(req => req.status === "rejected").length,
        });

        // Fetch provider profile
        const profileRef = doc(db, "providers", userId);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Prepare data for analytics charts
  const getChartData = () => {
    const filtered = timeFilter === "month" 
      ? requests.filter(req => {
          const reqDate = req.requestDate?.toDate?.() ?? new Date();
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return reqDate >= monthAgo;
        })
      : requests;

    return {
      statusData: [
        { name: 'Approved', value: filtered.filter(req => req.status === "approved").length },
        { name: 'Rejected', value: filtered.filter(req => req.status === "rejected").length },
        { name: 'Pending', value: filtered.filter(req => req.status === "pending").length }
      ],
      categoryData: filtered.reduce((acc, req) => {
        const category = req.eventCategory || "Other";
        const existing = acc.find(item => item.name === category);
        if (existing) {
          existing.value += 1;
        } else {
          acc.push({ name: category, value: 1 });
        }
        return acc;
      }, [])
    };
  };

  const { statusData, categoryData } = getChartData();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleActionClick = (id, action) => {
    setConfirmation({
      isOpen: true,
      action: action,
      id: id,
      message: `Are you sure you want to ${action} this request?`,
    });
  };

  const handleConfirmAction = async () => {
    const { id, action } = confirmation;
    if (!id || !action) return;

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user?.uid;

      const requestRef = doc(db, "providers", userId, "sponsorshipRequests", id);
      await updateDoc(requestRef, {
        status: action.toLowerCase(),
        respondedAt: new Date(),
      });

      // Also update the seeker's response document
      const originalRequest = requests.find((r) => r.id === id);
      if (originalRequest && originalRequest.requestingUserId) {
        const collectionName = originalRequest.requestingUserType === 'entity' ? 'entities' : 'seekers';
        const responsesQuery = query(
          collection(db, collectionName, originalRequest.requestingUserId, "sponsorshipResponses"),
          where("sponsorshipRequestId", "==", id)
        );
        const responsesSnapshot = await getDocs(responsesQuery);
        responsesSnapshot.forEach(async (responseDoc) => {
          await updateDoc(responseDoc.ref, {
            status: action.toLowerCase(),
            respondedAt: new Date(),
          });
        });
      }

      const updatedRequests = requests.map((req) =>
        req.id === id
          ? { ...req, status: action.toLowerCase(), respondedAt: new Date() }
          : req
      );
      setRequests(updatedRequests);

      setStats({
        totalRequests: updatedRequests.length,
        pendingRequests: updatedRequests.filter(req => req.status === "pending").length,
        approvedRequests: updatedRequests.filter(req => req.status === "approved").length,
        rejectedRequests: updatedRequests.filter(req => req.status === "rejected").length,
      });

      setSelectedRequest(null);
    } catch (err) {
      console.error("Error updating request:", err);
    } finally {
      setConfirmation({ isOpen: false, action: null, id: null, message: "" });
    }
  };

  const handleCancelAction = () => {
    setConfirmation({ isOpen: false, action: null, id: null, message: "" });
  };

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox" && name === "willingToSponsorOtherCriteria") {
      setProfile(prev => ({
        ...prev,
        [name]: checked,
        selectedEventCriteria: checked ? [] : prev.selectedEventCriteria,
      }));
    } else if (type === "checkbox" && name === "selectedEventCriteria") {
      setProfile(prev => ({
        ...prev,
        selectedEventCriteria: checked
          ? [...prev.selectedEventCriteria, value]
          : prev.selectedEventCriteria.filter(item => item !== value),
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [name]: value,
        ...(name === "sponsorshipAmount" && value ? { eventCount: "" } : {}),
        ...(name === "eventCount" && value ? { sponsorshipAmount: "" } : {}),
      }));
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user?.uid;
      const profileRef = doc(db, "providers", userId);
      await updateDoc(profileRef, profile);
      alert("Profile updated successfully!");
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const handleNotify = async (request) => {
    if (!request || !request.requestingUserId) {
      alert("Cannot notify: missing request information.");
      return;
    }

    try {
      const collectionName = request.requestingUserType === 'entity' ? 'entities' : 'seekers';
      const userRef = doc(db, collectionName, request.requestingUserId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error(`${request.requestingUserType} not found`);
      }

      const userEmail = userSnap.data().email;

      const response = await fetch("http://localhost:5000/notify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: userEmail,
          userId: request.requestingUserId,
          eventName: request.eventName,
          providerName: profile.businessName,
          userType: request.requestingUserType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to notify ${request.requestingUserType}`);
      }

      const requestRef = doc(
        db,
        "providers",
        JSON.parse(localStorage.getItem("user")).uid,
        "sponsorshipRequests",
        request.id
      );
      await updateDoc(requestRef, { 
        notified: true,
        notifiedAt: new Date() 
      });

      setRequests(prev =>
        prev.map(r => r.id === request.id ? { ...r, notified: true } : r)
      );

      alert(`${request.requestingUserType === 'entity' ? 'Entity' : 'Seeker'} notified successfully!`);
    } catch (error) {
      console.error(`Error notifying ${request.requestingUserType}:`, error);
      alert(`Failed to notify ${request.requestingUserType}: ${error.message}`);
    }
  };

  const statusDetails = {
    pending: { color: styles.statusPending, icon: <Clock size={18} /> },
    approved: { color: styles.statusApproved, icon: <CheckCircle size={18} /> },
    rejected: { color: styles.statusRejected, icon: <X size={18} /> }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         request.organizationName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoContainer}>
            <Handshake size={24} className={styles.logoIcon} />
            <span className={styles.logoText}>SponsorNest</span>
          </div>
        </div>
        <nav className={styles.navMenu}>
          <div 
            className={`${styles.navItem} ${activeTab === "dashboard" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <PieChart size={20} className={styles.navIcon} />
            <span className={styles.navText}>Dashboard</span>
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === "requests" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            <List size={20} className={styles.navIcon} />
            <span className={styles.navText}>Requests</span>
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === "history" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <History size={20} className={styles.navIcon} />
            <span className={styles.navText}>History</span>
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === "analytics" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <BarChart2 size={20} className={styles.navIcon} />
            <span className={styles.navText}>Analytics</span>
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === "settings" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings size={20} className={styles.navIcon} />
            <span className={styles.navText}>Settings</span>
          </div>
        </nav>
        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.sidebarLogoutButton}>
            <LogOut size={18} className={styles.logoutIcon} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <div>
            <h1 className={styles.pageTitle}>Sponsorship Dashboard</h1>
            <p className={styles.pageSubtitle}>
              Manage and review sponsorship requests from organizations
            </p>
          </div>
          <div className={styles.userActions}>
            <button 
              onClick={openProfileModal}
              className={styles.createButton}
            >
              <Plus size={18} className={styles.buttonIcon} />
              <span>Update Profile</span>
            </button>
          </div>
        </header>

        <div className={styles.contentContainer}>
          {/* Stats */}
          {activeTab === "dashboard" && (
            <>
              <div className={styles.dashboardGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statTitle}>Total Requests</div>
                    <div className={`${styles.statIcon} ${styles.statIconPrimary}`}>
                      <Inbox size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>{stats.totalRequests}</div>
                  <div className={styles.statTrend}>
                    <span>All time</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statTitle}>Pending</div>
                    <div className={`${styles.statIcon} ${styles.statIconWarning}`}>
                      <Clock size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>{stats.pendingRequests}</div>
                  <div className={styles.statTrend}>
                    {stats.pendingRequests > 0 ? (
                      <span>Needs your attention</span>
                    ) : (
                      <span>All caught up!</span>
                    )}
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statTitle}>Approved</div>
                    <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
                      <CheckCircle size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>{stats.approvedRequests}</div>
                  <div className={styles.statTrend}>
                    <span>{Math.round((stats.approvedRequests / stats.totalRequests) * 100)}% approval rate</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Requests Section */}
          {(activeTab === "dashboard" || activeTab === "requests") && (
            <section className={styles.requestsSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Sponsorship Requests</h2>
                <div className={styles.controls}>
                  <div className={styles.searchContainer}>
                    <input
                      type="text"
                      placeholder="Search requests..."
                      className={styles.searchInput}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className={styles.filterSelect}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {filteredRequests.length === 0 ? (
                <div className={styles.emptyState}>
                  <Inbox size={48} />
                  <p>No requests match your search criteria</p>
                  <button 
                    className={styles.clearFilters}
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className={styles.requestList}>
                  {filteredRequests.map((request) => {
                    const requestDate = request.requestDate?.toDate?.() ?? null;
                    const respondedAt = request.respondedAt?.toDate?.() ?? null;

                    return (
                      <div 
                        key={request.id} 
                        className={styles.requestCard}
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsDescriptionExpanded(true);
                        }}
                      >
                        <div className={styles.cardHeader}>
                          <div className={styles.cardHeaderContent}>
                            <div>
                              <span className={styles.requestName}>
                                {request.eventName || "Unnamed Event"}
                              </span>
                              {request.organizationName && (
                                <span className={styles.organizationName}>
                                  {request.organizationName}
                                </span>
                              )}
                            </div>
                            <span className={`${styles.status} ${statusDetails[request.status]?.color || styles.statusPending}`}>
                              {statusDetails[request.status]?.icon}
                              {request.status}
                            </span>
                          </div>
                          {requestDate && (
                            <div className={styles.requestDate}>
                              <Calendar size={14} />
                              Requested: {new Date(requestDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div className={styles.cardContent}>
                          <div className={styles.cardDetailsGrid}>
                            <div className={styles.cardDetailItem}>
                              <Calendar size={16} />
                              <div>
                                <p className={styles.detailLabel}>Event Date</p>
                                <p className={styles.detailValue}>{request.eventDate || "N/A"}</p>
                              </div>
                            </div>

                            <div className={styles.cardDetailItem}>
                              <MapPin size={16} />
                              <div>
                                <p className={styles.detailLabel}>Location</p>
                                <p className={styles.detailValue}>{request.eventLocation || "N/A"}</p>
                              </div>
                            </div>

                            {request.sponsorshipAmount && (
                              <div className={styles.cardDetailItem}>
                                <DollarSign size={16} />
                                <div>
                                  <p className={styles.detailLabel}>Amount</p>
                                  <p className={styles.detailValue}>${request.sponsorshipAmount}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {request.description && (
                            <div className={styles.requestDescription}>
                              <p className={styles.descriptionText}>
                                {request.description.length > 100 
                                  ? `${request.description.substring(0, 100)}...` 
                                  : request.description}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className={styles.cardFooter}>
                          <button
                            className={styles.notifyButton}
                            disabled={request.status !== 'approved' || request.notified}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotify(request);
                            }}
                          >
                            {request.notified ? 'Notified' : `Notify ${request.requestingUserType === 'entity' ? 'Entity' : 'Seeker'}`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Analytics Section */}
          {activeTab === 'analytics' && (
            <section className={styles.analyticsSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Request Analytics</h2>
                <select
                  className={styles.filterSelect}
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
              <div className={styles.analyticsGrid}>
                <div className={styles.chartContainer}>
                  <h3 className={styles.chartTitle}>Request Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          borderColor: '#8b5cf6',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        fill="url(#colorGradient)" 
                        radius={[4, 4, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.chartContainer}>
                  <h3 className={styles.chartTitle}>Event Categories</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          borderColor: '#8b5cf6',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          )}

          {/* Request Detail Modal */}
          {selectedRequest && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                  <h3>{selectedRequest.eventName || "Event Details"}</h3>
                  <span className={`${styles.status} ${statusDetails[selectedRequest.status]?.color || styles.statusPending}`}>
                    {statusDetails[selectedRequest.status]?.icon}
                    {selectedRequest.status}
                  </span>
                </div>

                <div className={styles.modalBody}>
                  <div className={styles.modalSection}>
                    <h4>Event Information</h4>
                    <div className={styles.detailRow}>
                      <div className={styles.detailItem}>
                        <Calendar size={16} />
                        <span>Date:</span>
                        <strong>{selectedRequest.eventDate || "Not specified"}</strong>
                      </div>
                      <div className={styles.detailItem}>
                        <MapPin size={16} />
                        <span>Location:</span>
                        <strong>{selectedRequest.eventLocation || "Not specified"}</strong>
                      </div>
                    </div>
                    <div className={styles.detailRow}>
                      <div className={styles.detailItem}>
                        <Users size={16} />
                        <span>Expected Attendance:</span>
                        <strong>{selectedRequest.expectedCrowd || "Not specified"}</strong>
                      </div>
                      {selectedRequest.sponsorshipAmount && (
                        <div className={styles.detailItem}>
                          <DollarSign size={16} />
                          <span>Requested Amount:</span>
                          <strong>${selectedRequest.sponsorshipAmount}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRequest.matchedCriteria && selectedRequest.matchedCriteria.length > 0 && (
                    <div className={styles.modalSection}>
                      <h4>Matched Criteria</h4>
                      <div className={styles.criteriaList}>
                        {selectedRequest.matchedCriteria.map((criteria, index) => (
                          <span key={index} className={styles.criteriaTag}>
                            {criteria}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.modalSection}>
                    <div 
                      className={styles.sectionHeader} 
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      style={{ cursor: 'pointer' }}
                    >
                      <h4>Event Description</h4>
                      <span>{isDescriptionExpanded ? '▲' : '▼'}</span>
                    </div>
                    {isDescriptionExpanded && (
                      <div className={styles.modalDescriptionContainer}>
                        <p className={styles.modalDescription}>
                          {selectedRequest.description || "No description provided."}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedRequest.posterUrl && (
                  <div className={styles.modalSection}>
                  <h4>Event Poster</h4>
                  <div className={styles.eventPoster}>
                  <a 
                    href={selectedRequest.posterUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.downloadLink}
                  >
                    Download Poster PDF
                  </a>
                  </div>
                </div>
              )}

              {selectedRequest.proposalUrl && (
                <div className={styles.modalSection}>
                  <h4>Sponsorship Proposal</h4>
                  <a 
                    href={selectedRequest.proposalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.downloadLink}
                  >
                    Download Proposal PDF
                  </a>
                </div>
              )}
<div className={styles.modalSection}>
  <h4>Sponsorship Amount</h4>
  <div className={styles.sponsorshipAmountContainer}>
    <input
      type="number"
      placeholder="Enter amount (minimum 5,000)"
      className={styles.sponsorshipInput}
      min="5000"
      value={selectedRequest.sponsorAmount || ""}
      onChange={(e) => {
        const value = e.target.value;
        setSelectedRequest({
          ...selectedRequest,
          sponsorAmount: value === "" ? "" : Number(value) < 0 ? 0 : value
        });
      }}
      required
      disabled={selectedRequest.status !== "approved"}  // Only enable if status is approved
    />
    <button
      className={styles.saveButton}
      onClick={async () => {
        if (!selectedRequest.sponsorAmount || isNaN(selectedRequest.sponsorAmount)) {
          alert("Please enter a valid sponsorship amount");
          return;
        }
        
        const amount = Number(selectedRequest.sponsorAmount);
        if (amount < 5000) {
          alert("Sponsorship amount must be at least 5,000");
          return;
        }

        try {
          const user = JSON.parse(localStorage.getItem("user"));
          const userId = user?.uid;
          
          const requestRef = doc(
            db, 
            "providers", 
            userId, 
            "sponsorshipRequests", 
            selectedRequest.id
          );
          
          await updateDoc(requestRef, {
            sponsorAmount: amount
          });
          
          // Update local state
          setRequests(requests.map(req => 
            req.id === selectedRequest.id ? 
            {...req, sponsorAmount: amount} : 
            req
          ));
          
          alert("Sponsorship amount saved successfully!");
        } catch (error) {
          console.error("Error saving sponsorship amount:", error);
          alert("Failed to save sponsorship amount");
        }
      }}
      disabled={
        !selectedRequest.sponsorAmount || 
        Number(selectedRequest.sponsorAmount) < 5000 ||
        selectedRequest.status !== "approved"  // Only enable if status is approved
      }
    >
      Save
    </button>
  </div>
  {selectedRequest.status !== "approved" && (
    <p className={styles.disabledMessage}>
      You can only set the sponsorship amount after approving this request.
    </p>
  )}
</div>
              

                  {selectedRequest.organizationContact && (
                    <div className={styles.modalSection}>
                      <h4>Contact Information</h4>
                      <div className={styles.contactInfo}>
                        <p><strong>Name:</strong> {selectedRequest.organizationContact.name || "Not provided"}</p>
                        <p><strong>Email:</strong> {selectedRequest.organizationContact.email || "Not provided"}</p>
                        <p><strong>Phone:</strong> {selectedRequest.organizationContact.phone || "Not provided"}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.modalFooter}>
                  {selectedRequest.status === "pending" ? (
                    <>
                      <button 
                        className={styles.modalButtonSecondary}
                        onClick={() => setSelectedRequest(null)}
                      >
                        Close
                      </button>
                      <div className={styles.modalActionButtons}>
                        <button 
                          className={styles.modalButtonReject}
                          onClick={() =>
                            handleActionClick(selectedRequest.id, "rejected")
                          }
                        >
                          <X size={16} />
                          Reject Request
                        </button>
                        <button
                          className={styles.modalButtonApprove}
                          onClick={() =>
                            handleActionClick(selectedRequest.id, "approved")
                          }
                        >
                          <Check size={16} />
                          Approve Request
                        </button>
                      </div>
                    </>
                  ) : (
                    <button 
                      className={styles.modalButtonPrimary}
                      onClick={() => setSelectedRequest(null)}
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {confirmation.isOpen && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent} style={{ maxWidth: "400px" }}>
                <div className={styles.modalHeader}>
                  <h3>Confirm Action</h3>
                </div>
                <div className={styles.modalBody}>
                  <p>{confirmation.message}</p>
                </div>
                <div className={styles.modalFooter}>
                  <button
                    className={styles.modalButtonSecondary}
                    onClick={handleCancelAction}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.modalButtonPrimary}
                    onClick={handleConfirmAction}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Modal */}
          {isProfileModalOpen && (
            <div className={styles.modalOverlay}>
              <div className={`${styles.modalContent} ${styles.profileModalContent}`}>
                <div className={styles.modalHeader}>
                  <h3>Update Profile</h3>
                  <button
                    className={styles.closeButton}
                    onClick={() => setIsProfileModalOpen(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className={styles.modalBody}>
                  <form
                    onSubmit={handleProfileUpdate}
                    className={styles.profileForm}
                  >
                    <div className={styles.inputGroup}>
                      <label
                        htmlFor="businessName"
                        className={styles.inputLabel}
                      >
                        Business Name
                      </label>
                      <input
                        type="text"
                        id="businessName"
                        name="businessName"
                        className={styles.inputField}
                        placeholder="Enter your business name"
                        value={profile.businessName}
                        onChange={handleProfileChange}
                        required
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label
                        htmlFor="businessType"
                        className={styles.inputLabel}
                      >
                        Business Type
                      </label>
                      <select
                        name="businessType"
                        id="businessType"
                        className={styles.inputField}
                        value={profile.businessType}
                        onChange={handleProfileChange}
                        required
                      >
                        <option value="">Select business type</option>
                        {[
                          "Tech company",
                          "E-commerce company",
                          "Sportswear Brands",
                          "Food & Beverage Brands/company",
                          "Media & Entertainment Companies",
                          "Banks & Financial Institutions",
                        ].map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.inputGroup}>
                      <label htmlFor="email" className={styles.inputLabel}>
                        Business Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className={styles.inputField}
                        placeholder="Enter your business email"
                        value={profile.email}
                        onChange={handleProfileChange}
                        required
                        disabled
                      />
                    </div>

                    <div className={styles.sponsorshipOptions}>
                      <div className={styles.inputGroup}>
                        <label
                          htmlFor="sponsorshipAmount"
                          className={styles.inputLabel}
                        >
                          Annual Sponsorship Amount (Rs.)
                        </label>
                        <input
                          type="number"
                          id="sponsorshipAmount"
                          name="sponsorshipAmount"
                          min={1000}
                          className={styles.inputField}
                          placeholder="Enter amount"
                          value={profile.sponsorshipAmount}
                          onChange={handleProfileChange}
                          disabled={profile.eventCount}
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label
                          htmlFor="eventCount"
                          className={styles.inputLabel}
                        >
                          Number of Events to Sponsor
                        </label>
                        <input
                          type="number"
                          id="eventCount"
                          min={1}
                          max={30}
                          name="eventCount"
                          className={styles.inputField}
                          placeholder="Enter number of events"
                          value={profile.eventCount}
                          onChange={handleProfileChange}
                          disabled={profile.sponsorshipAmount}
                        />
                      </div>
                    </div>

                    <div className={styles.checkboxGroup}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          name="willingToSponsorOtherCriteria"
                          checked={profile.willingToSponsorOtherCriteria}
                          onChange={handleProfileChange}
                          className={styles.checkboxInput}
                        />
                        <span>Willing to sponsor other event criteria?</span>
                      </label>
                    </div>

                    {profile.willingToSponsorOtherCriteria && (
                      <div className={styles.eventCriteriaSection}>
                        <h4 className={styles.sectionTitle}>
                          Preferred Event Criteria
                        </h4>
                        <div className={styles.eventCriteriaGrid}>
                          {[
                            "career event",
                            "cultural event",
                            "sport event",
                            "charity event",
                            "Entertainment event",
                          ].map((event) => (
                            <label key={event} className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                name="selectedEventCriteria"
                                value={event}
                                checked={
                                  profile.selectedEventCriteria?.includes(
                                    event
                                  ) || false
                                }
                                onChange={handleProfileChange}
                                className={styles.checkboxInput}
                              />
                              <span>{event}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={styles.modalFooter}>
                      <button
                        type="button"
                        className={styles.modalButtonSecondary}
                        onClick={() => setIsProfileModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={styles.modalButtonPrimary}
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProviderDashboard;