import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { checkJwtAndRedirect } from "../utils/checkJwtExpiry";
import { deleteChunk, getAllChunks, saveAudioChunk } from "../utils/offlineStorage";
import { useLoader } from "../context/LoaderContext";
import { toast } from 'react-toastify';


function MeetingView() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState([]);
    const [title, setTitle] = useState(null);
    const [chat, setChat] = useState([]);
    const [questionInput, setQuestionInput] = useState("");
    const [suggestedQuestions, setSuggestedQuestions] = useState([]);
    const [autoQA, setAutoQA] = useState([]);
    const [openIndex, setOpenIndex] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const autoStart = queryParams.get("autostart") === "true";
    const navigate = useNavigate();
    const { id } = useParams();
    const streamRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const activeRecorderRef = useRef(null);
    const timerRef = useRef(null);
    const autoQAIntervalRef = useRef(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const { setLoading } = useLoader();
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;


    useEffect(() => {
        const updateOnlineStatus = () => setIsOffline(!navigator.onLine);

        window.addEventListener("online", updateOnlineStatus);
        window.addEventListener("offline", updateOnlineStatus);

        return () => {
            window.removeEventListener("online", updateOnlineStatus);
            window.removeEventListener("offline", updateOnlineStatus);
        };
    }, []);

    useEffect(() => {
        const hasStarted = sessionStorage.getItem(`hasStarted-${id}`);
        console.log('hasStarted: ', hasStarted);
        if (hasStarted === "true") {
            console.log("kill");
            setIsRecording(true);
        }
    }, [id]);

    useEffect(() => {
        const hasStarted = sessionStorage.getItem(`hasStarted-${id}`);
        console.log('hasStarted: ', hasStarted);
        if (autoStart && hasStarted !== "true") {
            console.log("called");
            sessionStorage.setItem(`hasStarted-${id}`, "true");
            setIsRecording(true);
            startRecording();
        }
    }, [autoStart, id]);

    useEffect(() => {
        checkJwtAndRedirect()
    }, []);


    useEffect(() => {
        const fetchChatHistory = async () => {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${API_BASE_URL}/transcript/chat-with-transcript/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success) {
                    setChat(data.chat);
                }
            } catch (err) {
                console.error("Failed to fetch chat history:", err);
                toast.error("No chat history.")
            }
        };

        fetchChatHistory();
    }, [id]);


    useEffect(() => {
        fetchTranscript();
    }, [id]);

    const fetchTranscript = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/meetings/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.meeting.transcript) {
                setTitle(data.meeting.title);
                setTranscript(data.meeting.transcript.split("\n"));
                setSuggestedQuestions(data.meeting.questions || []);
            }
        } catch (error) {
            console.error("Fetch Transcript error:", error);
        } finally {
            setLoading(false)
        }
    };

    const fetchAutoQA = async () => {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/meetings/${id}/auto-questions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setAutoQA(data.qa);
            } else {
                toast.error("No Transcript yet to generate Auto Questions.")
            }
        } catch (err) {
            console.error("Auto QA fetch error:", err);
        }
    };

    const sendChunkToBackend = async (blob) => {
        if (!navigator.onLine) {
            console.warn("🟡 Offline: Saving chunk to local DB");
            await saveAudioChunk(blob, id);
            return;
        }
        const token = localStorage.getItem("token");
        const file = new File([blob], `chunk-${Date.now()}.webm`, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", file);
        formData.append("meetingId", id);

        try {
            const res = await fetch(`${API_BASE_URL}/transcript/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            if (data.success && data.transcript) {
                setTranscript((prev) => [...prev, `📝 ${data.transcript}`]);
            }
        } catch (err) {
            console.warn("Offline: Saving chunk to local DB");
            await saveAudioChunk(blob, id);
        }
    };

    const startRecording = async () => {
        try {
            console.log("Started");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const recordNewChunk = () => {
                const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
                activeRecorderRef.current = recorder;

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        sendChunkToBackend(e.data);
                    }
                };

                recorder.start();
                setTimeout(() => {
                    if (recorder.state === "recording") recorder.stop();
                }, 30000);
            };

            recordNewChunk();
            recordingIntervalRef.current = setInterval(recordNewChunk, 30000);
            timerRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
            autoQAIntervalRef.current = setInterval(fetchAutoQA, 32000);

            setTranscript((prev) => [...prev, "🎤 Recording started..."]);
            setIsRecording(true);
        } catch (err) {
            console.error("Failed to access mic:", err);
        }
    };

    const stopRecording = () => {
        clearInterval(recordingIntervalRef.current);
        clearInterval(timerRef.current);
        clearInterval(autoQAIntervalRef.current);
        setElapsedTime(0);

        if (activeRecorderRef.current?.state === "recording") {
            activeRecorderRef.current.stop();
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        sessionStorage.removeItem(`hasStarted-${id}`);
        setTranscript((prev) => [...prev, "⏹️ Recording stopped."]);
    };

    const handleAskQuestion = async (question) => {
        const userMsg = { role: "user", text: question };
        const typingMsg = { role: "assistant", text: "..." };
        setChat((prev) => [...prev, userMsg, typingMsg]);
        setQuestionInput("");

        const token = localStorage.getItem("token");

        try {
            const res = await fetch(`${API_BASE_URL}/transcript/chat-with-transcript/stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ meetingId: id, question }),
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                fullText += chunk.replace(/^data: /gm, "").replace(/\n\n/g, "");
                setChat((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", text: fullText };
                    return updated;
                });
            }
        } catch (err) {
            console.error("Streaming error:", err);
            setChat((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", text: "⚠️ Failed to fetch response." };
                return updated;
            });
        }
    };



    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };


    const syncOfflineChunks = async () => {
        const token = localStorage.getItem("token");
        const chunks = await getAllChunks();

        for (const chunk of chunks) {
            const file = new File([chunk.blob], `offline-${chunk.id}.webm`, { type: "audio/webm" });
            const formData = new FormData();
            formData.append("audio", file);
            formData.append("meetingId", chunk.meetingId);

            try {
                const res = await fetch(`${API_BASE_URL}/transcript/upload`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
                const data = await res.json();
                if (data.success) {
                    await deleteChunk(chunk.id);
                    fetchTranscript()
                }
            } catch (err) {
                console.error("Retry failed for chunk ID:", chunk.id);
            }
        }
    };
    useEffect(() => {
        // Automatically try syncing when network is back
        window.addEventListener("online", syncOfflineChunks);

        return () => {
            window.removeEventListener("online", syncOfflineChunks);
        };
    }, []);


    return (
        <div className="p-6">
            {isOffline && (
                <div className="mb-4 bg-yellow-100 text-yellow-800 text-sm px-4 py-2 rounded-md border border-yellow-300 shadow">
                    🟡 You are offline. Changes will be saved locally and synced when you're back online.
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 w-full">
                {/* Back Button */}
                <div className="w-full sm:w-auto">
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="text-sm text-orange-600 hover:underline"
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                {/* Right Side: Title + Controls */}
                <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center justify-end gap-2 sm:gap-4">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-800 whitespace-nowrap">
                        Meeting: {title || "Untitled Meeting"}
                    </h1>

                    <div className="flex flex-wrap gap-2 sm:ml-4">
                        {!isRecording ? (
                            <button
                                onClick={startRecording}
                                className="bg-twinmind text-white px-5 py-2 rounded-md hover:bg-orange-700 transition"
                            >
                                🔴 Start Recording
                            </button>
                        ) : (
                            <button
                                onClick={stopRecording}
                                className="bg-red-600 text-white px-5 py-2 rounded-md hover:bg-red-700 transition"
                            >
                                ⏹️ Stop Recording
                            </button>
                        )}

                        {transcript.length > 0 && !isRecording && (
                            <button
                                onClick={() => navigate(`/summary/${id}`)}
                                className="border border-twinmind text-twinmind px-5 py-2 rounded-md hover:bg-twinmind hover:text-white transition"
                            >
                                🧠 Generate Summary
                            </button>
                        )}

                        {isRecording && (
                            <span className="text-sm text-gray-700 self-center sm:ml-2">
                                ⏱️ {formatTime(elapsedTime)}
                            </span>
                        )}
                    </div>
                </div>
            </div>


            <div className="bg-white grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                {/* Left: Transcript */}
                <div className="bg-gray-100 p-4 rounded-xl h-[80vh] overflow-y-scroll border shadow-sm">
                    <h2 className="text-xl font-bold mb-4">📝 Transcript - {title}</h2>
                    {transcript.map((line, idx) => {
                        const timeMatch = line.match(/^(\d{2}:\d{2})\s+(.*)$/);
                        const time = timeMatch ? timeMatch[1] : null;
                        const text = timeMatch ? timeMatch[2] : line;

                        return (
                            <div key={idx} className="mb-4">
                                {time && <div className="text-xs font-semibold text-gray-500 mb-1">{time}</div>}
                                {text && <p className="text-sm bg-white p-3 rounded-md shadow border text-gray-800 leading-relaxed whitespace-pre-line">
                                    {text}
                                </p>}
                            </div>
                        );
                    })}

                    <p className="text-xs text-gray-500 italic mt-4">
                        Transcript will be updated every 30 seconds during recording.
                    </p>
                </div>


                {/* Right: Chat Assistant */}
                <div className="bg-white border border-gray-200 rounded-xl h-[80vh] flex flex-col shadow-sm">
                    <div className="p-4 border-b bg-gray-50 rounded-t-xl">
                        <h2 className="text-xl font-semibold mb-2">💬 Chat with Transcript</h2>

                        {/* Auto Q&A dropdown section */}
                        <div className="space-y-3 mb-4">
                            {autoQA.map((qa, i) => (
                                <div key={i} className="border border-gray-200 rounded-lg shadow-sm">
                                    <button
                                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                        className="w-full text-left p-3 font-medium text-blue-800 hover:bg-blue-50 transition flex justify-between items-center"
                                    >
                                        <span>❓ {qa.question}</span>
                                        <span className="text-gray-400">{openIndex === i ? "▲" : "▼"}</span>
                                    </button>
                                    {openIndex === i && (
                                        <div className="px-4 pb-4 text-sm text-gray-700 bg-gray-50 rounded-b-lg">
                                            {qa.answer}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>


                        <div className="flex flex-wrap gap-2">
                            {suggestedQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAskQuestion(q)}
                                    className="text-xs md:text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chat.map((msg, i) => (
                            <div
                                key={i}
                                className={`text-sm ${msg.role === "user" ? "text-right text-blue-700" : "text-left text-gray-700"}`}
                            >
                                <p className="bg-gray-50 p-2 rounded-md border max-w-[90%] inline-block shadow-sm">
                                    {msg.text}
                                </p>
                            </div>
                        ))}
                    </div>


                    <div className="p-3 border-t bg-gray-50 rounded-b-xl flex gap-2">
                        <input
                            value={questionInput}
                            onChange={(e) => setQuestionInput(e.target.value)}
                            placeholder="Ask something..."
                            className="flex-1 px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            onKeyDown={(e) => e.key === "Enter" && handleAskQuestion(questionInput)}
                        />
                        <button
                            onClick={() => handleAskQuestion(questionInput)}
                            className="bg-twinmind text-white px-4 py-2 rounded-md text-sm hover:bg-orange-700 transition"
                        >
                            Ask
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MeetingView;
