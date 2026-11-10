import { useEffect, useState } from "react";
import logoUrl from "./assets/KIDDIES DROID-LOGO.png";
import flyerUrl from "./assets/Kiddiesdroid-Summer-Bootcamp-flyer.png";
import { AppWorkspace } from "./Workspace.jsx";

const AUTH = "/api/v1/auth";

function readCsrfCookie() {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("csrftoken="));
  return cookie ? decodeURIComponent(cookie.slice("csrftoken=".length)) : "";
}

async function readResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    data = { detail: "The server returned an unreadable response." };
  }
  if (!response.ok) {
    const validationDetails = Array.isArray(data.errors) ? data.errors.join(" ") : "";
    throw new Error([data.detail || `Request failed (${response.status}).`, validationDetails].filter(Boolean).join(" "));
  }
  return data;
}

function Icon({ name, className = "" }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m10.85 12.15 7.65-7.65 2 2-2 2 2 2-2 2-2-2-3.65 3.65" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 4.5h6a1.5 1.5 0 0 0-3-1 1.5 1.5 0 0 0-3 1ZM9 12h6M9 16h6" /></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8Z" /><path d="M8 12h8M8 15h5" /></>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-3.2 4.1M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1 0 1.9-.2 2.7-.5" /></>,
    alert: <><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoveryRequest, setIsRecoveryRequest] = useState(false);
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("info");
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        await fetch(`${AUTH}/csrf/`, { credentials: "same-origin" });
        const response = await fetch(`${AUTH}/me/`, { credentials: "same-origin" });
        if (response.ok) {
          const data = await response.json();
          if (active) setUser(data.user);
        }
      } catch {
        if (active) {
          setNotice("Could not reach the Django server. Start the backend, then refresh this page.");
          setNoticeType("error");
        }
      } finally {
        if (active) setBusy(false);
      }
    }
    restoreSession();
    return () => { active = false; };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setNotice("");
    if (!username.trim() || !password) {
      setNotice("Enter both your username and password.");
      setNoticeType("error");
      return;
    }

    setSubmitting(true);
    try {
      const csrfResponse = await fetch(`${AUTH}/csrf/`, { credentials: "same-origin" });
      await readResponse(csrfResponse);
      const response = await fetch(`${AUTH}/login/`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": readCsrfCookie(),
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await readResponse(response);
      setUser(data.user);
      setPassword("");
      setNotice("You are signed in. The session is now available to the /me/ endpoint.");
      setNoticeType("success");
    } catch (error) {
      setNotice(error.message || "Unable to sign in. Check your credentials and try again.");
      setNoticeType("error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setSubmitting(true);
    setNotice("");
    try {
      const response = await fetch(`${AUTH}/logout/`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRFToken": readCsrfCookie() },
      });
      const data = await readResponse(response);
      setUser(null);
      localStorage.removeItem("kd-active-program");
      if (window.location.pathname.startsWith("/app")) window.history.replaceState({}, "", "/");
      setNotice(data.detail || "You have been logged out.");
      setNoticeType("success");
    } catch (error) {
      setNotice(error.message || "Unable to log out. Please try again.");
      setNoticeType("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (user) return <AppWorkspace user={user} onLogout={handleLogout} />;

  async function handlePasswordResetRequest(event) {
    event.preventDefault();
    setNotice("");
    if (!username.trim()) {
      setNotice("Enter your username to request password instructions.");
      setNoticeType("error");
      return;
    }

    setSubmitting(true);
    try {
      const csrfResponse = await fetch(`${AUTH}/csrf/`, { credentials: "same-origin" });
      await readResponse(csrfResponse);
      const response = await fetch(`${AUTH}/password_reset_request/`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": readCsrfCookie(),
        },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await readResponse(response);
      setNotice(data.detail || "If an account matches that username, password instructions have been sent.");
      setNoticeType("success");
    } catch (error) {
      setNotice(error.message || "Unable to submit the request. Please try again.");
      setNoticeType("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="corner-shape" aria-hidden="true" />
      <div className="top-dots" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</div>
      <div className="auth-container">
        <div className="auth-grid">
          <section className="login-column">
            <div className="brand-mark">
              <img src={logoUrl} alt="Kiddies Droid CS Hub" />
              <div><p>Kiddies Droid</p><span>Learning Portal</span></div>
            </div>
            <div className="intro-copy">
              <p className="eyebrow">Student and staff access</p>
              <h1>Kiddies Droid Learning Portal</h1>
              <p className="intro-description">Daily learning, assignments and progress updates.</p>
            </div>

            <section className="login-card" aria-label="Login">
              <div className="card-topline">
                <span className="parent-login-label">Login</span>
              </div>

              {user ? (
                <div className="signed-in-panel">
                  <div className="signed-in-heading"><span className="success-mark"><Icon name="check" /></span><div><p className="signed-in-title">You’re signed in</p><p className="signed-in-subtitle">Your Django session is active.</p></div></div>
                  <dl className="user-details">
                    <div><dt>Username</dt><dd>{user.username}</dd></div>
                    <div><dt>Name</dt><dd>{[user.first_name, user.last_name].filter(Boolean).join(" ") || "Not set"}</dd></div>
                    <div><dt>Role</dt><dd>{user.role || "Not assigned"}</dd></div>
                    <div><dt>User ID</dt><dd>{user.id}</dd></div>
                  </dl>
                  <button className="primary-button full-width" disabled={submitting} onClick={handleLogout} type="button">
                    {submitting ? "Signing out..." : "Log out"}<Icon name="logout" />
                  </button>
                </div>
              ) : isRecoveryRequest ? (
                <form className="login-form" onSubmit={handlePasswordResetRequest}>
                  <p className="form-help">Enter your username. If the account exists, password instructions will be sent to the email address on file.</p>
                  <div className="field-group">
                    <label htmlFor="recovery-username">Username</label>
                    <input id="recovery-username" autoComplete="username" autoFocus onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username" value={username} required />
                  </div>
                  {notice && <div className={`notice notice-${noticeType}`} role={noticeType === "error" ? "alert" : "status"}><Icon name={noticeType === "error" ? "alert" : "shield"} />{notice}</div>}
                  <button className="primary-button full-width" disabled={submitting} type="submit">
                    {submitting ? "Sending instructions..." : "Send password instructions"}<Icon name="arrow" />
                  </button>
                  <button className="text-button recovery-back" onClick={() => { setIsRecoveryRequest(false); setNotice(""); }} type="button">Back to login</button>
                </form>
              ) : (
                <form className="login-form" onSubmit={handleLogin}>
                  <div className="field-group">
                    <label htmlFor="username">Username</label>
                    <input id="username" autoComplete="username" autoFocus inputMode="text" onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username" value={username} />
                  </div>
                  <div className="field-group">
                    <label htmlFor="password">Password</label>
                    <div className="password-wrap">
                      <input id="password" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" type={showPassword ? "text" : "password"} value={password} />
                      <button aria-label={showPassword ? "Hide password" : "Show password"} className="visibility-button" onClick={() => setShowPassword((value) => !value)} type="button"><Icon name={showPassword ? "eyeOff" : "eye"} /></button>
                    </div>
                  </div>
                  <div className="forgot-row"><button className="text-button" onClick={() => { setIsRecoveryRequest(true); setNotice(""); }} type="button"><Icon name="key" />Forgot password?</button></div>
                  {notice && <div className={`notice notice-${noticeType}`} role={noticeType === "error" ? "alert" : "status"}><Icon name={noticeType === "error" ? "alert" : "shield"} />{notice}</div>}
                  <button className="primary-button full-width" disabled={submitting || busy} type="submit">
                    {submitting ? "Signing in..." : busy ? "Checking session..." : "Continue to portal"}<Icon name="arrow" />
                  </button>
                  <p className="form-help">Sign in with the username and password provided for your account.</p>
                </form>
              )}
              {user && notice && <div className={`notice notice-${noticeType} signed-in-notice`} role="status"><Icon name="shield" />{notice}</div>}
              {busy && !user && <p className="loading-note">Checking for an existing session…</p>}
            </section>
          </section>

          <aside className="visual-column" aria-label="Summer Bootcamp staff access visual">
            <div className="flyer-shell">
              <div className="flyer-frame">
                <img className="flyer-image" src={flyerUrl} alt="Students learning coding and robotics during Summer Bootcamp" />
                <div className="flyer-overlay" />
                <div className="secure-pill"><Icon name="shield" />Secure portal</div>
                <div className="flyer-caption"><span className="yellow-bar" /><p>A focused portal for learning reports.</p></div>
              </div>
              <div className="feature-badges">
                <span><Icon name="file" />Daily reports</span>
                <span><Icon name="clipboard" />Assignments</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ResetPasswordPage() {
  const query = new URLSearchParams(window.location.search);
  const uid = query.get("uid") || "";
  const token = query.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState(
    uid && token ? "" : "This password link is missing information. Request a new link and try again.",
  );
  const [noticeType, setNoticeType] = useState(uid && token ? "info" : "error");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice("");

    if (!uid || !token) {
      setNotice("This password link is missing information. Request a new link and try again.");
      setNoticeType("error");
      return;
    }
    if (password !== confirmPassword) {
      setNotice("The passwords do not match.");
      setNoticeType("error");
      return;
    }

    setSubmitting(true);
    try {
      const csrfResponse = await fetch(`${AUTH}/csrf/`, { credentials: "same-origin" });
      await readResponse(csrfResponse);
      const response = await fetch(`${AUTH}/password_reset_confirm/`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": readCsrfCookie(),
        },
        body: JSON.stringify({ uid, token, password }),
      });
      const data = await readResponse(response);
      setComplete(true);
      setPassword("");
      setConfirmPassword("");
      setNotice(data.detail || "Your password has been set. You can now log in.");
      setNoticeType("success");
    } catch (error) {
      setNotice(error.message || "Unable to reset the password. Request a new link and try again.");
      setNoticeType("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="corner-shape" aria-hidden="true" />
      <div className="top-dots" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</div>
      <div className="auth-container">
        <div className="auth-grid">
          <section className="login-column">
            <div className="brand-mark">
              <img src={logoUrl} alt="Kiddies Droid CS Hub" />
              <div><p>Kiddies Droid</p><span>Learning Portal</span></div>
            </div>
            <div className="intro-copy">
              <p className="eyebrow">Secure account recovery</p>
              <h1>Set a new password</h1>
              <p className="intro-description">Choose a new password for your Kiddies Droid account.</p>
            </div>

            <section className="login-card" aria-label="Set a new password">
              <div className="card-topline">
                <span className="dev-badge">Password setup</span>
                <a className="back-login-link" href="/">Back to login</a>
              </div>
              {notice && <div className={`notice notice-${noticeType}`} role={noticeType === "error" ? "alert" : "status"}><Icon name={noticeType === "error" ? "alert" : "shield"} />{notice}</div>}
              {!complete && (
                <form className="login-form reset-form" onSubmit={handleSubmit}>
                  <div className="field-group">
                    <label htmlFor="new-password">New password</label>
                    <input id="new-password" autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} required />
                  </div>
                  <div className="field-group">
                    <label htmlFor="confirm-password">Confirm new password</label>
                    <input id="confirm-password" autoComplete="new-password" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} required />
                  </div>
                  <button className="primary-button full-width" disabled={submitting || !uid || !token} type="submit">
                    {submitting ? "Saving password..." : "Set new password"}<Icon name="arrow" />
                  </button>
                  <p className="form-help">Django will check your password against the account’s password requirements.</p>
                </form>
              )}
              {complete && <a className="primary-button full-width reset-login-button" href="/">Return to login<Icon name="arrow" /></a>}
            </section>
          </section>

          <aside className="visual-column" aria-label="Summer Bootcamp account recovery visual">
            <div className="flyer-shell">
              <div className="flyer-frame">
                <img className="flyer-image" src={flyerUrl} alt="Students learning coding and robotics during Summer Bootcamp" />
                <div className="flyer-overlay" />
                <div className="secure-pill"><Icon name="shield" />Secure account recovery</div>
                <div className="flyer-caption"><span className="yellow-bar" /><p>A fresh start for your learning journey.</p></div>
              </div>
              <div className="feature-badges">
                <span><Icon name="file" />Daily reports</span>
                <span><Icon name="clipboard" />Assignments</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function App() {
  return window.location.pathname === "/reset-password" ? <ResetPasswordPage /> : <LoginPage />;
}

export default App;
