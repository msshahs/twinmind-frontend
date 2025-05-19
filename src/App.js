import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Calendar from './pages/Calendar'
import MeetingView from "./pages/MeetingsView"; // ✅ new import
import SummaryView from "./pages/SummaryView";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/meeting/:id" element={<MeetingView />} />
        <Route path="/summary/:id" element={<SummaryView />} />
        <Route path="/calendar" element={<Calendar />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}

export default App;
