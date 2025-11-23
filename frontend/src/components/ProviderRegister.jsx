import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  getDocs,
  query,
  collection,
  where,
} from "firebase/firestore";
import styles from "./providerRegister.module.css";

const ProviderRegister = () => {
  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    email: "",
    password: "",
    sponsorshipAmount: "",
    eventCount: "",
    willingToSponsorOtherCriteria: false,
    selectedEventCriteria: [],
    userType: "provider",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const orgTypes = [
    "Tech company",
    "E-commerce company",
    "Sportswear Brands",
    "Food & Beverage Brands/company",
    "Media & Entertainment Companies",
    "Banks & Financial Institutions",
  ];
  const eventCriteriaList = [
    "career event",
    "cultural event",
    "sport event",
    "charity event",
    "Entertainment event",
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox" && name === "willingToSponsorOtherCriteria") {
      setForm((prev) => ({
        ...prev,
        [name]: checked,
        selectedEventCriteria: checked ? [] : prev.selectedEventCriteria,
      }));
    } else if (type === "checkbox" && name === "selectedEventCriteria") {
      setForm((prev) => ({
        ...prev,
        selectedEventCriteria: checked
          ? [...prev.selectedEventCriteria, value]
          : prev.selectedEventCriteria.filter((item) => item !== value),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
        ...(name === "sponsorshipAmount" && value ? { eventCount: "" } : {}),
        ...(name === "eventCount" && value ? { sponsorshipAmount: "" } : {}),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }

      const seekersSnapshot = await getDocs(
        query(collection(db, "seekers"), where("email", "==", form.email))
      );
      const providersSnapshot = await getDocs(
        query(collection(db, "providers"), where("email", "==", form.email))
      );

      if (!seekersSnapshot.empty || !providersSnapshot.empty) {
        setError("This email is already registered.");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const userUID = userCredential.user.uid;
      await setDoc(doc(db, "providers", userUID), {
        businessName: form.businessName,
        businessType: form.businessType,
        email: form.email,
        userType: form.userType,
        sponsorshipAmount: form.sponsorshipAmount,
        eventCount: form.eventCount,
        willingToSponsorOtherCriteria: form.willingToSponsorOtherCriteria,
        selectedEventCriteria: form.selectedEventCriteria,
        createdAt: new Date().toISOString(),
      });

      navigate("/login", { state: { registered: true } });
    } catch (error) {
      setError(error.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1 className={styles.welcomeText}>Sponsor Registration</h1>
          <p className={styles.subtitle}>
            Join our platform as a sponsor and support amazing events
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="businessName" className={styles.inputLabel}>
                Business Name
              </label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                className={styles.inputField}
                placeholder="Enter your business name"
                value={form.businessName}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="businessType" className={styles.inputLabel}>
                Business Type
              </label>
              <select
                name="businessType"
                id="businessType"
                className={styles.inputFieldtype}
                value={form.businessType}
                onChange={handleChange}
                required
              >
                <option value="">Select business type</option>
                {orgTypes.map((type) => (
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
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.inputLabel}>
                Password
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  className={styles.inputField}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
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
                  value={form.sponsorshipAmount}
                  onChange={handleChange}
                  disabled={form.eventCount}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="eventCount" className={styles.inputLabel}>
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
                  value={form.eventCount}
                  onChange={handleChange}
                  disabled={form.sponsorshipAmount}
                />
                <a href="/forgot-password" className={styles.forgotPassword}>
        Forgot password?
      </a>
              </div>

              
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="willingToSponsorOtherCriteria"
                  checked={form.willingToSponsorOtherCriteria}
                  onChange={handleChange}
                  className={styles.checkboxInput}
                />
                <span>Willing to sponsor other event criteria?</span>
              </label>
            </div>

            {form.willingToSponsorOtherCriteria && (
              <div className={styles.eventCriteriaSection}>
                <h4 className={styles.sectionTitle}>
                  Preferred Event Criteria
                </h4>
                <div className={styles.eventCriteriaGrid}>
                  {eventCriteriaList.map((event) => (
                    <label key={event} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="selectedEventCriteria"
                        value={event}
                        checked={form.selectedEventCriteria.includes(event)}
                        onChange={handleChange}
                        className={styles.checkboxInput}
                      />
                      <span>{event}</span>
                    </label>
                  ))}
                </div>
                
              </div>
            )}

            {error && <p className={styles.errorMessage}>{error}</p>}

            <button
              type="submit"
              className={styles.signInButton}
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          <p className={styles.registerText}>
            Not a sponsor?{" "}
            <Link to="/seekerRegister" className={styles.registerLink}>
              Register as a University
            </Link>
          </p>
          <p className={styles.registerText}>
            Already have an account?{" "}
            <Link to="/login" className={styles.registerLink}>
              Login
            </Link>
          </p>
        </div>

        <div className={styles.brandSection}>
          <h2 className={styles.brandName}>SponsorNest</h2>
          <p className={styles.tagline}>
            Streamline sponsorship management and maximize your event's
            potential
          </p>
        </div>
      </div>
      
    </div>
  );
};

export default ProviderRegister;
