import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { checkJwtAndRedirect } from "../utils/checkJwtExpiry";
import { useLoader } from "../context/LoaderContext";
import { toast } from 'react-toastify';


function SummaryView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [title, setTitle] = useState("Loading...");
    const [loading, setLoadings] = useState(false);
    const { setLoading } = useLoader();
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;



    useEffect(() => {
        checkJwtAndRedirect(navigate);
    }, []);

    const fetchMeetingSummary = async () => {
        const token = localStorage.getItem("token");
        setLoading(true)
        const res = await fetch(`${API_BASE_URL}/meetings/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success) {
            setTitle(data.meeting.title || "Meeting");
            if (data.meeting.summary?.topics?.length) {
                setSummary(data.meeting.summary);
            } else {
                await generateSummary();
            }
        } else {
            console.error("Failed to fetch meeting");
            toast.error("No Meeting Summary Found.")
        }
        setLoading(false)
    };

    const generateSummary = async () => {
        setLoadings(true);
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/summary/generate-summary`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ meetingId: id }),
        });
        const data = await res.json();
        setLoadings(false);
        setLoading(false);
        if (data.success) {
            setSummary(data.summary);
        } else {
            console.error("Failed to generate summary");
            toast.error("Summary Generation Failed Please check if you have transcript generated or not.")
        }
    };

    useEffect(() => {
        fetchMeetingSummary();
    }, [id]);
    const handleAddToCalendar = async (summary) => {
        const accessToken = localStorage.getItem("calendar_token");
        if (!accessToken) {
            toast.error("Google Calendar access not available");
            return;
        }

        const event = {
            summary: summary?.topics?.[0] || "Meeting Summary",
            description: [
                ...(summary?.topics?.length ? ["📌 Topics:\n" + summary.topics.join("\n")] : []),
                ...(summary?.actions?.length ? ["📋 Actions:\n" + summary.actions.join("\n")] : []),
                ...(summary?.notes?.length ? ["📝 Notes:\n" + summary.notes.join("\n")] : [])
            ].join("\n\n"),
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 3600000).toISOString() } // 1 hour
        };

        try {
            const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(event)
            });

            const data = await res.json();
            if (data.id) {
                toast.success("📅 Event added to Google Calendar");
                navigate('/calendar')
            } else {
                throw new Error("No event ID returned");
            }
        } catch (err) {
            console.error("Calendar Add Error:", err);
            toast.error("Failed to add event to calendar");
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-4 py-8 md:px-10">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4 bg-white border p-4 rounded-xl shadow-sm">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-twinmind">📄 Summary - {title}</h1>
                    <p className="text-sm text-gray-500">Generated using AI</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={generateSummary}
                        className="bg-twinmind text-white px-4 py-2 rounded-md shadow hover:bg-orange-700 transition text-sm"
                    >
                        🔄 Regenerate
                    </button>

                    <button
                        onClick={() => handleAddToCalendar(summary)}
                        disabled={!summary}
                        className="bg-twinmind text-white px-4 py-2 rounded-md shadow hover:bg-orange-700 transition text-sm disabled:opacity-50"
                    >
                        📅 Add to Calendar
                    </button>

                    <button
                        onClick={() => navigate("/dashboard")}
                        className="text-sm text-twinmind font-semibold hover:underline"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>



            {loading ? (
                <div className="text-gray-600 text-sm flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-twinmind border-t-transparent rounded-full"></span>
                    Generating summary...
                </div>
            ) : summary ? (
                <div className="space-y-8">
                    {/* Topics Covered */}
                    <section className="bg-white p-6 rounded-xl shadow-md border">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">🔹 Topics Covered</h2>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm md:text-base">
                            {summary.topics?.length
                                ? summary.topics.map((t, i) => <li key={i}>{t}</li>)
                                : <li>No topics found.</li>}
                        </ul>
                    </section>

                    {/* Action Items */}
                    <section className="bg-white p-6 rounded-xl shadow-md border">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">🔸 Action Items</h2>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm md:text-base">
                            {summary.actions?.length
                                ? summary.actions.map((a, i) => <li key={i}>{a}</li>)
                                : <li>No action items found.</li>}
                        </ul>
                    </section>

                    {/* Final Notes */}
                    <section className="bg-white p-6 rounded-xl shadow-md border">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">📝 Final Notes</h2>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm md:text-base">
                            {summary.notes?.length
                                ? summary.notes.map((n, i) => <li key={i}>{n}</li>)
                                : <li>No final notes found.</li>}
                        </ul>
                    </section>
                </div>
            ) : (
                <p className="text-gray-600 text-sm mt-4">No summary available yet.</p>
            )}
        </div>
    );
}

export default SummaryView;
