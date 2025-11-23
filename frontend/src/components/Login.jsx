import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import styles from "./Login.module.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // Keep all the existing handleLogin functionality exactly the same
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const userUID = userCredential.user.uid;

      const seekerDoc = await getDoc(doc(db, "seekers", userUID));
      if (seekerDoc.exists() && seekerDoc.data().userType === "seeker") {
        localStorage.setItem(
          "user",
          JSON.stringify({
            uid: userUID,
            email: email,
            userType: "seeker",
          })
        );
        navigate("/seeker-dashboard");
        return;
      }

      const providerDoc = await getDoc(doc(db, "providers", userUID));
      if (providerDoc.exists() && providerDoc.data().userType === "provider") {
        localStorage.setItem(
          "user",
          JSON.stringify({
            uid: userUID,
            email: email,
            userType: "provider",
          })
        );
        navigate("/provider-dashboard");
        return;
      }

      const entitiesQuery = query(
        collection(db, "entities"),
        where("email", "==", email)
      );
      const entitiesSnapshot = await getDocs(entitiesQuery);
      if (
        !entitiesSnapshot.empty &&
        entitiesSnapshot.docs[0].data().userId === userUID
      ) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            uid: entitiesSnapshot.docs[0].id,
            email: email,
            userType: "entity",
          })
        );
        navigate("/entity-dashboard");
        return;
      }

      setError("User data not found. Please register first.");
    } catch (error) {
      setError(error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1 className={styles.welcomeText}>Welcome back</h1>
          <p className={styles.subtitle}>
            Enter your credentials to sign in to SponsorNest
          </p>

          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.inputLabel}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.inputField}
                placeholder="university@email.com"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.inputLabel}>
                Password
              </label>

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.inputField}
                placeholder="Enter password here"
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

            {error && <p className={styles.errorMessage}>{error}</p>}

            <button
              type="submit"
              className={styles.signInButton}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className={styles.registerText}>
            Don't have an account?{" "}
            <span
              className={styles.registerLink}
              onClick={() => navigate("/seekerRegister")}
            >
              Register now
            </span>
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

export default Login;
