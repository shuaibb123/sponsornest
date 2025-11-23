import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ProviderRegister from "./components/ProviderRegister";
import SeekerRegister from "./components/SeekerRegister";
import Login from "./components/Login";
import SeekerDashboard from "./components/SeekerDashboard";
import ProviderDashboard from "./components/ProviderDashboard";
import CreateEvent from "./components/CreateEvent";
import EntityDashboard from "./components/EntityDashboard";
import EventDetails from "./components/EventDetails";
import ForgotPassword from "./components/ForgotPassword";


function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect "/" to "/login" or another default page */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/providerRegister" element={<ProviderRegister />} />
        <Route path="/seekerRegister" element={<SeekerRegister />} />
        <Route path="/login" element={<Login />} />
        <Route path="/seeker-dashboard" element={<SeekerDashboard />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/event/:eventId" element={<EventDetails />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Add a new route for the EntityDashboard component */}
        <Route path="/entity-dashboard" element={<EntityDashboard />} />
        <Route path="/provider-dashboard" element={<ProviderDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
