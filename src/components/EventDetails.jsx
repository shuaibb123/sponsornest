import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";

import styles from "./EventDetails.module.css";

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [findingSponsors, setFindingSponsors] = useState(false);
  const [sponsorMatches, setSponsorMatches] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const userId = user?.uid;

        if (!userId) {
          navigate("/login");
          return;
        }

        let eventDocRef = doc(db, "entities", userId, "events", eventId);
        let eventSnap = await getDoc(eventDocRef);

        if (!eventSnap.exists()) {
          // Try seekers path if not found in entities
          eventDocRef = doc(db, "seekers", userId, "events", eventId);
          eventSnap = await getDoc(eventDocRef);
        }

        if (eventSnap.exists()) {
          setEvent({ id: eventSnap.id, ...eventSnap.data() });
        } else {
          setError("Event not found.");
        }
      } catch (err) {
        console.error("Error fetching event:", err);
        setError("Failed to load event. Try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, navigate]);

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this event?"
    );
    if (!confirmDelete) return;

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user?.uid;

      if (!userId) {
        navigate("/login");
        return;
      }

      let deleted = false;

      // Try deleting from entities first
      let eventDocRef = doc(db, "entities", userId, "events", eventId);
      let eventSnap = await getDoc(eventDocRef);

      if (eventSnap.exists()) {
        await deleteDoc(eventDocRef);
        deleted = true;
      } else {
        // Try seekers path
        eventDocRef = doc(db, "seekers", userId, "events", eventId);
        eventSnap = await getDoc(eventDocRef);

        if (eventSnap.exists()) {
          await deleteDoc(eventDocRef);
          deleted = true;
        }
      }

      if (deleted) {
        alert("Event deleted successfully.");
        navigate("/entity-dashboard");
      } else {
        alert("Event not found in either location.");
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event.");
    }
  };

  const handleFindSponsors = async () => {
    setFindingSponsors(true);
    setSponsorMatches(null);
    try {
      const criteriaArray = event.eventCriteria
        ? event.eventCriteria
            .split(/,\s*|\s*,\s*|\s+/)
            .map((item) => item.trim().toLowerCase())
            .filter((item) => item.length > 0)
        : [];

      console.log("Searching with criteria:", criteriaArray);

      // Step 1: Find matching sponsors
      const response = await fetch("http://localhost:5000/find-sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCriteria: criteriaArray,
          eventId: eventId,
          eventData: event,
          userId: JSON.parse(localStorage.getItem("user")).uid,
        }),
      });

      const data = await response.json();
      console.log("Backend response:", data);

      if (data.sponsorMatches && data.sponsorMatches.length > 0) {
        setSponsorMatches(data.sponsorMatches);

        // Step 2: Create sponsorship requests and send emails
        try {
          const emailResponse = await fetch(
            "http://localhost:5000/send-sponsor-emails",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: event,
                sponsors: data.sponsorMatches,
              }),
            }
          );

          const emailResult = await emailResponse.json();
          console.log("Email sending result:", emailResult);
          alert(
            `Found ${data.sponsorMatches.length} sponsors and sent them notifications!`
          );
        } catch (emailError) {
          console.error("Error sending emails:", emailError);
          alert("Found sponsors but failed to send notifications.");
        }
      } else {
        setSponsorMatches([]);
        alert("No sponsors found matching your criteria.");
      }
    } catch (err) {
      console.error("Error finding sponsors:", err);
      alert("Failed to search for sponsors. Please try again.");
    } finally {
      setFindingSponsors(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading event details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h3>Error Loading Event</h3>
        <p>{error}</p>
        <button 
          onClick={() => navigate(-1)} 
          className={styles.errorButton}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Dashboard
        </button>
        <h1 className={styles.pageTitle}>Event Details</h1>
      </div>

      <div className={styles.eventCard}>
        <div className={styles.eventHeader}>
          <h2 className={styles.eventTitle}>{event.EventName || "No title"}</h2>
          <div className={styles.eventStatus}>
            <span className={styles.statusBadge}>Active</span>
            <span className={styles.eventDate}>{event.EventDate || "N/A"}</span>
          </div>
        </div>

        <div className={styles.eventDetails}>
          <div className={styles.detailRow}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Description</span>
              <p className={styles.detailValue}>{event.description || "N/A"}</p>
            </div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Location</span>
              <p className={styles.detailValue}>
                {event.locationOfTheEvent || "N/A"}
              </p>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Expected Crowd</span>
              <p className={styles.detailValue}>
                {event.expectedCrowd || "N/A"}
              </p>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Criteria</span>
              <div className={styles.tags}>
                {event.eventCriteria
                  ? event.eventCriteria.split(",").map((criteria, index) => (
                      <span key={index} className={styles.tag}>
                        {criteria.trim()}
                      </span>
                    ))
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button
            onClick={handleFindSponsors}
            className={styles.primaryButton}
            disabled={findingSponsors}
          >
            {findingSponsors ? (
              <>
                <span className={styles.buttonSpinner}></span>
                Searching...
              </>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Find Sponsors
              </>
            )}
          </button>
          <button onClick={handleDelete} className={styles.dangerButton}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Delete Event
          </button>
        </div>
      </div>

      {/* Sponsor Matching Section */}
      <div className={styles.sponsorSection}>
        <h3 className={styles.sectionTitle}>Sponsor Matching</h3>

        {sponsorMatches === null && !findingSponsors && (
          <div className={styles.emptyState}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14M17 9L17.9014 8.09987C18.2814 7.71991 18.2814 7.08005 17.9014 6.70009L17.3 6.09871C16.9191 5.71875 16.2802 5.71875 15.8993 6.09871L15 7M9 7L8.09861 6.09987C7.71864 5.71991 7.71864 5.08005 8.09861 4.70009L8.69999 4.09871C9.08094 3.71875 9.71983 3.71875 10.1008 4.09871L11 5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="#6366F1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h4>Find Sponsors for Your Event</h4>
            <p>
              Click the "Find Sponsors" button to search for potential sponsors
              that match your event criteria.
            </p>
          </div>
        )}

        {findingSponsors && (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>Searching for matching sponsors...</p>
            <p className={styles.loadingSubtext}>
              Analyzing criteria and finding the best matches
            </p>
          </div>
        )}

        {sponsorMatches && sponsorMatches.length === 0 && (
          <div className={styles.emptyState}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.172 14.828L12.001 12M14.83 9.172L12.001 12M12.001 12L9.172 9.172M12.001 12L14.83 14.828M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="#EF4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h4>No Sponsors Found</h4>
            <p>
              We couldn't find any sponsors matching your criteria. Try adjusting
              your event criteria or search again later.
            </p>
          </div>
        )}

        {sponsorMatches && sponsorMatches.length > 0 && (
          <>
            <div className={styles.matchSummary}>
              <span className={styles.matchCount}>
                {sponsorMatches.length} Potential Sponsor
                {sponsorMatches.length !== 1 ? "s" : ""} Found
              </span>
              <span className={styles.matchInfo}>
                Notifications have been sent to all matched sponsors
              </span>
            </div>

            <div className={styles.sponsorGrid}>
              {sponsorMatches.map((sponsor, index) => (
                <div key={index} className={styles.sponsorCard}>
                  <div className={styles.sponsorHeader}>
                    <div className={styles.sponsorAvatar}>
                      {sponsor.businessName.charAt(0)}
                    </div>
                    <div className={styles.sponsorTitle}>
                      <h4>{sponsor.businessName}</h4>
                      <span className={styles.sponsorType}>
                        {sponsor.businessType}
                      </span>
                    </div>
                  </div>

                  <div className={styles.sponsorDetails}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Email</span>
                      <span className={styles.detailValue}>
                        {sponsor.email}
                      </span>
                    </div>

                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>
                        Sponsorship Amount
                      </span>
                      <span className={styles.detailValue}>
                        Rs. {sponsor.sponsorshipAmount}
                      </span>
                    </div>

                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Events Sponsored</span>
                      <span className={styles.detailValue}>
                        {sponsor.eventCount}
                      </span>
                    </div>
                  </div>

                  <div className={styles.sponsorActions}>
                    <button className={styles.secondaryButton}>
                      View Profile
                    </button>
                    <button className={styles.primaryButton}>Contact</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EventDetails;