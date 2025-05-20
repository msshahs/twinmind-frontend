import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import twinmindLogo from "../assets/twin.svg"; // Add this logo to your assets
import { checkJwtAndRedirect } from "../utils/checkJwtExpiry";
import { useLoader } from "../context/LoaderContext";
import avtar from '../assets/default-avtar.png'
function Dashboard() {
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [tempTitleMap, setTempTitleMap] = useState({});
    const [user, setUser] = useState(null);
    const { setLoading } = useLoader();
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        checkJwtAndRedirect(navigate);
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) setUser(storedUser);
        fetchMeetings();
    }, []);


    const handleCreateMeeting = async () => {
        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${API_BASE_URL}/meetings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
            });
            const data = await response.json();
            if (data.success) {
                navigate(`/meeting/${data.meeting._id}?autostart=true`);
            } else {
                toast.error("Failed to create meeting");
            }
        } catch (err) {
            console.error("Error creating meeting:", err);
            toast.error("Error starting meeting");
        }
    };

    const fetchMeetings = async () => {
        const token = localStorage.getItem("token");
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/meetings`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setMeetings(data.meetings);
                const titles = {};
                data.meetings.forEach(m => titles[m._id] = m.title || "Untitled Meeting");
                setTempTitleMap(titles);
            } else {
                toast.error("Failed to load meetings");
            }
        } catch (err) {
            console.error("Fetch meetings error:", err);
        }
        finally {
            setLoading(false);
        }
    };

    const updateMeetingTitle = async (id, newTitle) => {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/meetings/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ title: newTitle }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Rename Successful.");
                setMeetings((prev) =>
                    prev.map((m) => m._id === id ? { ...m, title: newTitle } : m)
                );
            } else {
                toast.error("Rename failed");
            }
        } catch (err) {
            console.error("Rename error:", err);
        }
    };

    const deleteMeeting = async (id) => {
        const token = localStorage.getItem("token");
        const confirmed = window.confirm("Are you sure you want to delete this meeting?");
        if (!confirmed) return;
        try {
            setLoading(true)
            const res = await fetch(`${API_BASE_URL}/meetings/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Meeting deleted");
                setMeetings((prev) => prev.filter((m) => m._id !== id));
            } else {
                toast.error("Failed to delete meeting");
            }
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Error deleting meeting");
        } finally {
            setLoading(false)
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const options = {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: 'numeric', minute: '2-digit', hour12: true
        };
        return date.toLocaleString('en-US', options);
    };

    return (
        <div className="min-h-screen p-6 bg-gradient-to-b from-white via-orange-50 to-orange-100">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <img src={twinmindLogo} alt="TwinMind" className="h-10" />
                <div className="relative group">
                    <img
                        src={user?.picture || avtar}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover cursor-pointer border-2 border-twinmind"
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                        <div className="px-4 py-2 text-sm border-b">
                            <p className="font-semibold text-gray-800 truncate">{user?.name}</p>
                            <p className="text-gray-500 truncate">{user?.email}</p>
                        </div>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                navigate("/");
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-4">
                <button
                    onClick={handleCreateMeeting}
                    className="bg-twinmind text-white px-6 py-3 rounded-lg shadow hover:bg-orange-700 transition text-sm font-semibold"
                >
                    Start New Meeting
                </button>

                <button
                    onClick={() => navigate("/calendar")}
                    className="flex items-center gap-2 text-sm text-twinmind font-semibold hover:underline hover:text-orange-700 transition"
                >
                    <span>📅</span>
                    <span>Google Calendar</span>
                </button>
            </div>


            {/* Meeting List */}
            <div className="space-y-4">
                {meetings.length === 0 ? (
                    <p className="text-gray-500 text-sm">No meetings yet.</p>
                ) : (
                    meetings.map((meeting) => {
                        const isEditing = editingId === meeting._id;
                        const handleTitleChange = (e) =>
                            setTempTitleMap({ ...tempTitleMap, [meeting._id]: e.target.value });

                        const handleTitleUpdate = () => {
                            updateMeetingTitle(meeting._id, tempTitleMap[meeting._id]);
                            setEditingId(null);
                        };

                        return (
                            <div
                                key={meeting._id}
                                className="bg-orangetint border border-gray-200 rounded-lg p-4 md:p-5 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4 hover:shadow-md transition cursor-pointer "

                            >
                                <div className="flex-1">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={tempTitleMap[meeting._id] || "Untitled Meeting"}
                                            onChange={handleTitleChange}
                                            onBlur={handleTitleUpdate}
                                            onKeyDown={(e) => e.key === "Enter" && handleTitleUpdate()}
                                            className="text-lg font-semibold border-b focus:outline-none text-gray-800 w-full"
                                            autoFocus
                                        />
                                    ) : (
                                        <h3
                                            className="text-lg font-semibold text-gray-800 cursor-pointer hover:underline truncate"
                                            onClick={() => setEditingId(meeting._id)}
                                        >
                                            {meeting.title || "Untitled Meeting"}
                                        </h3>

                                    )}
                                    <p className="text-sm text-gray-500">Created on: {formatDate(meeting.createdAt)}</p>
                                    <p className="text-sm text-gray-500">
                                        {meeting.summary?.topics?.length
                                            ? "✅ Summary Available"
                                            : "🕐 No summary yet"}
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">

                                    <button
                                        onClick={() => navigate(`/meeting/${meeting._id}`)}
                                        className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm"
                                    >
                                        ▶️ Open Meeting
                                    </button>
                                    <button
                                        onClick={() => navigate(`/summary/${meeting._id}`)}
                                        className="text-twinmind border border-twinmind px-4 py-2 rounded-md hover:bg-twinmind hover:text-white text-sm"
                                    >
                                        🧠 View Summary
                                    </button>
                                    <button
                                        onClick={() => deleteMeeting(meeting._id)}
                                        className="text-red-600 border border-red-600 px-4 py-2 rounded-md hover:bg-red-600 hover:text-white text-sm"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default Dashboard;
