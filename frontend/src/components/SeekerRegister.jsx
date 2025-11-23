import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import styles from "./SeekerRegister.module.css";

const SeekerRegister = () => {
  const [form, setForm] = useState({
    businessName: "",
    location: "",
    email: "",
    password: "",
    userType: "seeker",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const locations = [
    { id: 1, name: "Colombo" },
    { id: 2, name: "Kandy" },
    { id: 3, name: "Galle" },
    { id: 4, name: "Jaffna" },
    { id: 5, name: "Negombo" },
    { id: 6, name: "Anuradhapura" },
    { id: 7, name: "Batticaloa" },
    { id: 8, name: "Matara" },
    { id: 9, name: "Trincomalee" },
    { id: 10, name: "Kurunegala" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
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
      await setDoc(doc(db, "seekers", userUID), {
        businessName: form.businessName,
        location: form.location,
        email: form.email,
        userType: form.userType,
        userId: userUID,
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
          <h1 className={styles.welcomeText}>Create University Account</h1>
          <p className={styles.subtitle}>
            Register your institution to access sponsorship opportunities
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="businessName" className={styles.inputLabel}>
                University Name
              </label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                className={styles.inputField}
                placeholder="Enter university name"
                value={form.businessName}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="location" className={styles.inputLabel}>
                Location
              </label>
              <select
                name="location"
                id="location"
                className={styles.inputFieldgroup}
                value={form.location}
                onChange={handleChange}
                required
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.name}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.inputLabel}>
                University Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className={styles.inputField}
                placeholder="Enter university email"
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
                <a href="/forgot-password" className={styles.forgotPassword}>
                        Forgot password?
                      </a>
              </div>
            </div>

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
            Already have an account?{" "}
            <Link to="/login" className={styles.registerLink}>
              Login
            </Link>
          </p>
          <p className={styles.registerText}>
            Want to register as a sponsor?{" "}
            <Link to="/providerRegister" className={styles.registerLink}>
              Sponsor Registration
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

export default SeekerRegister;
