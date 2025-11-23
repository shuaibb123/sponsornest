import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import styles from "./ForgotPassword.module.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error) {
      setError(error.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1 className={styles.welcomeText}>Reset Your Password</h1>
          <p className={styles.subtitle}>
            Enter your email to receive a password reset link
          </p>

          {success ? (
            <div className={styles.successMessage}>
              <svg
                className={styles.successIcon}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <h3 className={styles.successTitle}>Email Sent!</h3>
              <p className={styles.successText}>
                We've sent a password reset link to your email address.
              </p>
              <button
                onClick={() => navigate("/login")}
                className={styles.successButton}
              >
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.inputLabel}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={styles.inputField}
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && <p className={styles.errorMessage}>{error}</p>}

              <button
                type="submit"
                className={styles.signInButton}
                disabled={loading}
              >
                {loading ? (
                  <span className={styles.buttonLoader}></span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}

          <div className={styles.linksContainer}>
            <p className={styles.registerText}>
              Remember your password?{" "}
              <Link to="/login" className={styles.registerLink}>
                Login
              </Link>
            </p>
            <p className={styles.registerText}>
              Don't have an account?{" "}
              <Link to="/seekerRegister" className={styles.registerLink}>
                Register as University
              </Link>{" "}
              or{" "}
              <Link to="/providerRegister" className={styles.registerLink}>
                Register as Sponsor
              </Link>
            </p>
          </div>
        </div>

        <div className={styles.brandSection}>
          <h2 className={styles.brandName}>SponsorNest</h2>
          <p className={styles.tagline}>
            Streamline sponsorship management and maximize your event's potential
          </p>
          <div className={styles.decorativeCircles}>
            <div className={styles.circle1}></div>
            <div className={styles.circle2}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;