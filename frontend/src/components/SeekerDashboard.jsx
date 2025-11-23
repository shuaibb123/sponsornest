import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import {
  BarChart2, PieChart, Settings, History, List, Handshake, LogOut, Inbox,
  CheckCircle, X, Clock, Calendar, MapPin, Users, CalendarDays, Plus, ArrowRight, Image
} from "lucide-react";
import styles from "./SeekerDashboard.module.css";

const SeekerDashboard = () => {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityDescription, setEntityDescription] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalOpportunities: 0,
    totalEvents: 0,
    sponsorshipResponses: 0,
  });
  const [responses, setResponses] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");

  const COLORS = ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'];

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.uid || user.userType !== "seeker") {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleCreateEntity = async () => {
    if (!entityName || !entityType || !entityDescription || !email || !password) {
      setError("All fields are required.");
      return;
    }

    if (!email.includes("@")) {
      setError("Invalid email format.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.uid) {
        setError("User not authenticated. Please log in again.");
        setLoading(false);
        navigate("/login");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const entityUserId = userCredential.user.uid;

      const newEntity = {
        name: entityName,
        type: entityType,
        description: entityDescription,
        email: email,
        userId: entityUserId,
        createdAt: new Date(),
      };

      const entitiesRef = collection(db, "entities");
      const docRef = await addDoc(entitiesRef, newEntity);
      console.log("Entity created with ID: ", docRef.id);
      alert("Entity created successfully!");

      setEntityName("");
      setEntityType("");
      setEntityDescription("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setError("Failed to create entity. Please try again.");
      console.error("Error creating entity: ", error.message || error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const userId = user.uid;

        // Fetch opportunities
        const oppQuery = query(
          collection(db, "opportunities"),
          where("userId", "==", userId)
        );
        const oppSnapshot = await getDocs(oppQuery);
        const opportunitiesData = oppSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOpportunities(opportunitiesData);

        // Fetch events
        const eventsRef = collection(doc(db, "seekers", userId), "events");
        const eventsSnapshot = await getDocs(eventsRef);
        const eventsData = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(eventsData);
        
        // Update statistics
        setStats({
          totalOpportunities: opportunitiesData.length,
          totalEvents: eventsData.length,
        });

        // Fetch sponsorship responses
        const responsesRef = collection(
          doc(db, "seekers", userId),
          "sponsorshipResponses"
        );
        const responsesSnapshot = await getDocs(responsesRef);
        const responsesData = responsesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setResponses(responsesData);
      } catch (error) {
        console.error("Error fetching dashboard data: ", error);
      }
    };

    fetchDashboardData();
  }, []);

  const getAnalyticsData = () => {
    const filteredResponses = responses;
    const approved = filteredResponses.filter(res => res.status === "approved").length;
    const rejected = filteredResponses.filter(res => res.status === "rejected").length;
    const pending = filteredResponses.filter(res => res.status === "pending").length;
    const total = filteredResponses.length;

    return {
      statusData: [
        { name: 'Approved', value: approved },
        { name: 'Rejected', value: rejected },
        { name: 'Pending', value: pending }
      ],
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      rejectionRate: total > 0 ? Math.round((rejected / total) * 100) : 0,
      pendingCount: pending,
      totalResponses: total
    };
  };

  const { statusData, approvalRate, rejectionRate, pendingCount, totalResponses } = getAnalyticsData();

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
            className={`${styles.navItem} ${activeTab === "events" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <List size={20} className={styles.navIcon} />
            <span className={styles.navText}>Events</span>
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === "analytics" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <BarChart2 size={20} className={styles.navIcon} />
            <span className={styles.navText}>Analytics</span>
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === "requests" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            <Inbox size={20} className={styles.navIcon} />
            <span className={styles.navText}>Requests</span>
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
            <h1 className={styles.pageTitle}>Seeker Dashboard</h1>
            <p className={styles.pageSubtitle}>
              Manage your events and sponsorship opportunities
            </p>
          </div>
          <div className={styles.userActions}>
            <button
              onClick={() => navigate("/create-event")}
              className={styles.createButton}
            >
              <Plus size={18} className={styles.buttonIcon} />
              <span>Create Event</span>
            </button>
          </div>
        </header>

        <div className={styles.contentContainer}>
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <>
              <div className={styles.dashboardGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statTitle}>Total Opportunities</div>
                    <div className={`${styles.statIcon} ${styles.statIconPrimary}`}>
                      <Users size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>{stats.totalOpportunities}</div>
                  <div className={styles.statTrend}>
                    <span>All time</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statTitle}>Total Events</div>
                    <div className={`${styles.statIcon} ${styles.statIconWarning}`}>
                      <CalendarDays size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>{stats.totalEvents}</div>
                  <div className={styles.statTrend}>
                    <span>All time</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statTitle}>Sponsorship Responses</div>
                    <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
                      <Inbox size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>{responses.length}</div>
                  <div className={styles.statTrend}>
                    <span>All time</span>
                  </div>
                </div>
              </div>

              {/* Entity Form Section */}
              <section className={styles.entityFormSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Create New Entity</h2>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Entity Name</label>
                    <input
                      type="text"
                      placeholder="Enter entity name"
                      value={entityName}
                      onChange={(e) => setEntityName(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Entity Type</label>
                    <input
                      type="text"
                      placeholder="e.g., Society, Club"
                      value={entityType}
                      onChange={(e) => setEntityType(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Email</label>
                    <input
                      type="email"
                      placeholder="Enter email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Password</label>
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Description</label>
                    <textarea
                      placeholder="Enter entity description"
                      value={entityDescription}
                      onChange={(e) => setEntityDescription(e.target.value)}
                      className={styles.textareaField}
                      rows={4}
                    />
                  </div>
                </div>
                {error && <div className={styles.errorMessage}>{error}</div>}
                <button
                  onClick={handleCreateEntity}
                  disabled={loading}
                  className={styles.submitButton}
                >
                  {loading ? "Creating..." : "Create Entity"}
                </button>
              </section>

              {/* Events Section */}
              <section className={styles.eventsSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.titleContainer}>
                    <h2 className={styles.sectionTitle}>Your Events</h2>
                    <span className={styles.eventCount}>{events.length} events</span>
                  </div>
                  {events.length > 0 && (
                    <button 
                      className={styles.viewAllButton}
                      onClick={() => setActiveTab("events")}  

                    >
                      View All
                      <ArrowRight size={16} className={styles.arrowIcon} />
                    </button>
                  )}
                </div>
                
                {events.length > 0 ? (
                  <div className={styles.eventList}>
                    {events.slice(0, 8).map((event) => (
                      <div key={event.id} className={styles.eventCard}>
                        <div className={styles.eventImage}>
                          {event.image ? (
                            <img src={event.image} alt={event.EventName} />
                          ) : (
                            <div className={styles.imagePlaceholder}>
                              <Image size={24} className={styles.placeholderIcon} />
                            </div>
                          )}
                        </div>
                        <div className={styles.eventContent}>
                          <div className={styles.eventInfo}>
                            <div className={styles.eventHeader}>
                              <h4 className={styles.eventName}>{event.EventName}</h4>
                              <span className={styles.eventStatus}>
                                {new Date(event.EventDate) > new Date() ? 'Upcoming' : 'Past'}
                              </span>
                            </div>
                            <p className={styles.eventDescription}>
                              {event.description?.length > 100
                                ? `${event.description.substring(0, 100)}...`
                                : event.description || "No description provided"}
                            </p>
                            <div className={styles.eventMeta}>
                              <div className={styles.metaItem}>
                                <Calendar size={16} className={styles.metaIcon} />
                                <span>
                                  {event.EventDate 
                                    ? new Date(event.EventDate).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })
                                    : "Date not set"}
                                </span>
                              </div>
                              <div className={styles.metaItem}>
                                <MapPin size={16} className={styles.metaIcon} />
                                <span>{event.locationOfTheEvent || "Location not set"}</span>
                              </div>
                              <div className={styles.metaItem}>
                                <Users size={16} className={styles.metaIcon} />
                                <span>{event.expectedCrowd ? `${event.expectedCrowd} attendees` : "Crowd not specified"}</span>
                              </div>
                            </div>
                          </div>
                          <div className={styles.eventActions}>
                            <button
                              onClick={() => navigate(`/event/${event.id}`)}
                              className={styles.viewDetailsButton}
                            >
                              View Details
                              <ArrowRight size={16} className={styles.buttonIcon} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <Calendar size={48} className={styles.emptyIcon} />
                    <h3>No events yet</h3>
                    <p>Create your first event to get started</p>
                    <button 
                      className={styles.createEventButton}
                      onClick={() => navigate("/create-event")}
                    >
                      Create Event
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <section className={styles.requestsSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.titleContainer}>
                  <h2 className={styles.sectionTitle}>Approved Requests</h2>
                  <span className={styles.eventCount}>{responses.filter(r => r.status === 'approved').length} approved</span>
                </div>
              </div>
              {responses.filter(r => r.status === 'approved').length > 0 ? (
                <div className={styles.eventList}>
                  {responses.filter(r => r.status === 'approved').map((response) => (
                    <div key={response.id} className={styles.eventCard}>
                      <div className={styles.eventImage}>
                        <div className={styles.imagePlaceholder}>
                          <CheckCircle size={24} className={styles.placeholderIcon} />
                        </div>
                      </div>
                      <div className={styles.eventContent}>
                        <div className={styles.eventInfo}>
                          <div className={styles.eventHeader}>
                            <h4 className={styles.eventName}>{response.eventName}</h4>
                            <span className={styles.eventStatus}>
                              Approved
                            </span>
                          </div>
                          <p className={styles.eventDescription}>
                            <strong>{response.providerName}</strong> has approved your request.
                          </p>
                          <div className={styles.eventMeta}>
                            <div className={styles.metaItem}>
                              <Clock size={16} className={styles.metaIcon} />
                              <span>
                                {response.respondedAt?.toDate 
                                  ? new Date(response.respondedAt.toDate()).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })
                                  : "Date not available"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={styles.eventActions}>
                          <button
                            onClick={() => navigate(`/event/${response.eventId}`)}
                            className={styles.viewDetailsButton}
                          >
                            View Event
                            <ArrowRight size={16} className={styles.buttonIcon} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Inbox size={48} className={styles.emptyIcon} />
                  <h3>No approved requests yet</h3>
                  <p>Approved sponsorship requests will appear here</p>
                </div>
              )}
            </section>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <section className={styles.analyticsSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.titleContainer}>
                  <h2 className={styles.sectionTitle}>Sponsorship Analytics</h2>
                  <span className={styles.eventCount}>{responses.length} total responses</span>
                </div>
              </div>
              {responses.length === 0 ? (
                <div className={styles.emptyState}>
                  <BarChart2 size={48} className={styles.emptyIcon} />
                  <h3>No response data available</h3>
                  <p>Analytics will appear when you receive sponsorship responses</p>
                </div>
              ) : (
                <>
                  <div className={styles.analyticsGrid}>
                    <div className={styles.chartContainer}>
                      <h3 className={styles.chartTitle}>Response Status</h3>
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
                      <h3 className={styles.chartTitle}>Status Distribution</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {statusData.map((entry, index) => (
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

                  <div className={styles.insightsGrid}>
                    <div className={styles.insightCard}>
                      <div className={styles.insightHeader}>
                        <CheckCircle size={24} className={styles.insightIconSuccess} />
                        <h3>Approval Rate</h3>
                      </div>
                      <div className={styles.insightValue}>
                        {approvalRate}%
                      </div>
                      <p className={styles.insightText}>
                        {approvalRate > 50 ? 
                          "You have a high approval rate. Great work!" : 
                          "Consider improving your sponsorship proposals to increase approval rate."}
                      </p>
                    </div>

                    <div className={styles.insightCard}>
                      <div className={styles.insightHeader}>
                        <X size={24} className={styles.insightIconRejected} />
                        <h3>Rejection Rate</h3>
                      </div>
                      <div className={styles.insightValue}>
                        {rejectionRate}%
                      </div>
                      <p className={styles.insightText}>
                        {rejectionRate > 30 ?
                          "High rejection rate may indicate mismatched sponsors." :
                          "Your rejection rate is within a good range."}
                      </p>
                    </div>

                    <div className={styles.insightCard}>
                      <div className={styles.insightHeader}>
                        <Clock size={24} className={styles.insightIconWarning} />
                        <h3>Pending Responses</h3>
                      </div>
                      <div className={styles.insightValue}>
                        {pendingCount}
                      </div>
                      <p className={styles.insightText}>
                        {pendingCount > 0 ?
                          `Waiting for responses on ${pendingCount} requests.` :
                          "All requests have been responded to."}
                      </p>
                    </div>

                    <div className={styles.insightCard}>
                      <div className={styles.insightHeader}>
                        <Inbox size={24} className={styles.insightIconPrimary} />
                        <h3>Total Responses</h3>
                      </div>
                      <div className={styles.insightValue}>
                        {totalResponses}
                      </div>
                      <p className={styles.insightText}>
                        Total sponsorship responses received from all sponsors.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default SeekerDashboard;