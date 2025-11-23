import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CreateEvent.module.css";

const CreateEvent = () => {
  const navigate = useNavigate();
  const [eventData, setEventData] = useState({
    EventName: "",
    description: "",
    EventDate: "",
    locationOfTheEvent: "",
    expectedCrowd: "",
    eventCriteria: "",
  });

  const [proposalFile, setProposalFile] = useState(null);
  const [posterFile, setPosterFile] = useState(null);
  const [meaningfulInfo, setMeaningfulInfo] = useState("");
  const [wasAutofilled, setWasAutofilled] = useState(false);

  const handleChange = (e) => {
    setEventData({ ...eventData, [e.target.name]: e.target.value });
  };
  
  const handleFileChange = (e) => {
    if (e.target.name === "proposalFile") {
      setProposalFile(e.target.files[0]);
    } else if (e.target.name === "posterFile") {
      setPosterFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!posterFile) {
      alert("Please upload a poster image to extract information.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", posterFile);

      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        alert(`Error: ${data.error}`);
        setMeaningfulInfo("");
        return;
      }

      const { extracted_data } = data;

      setMeaningfulInfo(extracted_data);

      setEventData((prev) => ({
        ...prev,
        ...extracted_data,
      }));

      setWasAutofilled(true);
      setTimeout(() => setWasAutofilled(false), 3000);
      alert("Fields autofilled from poster content. Review and submit.");
    } catch (error) {
      console.error("Error uploading file or extracting info:", error);
      alert("Failed to upload or extract text. Please try again.");
      setMeaningfulInfo("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (parseInt(eventData.expectedCrowd) < 100) {
      alert("Expected crowd should be 100 or more.");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.uid) {
      alert("You must be logged in.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("EventName", eventData.EventName);
      formData.append("EventDate", eventData.EventDate);
      formData.append("locationOfTheEvent", eventData.locationOfTheEvent);
      formData.append("expectedCrowd", eventData.expectedCrowd);
      formData.append("description", eventData.description);
      formData.append("eventCriteria", eventData.eventCriteria);
      formData.append("userId", user.uid);
      formData.append("userType", user.userType);
      
      if (proposalFile) {
        formData.append("proposalFile", proposalFile);
      }
      if (posterFile) {
        formData.append("posterFile", posterFile);
      }

      const response = await fetch("http://localhost:5000/events", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      const sponsorResponse = await fetch("http://localhost:5000/find-sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCriteria: [eventData.eventCriteria],
          eventData: { 
            ...eventData,
            proposalUrl: result.proposalUrl,
            posterUrl: result.posterUrl
          },
          userId: user.uid,
          userType: user.userType,
          eventId: result.eventId,
        }),
      });

      const sponsorData = await sponsorResponse.json();
      if (sponsorData.error) throw new Error(sponsorData.error);

      alert("Event created and sponsors notified successfully!");
      navigate(user?.userType === "entity" ? "/entity-dashboard" : "/seeker-dashboard");
    } catch (error) {
      console.error("Error:", error);
      alert(`Submission failed: ${error.message}`);
    }
  };

  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>
            {user?.userType === "entity" ? "Create New Event" : "Create New Event"}
          </h1>
          <br/>
          <p className={styles.pageSubtitle}>
            Fill in the details below to create your event
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          {[
            { name: "EventName", label: "Event name", placeholder: "Specify name of the event", type: "text" },
            { name: "EventDate", label: "Event date", placeholder: "Select date", type: "date" },
            { name: "locationOfTheEvent", label: "Location", placeholder: "Specify location", type: "text" },
            { name: "expectedCrowd", label: "Expected crowd", placeholder: "Minimum 100", type: "number" },
          ].map(({ name, label, placeholder, type }) => (
            <div key={name} className={styles.inputGroup}>
              <label className={styles.inputLabel}>{label}</label>
              <input
                type={type}
                name={name}
                value={eventData[name]}
                onChange={handleChange}
                required
                className={`${styles.inputField} ${wasAutofilled ? styles.highlight : ""}`}
                placeholder={placeholder}
                min={type === "number" ? "100" : undefined}
              />
            </div>
          ))}

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Describe the event in a sentence</label>
            <textarea
              name="description"
              value={eventData.description}
              onChange={handleChange}
              required
              className={styles.textareaField}
              placeholder="Brief description of your event"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Event Criteria</label>
            <select
              name="eventCriteria"
              className={styles.inputField1}
              value={eventData.eventCriteria}
              onChange={handleChange}
              required
            >
              <option value="">Select Criteria</option>
              {[
                "career event",
                "cultural event",
                "sport event",
                "charity event",
                "Entertainment event",
              ].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Event Poster (Optional)</label>
            <div className={styles.fileUploadContainer}>
              <label className={styles.fileUploadLabel}>
                <input
                  type="file"
                  name="posterFile"
                  onChange={handleFileChange}
                  accept="image/*"
                  className={styles.fileUpload}
                />
                <span className={styles.fileUploadText}>
                  {posterFile ? posterFile.name : "Choose file"}
                </span>
                <span className={styles.fileUploadButton}>Browse</span>
              </label>
            </div>
            {posterFile && (
              <button
                type="button"
                onClick={handleUpload}
                className={styles.uploadButton}
              >
                Extract Information from Poster
              </button>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Sponsorship Proposal (Required - PDF)</label>
            <div className={styles.fileUploadContainer}>
              <label className={styles.fileUploadLabel}>
                <input
                  type="file"
                  name="proposalFile"
                  onChange={handleFileChange}
                  accept=".pdf"
                  className={styles.fileUpload}
                  required
                />
                <span className={styles.fileUploadText}>
                  {proposalFile ? proposalFile.name : "Choose file"}
                </span>
                <span className={styles.fileUploadButton}>Browse</span>
              </label>
            </div>
          </div>
        </div>

        {meaningfulInfo && (
          <div className={styles.meaningfulInfo}>
            <h4>Extracted Information:</h4>
            {typeof meaningfulInfo === 'object' && meaningfulInfo !== null ? (
              <ul>
                {Object.entries(meaningfulInfo).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {value}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{meaningfulInfo}</p>
            )}
          </div>
        )}

        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.submitButton}>
            Submit Event
          </button>
          <button
            type="button"
            onClick={() => navigate(user?.userType === "entity" ? "/entity-dashboard" : "/seeker-dashboard")}
            className={styles.backButton}
          >
            Back to Dashboard
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;