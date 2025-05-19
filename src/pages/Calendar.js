import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

function CalendarPage() {
    const [date, setDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const navigate = useNavigate();

    const fetchEvents = async (selectedDate) => {
        const accessToken = localStorage.getItem("calendar_token");
        if (!accessToken) return toast.error("Google Calendar access token missing");

        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);

        try {
            const res = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            const data = await res.json();
            if (data.items) {
                setEvents(data.items);
            } else {
                setEvents([]);
            }
        } catch (err) {
            console.error("Failed to fetch events:", err);
            toast.error("Failed to load events");
        }
    };

    useEffect(() => {
        fetchEvents(date);
    }, [date]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-orangetint px-4 py-8 md:px-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-twinmind">📅 Your Calendar</h1>
                    <p className="text-sm text-gray-500">Select a date to view your events</p>
                </div>
                <button
                    onClick={() => navigate("/dashboard")}
                    className="text-sm text-twinmind font-medium hover:underline"
                >
                    ← Back to Dashboard
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Calendar Panel */}
                <div className="bg-white shadow-md rounded-xl p-4 flex justify-center">
                    <Calendar
                        onChange={setDate}
                        value={date}
                        className="REACT-CALENDAR p-2"
                    />
                </div>

                {/* Events Panel */}
                <div className="bg-white shadow-md rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-3">
                        🗂️ Events on {date.toLocaleDateString()}
                    </h2>
                    <hr className="mb-4" />
                    {events.length === 0 ? (
                        <p className="text-gray-500 text-sm">No events found for this day.</p>
                    ) : (
                        <ul className="space-y-4">
                            {events.map((event) => (
                                <li key={event.id} className="p-4 border rounded-lg bg-orangetint">
                                    <h3 className="text-md font-semibold text-twinmind">{event.summary}</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        🕒 {event.start.dateTime
                                            ? new Date(event.start.dateTime).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })
                                            : 'All Day Event'}
                                    </p>
                                    {event.description && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            📝 {event.description}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CalendarPage;
