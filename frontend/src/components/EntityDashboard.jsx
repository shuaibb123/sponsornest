import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, Users, DollarSign, Plus, LogOut,
  PieChart, CalendarDays, Settings, BarChart2,
  Clock, ArrowUp, CheckCircle, XCircle, MapPin, Inbox, Handshake, ArrowRight, Image, 
} from "lucide-react";
import { db } from "../firebase";
import { collection, getDocs, doc } from "firebase/firestore";
import styles from "./EntityDashboard.module.css";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';

const EntityDashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [responses, setResponses] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    pendingSponsors: 0,
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.uid || user.userType !== "entity") {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const userId = user.uid;

        const entityRef = doc(db, "entities", userId);
        const eventsRef = collection(entityRef, "events");

        const querySnapshot = await getDocs(eventsRef);
        const eventsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setEvents(eventsData);

        // Fetch sponsorship responses
        const responsesRef = collection(entityRef, "sponsorshipResponses");
        const responsesSnapshot = await getDocs(responsesRef);
        const responsesData = responsesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setResponses(responsesData);
        
        setStats({
          totalEvents: eventsData.length,
          pendingSponsors: eventsData.reduce((acc, event) => acc + (event.pendingSponsors || 0), 0),
          totalFunding: eventsData.reduce((acc, event) => acc + (event.funding || 0), 0),
          fundingGoal: 10000
        });
      } catch (error) {
        console.error("Error fetching data: ", error);
        setError("Failed to fetch data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <XCircle size={48} className={styles.errorIcon} />
        <h3>Error loading dashboard</h3>
        <p className={styles.errorText}>{error}</p>
        <button 
          className={styles.retryButton}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  const COLORS = ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'];

  const eventCategoryData = events.reduce((acc, event) => {
    const category = event.eventCategory || "Uncategorized";
    const existingCategory = acc.find(item => item.name === category);
    if (existingCategory) {
      existingCategory.value += 1;
    } else {
      acc.push({ name: category, value: 1 });
    }
    return acc;
  }, []);

  const fundingData = events.map(event => ({
    name: event.EventName,
    funding: event.funding || 0
  }));

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
            <CalendarDays size={20} className={styles.navIcon} />
            <span className={styles.navText}>Events</span>
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === "sponsors" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("sponsors")}
          >
            <Users size={20} className={styles.navIcon} />
            <span className={styles.navText}>Sponsors</span>
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
            <h1 className={styles.pageTitle}>Event Dashboard</h1>
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
          {/* Stats */}
          {activeTab === "dashboard" && (
            <>
              <div className={styles.dashboardGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statTitle}>Total Events</div>
                    <div className={`${styles.statIcon} ${styles.statIconPrimary}`}>
                      <CalendarDays size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>{stats.totalEvents}</div>
                  <div className={styles.statTrend}>
                    <ArrowUp size={14} />
                    <span>12% from last month</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statTitle}>Pending Sponsors</div>
                    <div className={`${styles.statIcon} ${styles.statIconWarning}`}>
                      <Clock size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>{stats.pendingSponsors}</div>
                  <div className={styles.statTrend}>
                    <ArrowUp size={14} />
                    <span>5% from last month</span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statTitle}>Total Funding</div>
                    <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
                      <DollarSign size={20} />
                    </div>
                  </div>
                  <div className={styles.statValue}>${stats.totalFunding.toLocaleString()}</div>
                  <div className={styles.statTrend}>
                    <ArrowUp size={14} />
                    <span>18% from last month</span>
                  </div>
                </div>
              </div>

              <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Funding Overview</h3>
                <div className={styles.fundingProgress}>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${Math.min(100, (stats.totalFunding / stats.fundingGoal) * 100)}%` }}
                    ></div>
                  </div>
                  <div className={styles.progressText}>
                    <span>${stats.totalFunding.toLocaleString()} raised</span>
                    <span>Goal: ${stats.fundingGoal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Events Section */}
          {/* Events Section */}
{(activeTab === "dashboard" || activeTab === "events") && (
  <section className={styles.eventsSection}>
    <div className={styles.sectionHeader}>
      <div className={styles.titleContainer}>
        <h2 className={styles.sectionTitle}>Your Events</h2>
        <span className={styles.eventCount}>{events.length} events</span>
      </div>
      <button 
        className={styles.viewAllButton}
        onClick={() => navigate("/events")}
      >
        View All
        <ArrowRight size={16} className={styles.arrowIcon} />
      </button>
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
          onClick={() => navigate("/events/create")}
        >
          Create Event
        </button>
      </div>
    )}
  </section>
)}

          {activeTab === "requests" && (
            <section className={styles.requestsSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Approved Requests</h2>
              </div>
              {responses.filter(r => r.status === 'approved').length > 0 ? (
                <div className={styles.eventList}>
                  {responses.filter(r => r.status === 'approved').map((response) => (
                    <div key={response.id} className={styles.eventCard}>
                      <div className={styles.eventInfo}>
                        <h4 className={styles.eventName}>{response.eventName}</h4>
                        <p className={styles.eventDescription}>
                          <strong>{response.providerName}</strong> has approved your request.
                        </p>
                        <div className={styles.eventMeta}>
                          <div className={styles.eventDate}>
                            <CheckCircle size={14} className={styles.metaIcon} />
                            <span>
                              Responded on: {new Date(response.respondedAt.toDate()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <Inbox size={48} />
                  </div>
                  <h3>No approved requests yet</h3>
                  <p className={styles.emptyStateSubtext}>
                    Approved sponsorship requests will appear here.
                  </p>
                </div>
              )}
            </section>
          )}

          {activeTab === 'analytics' && (
            <section className={styles.analyticsSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Event Analytics</h2>
              </div>
              <div className={styles.analyticsGrid}>
                <div className={styles.chartContainer}>
                  <h3 className={styles.chartTitle}>Funding per Event</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={fundingData}>
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
                        dataKey="funding" 
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
                        data={eventCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {eventCategoryData.map((entry, index) => (
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
        </div>
      </main>
    </div>
  );
};

export default EntityDashboard;