import { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import twinLogo from "../assets/twin.svg"; // your brand logo
import { ChevronDown } from "lucide-react";
import { redirectIfLoggedIn } from "../utils/checkJwtExpiry";
import { GoogleAuthProvider } from "firebase/auth";

function Login() {
  const navigate = useNavigate();
  const [highlight, setHighlight] = useState("Memory Vault");
  const [showDropdown, setShowDropdown] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const buzzwords = [
    "Memory Vault",
    "AI Notetaker",
    "Second Brain",
    "Life Copilot",
    "Meeting Assistant",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setHighlight((prev) => {
        const index = buzzwords.indexOf(prev);
        return buzzwords[(index + 1) % buzzwords.length];
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    redirectIfLoggedIn(navigate)
  })

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const calendarAccessToken = credential.accessToken;
      console.log('calendarAccessToken: ', calendarAccessToken);
      localStorage.setItem("calendar_token", calendarAccessToken);

      const res = await fetch(`${API_BASE_URL}/auth/verify-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/dashboard");
      } else {
        toast.error("Authentication failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Login failed");
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50 to-orange-100 px-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-6 py-4">
        <img src={twinLogo} alt="TwinMind Logo" className="h-10" />

        <div className="relative">
          <button
            onClick={() => setShowDropdown((prev) => !prev)}
            className="flex items-center bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium px-5 py-2 rounded-full transition"
          >
            Download for Free <ChevronDown className="ml-2 w-4 h-4" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-md border z-50">
              <button
                onClick={() => window.open("https://apps.apple.com/us/app/twinmind-ai-second-brain/id6504585781?shortlink=33dpf7eg&c=TwinMind%20website%20navigation&pid=TwinMind%20website&af_xp=custom&source_caller=ui", "_blank")}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
              >
                <span role="img" aria-label="iphone" className="mr-2">🍎</span>
                Download for iPhone
              </button>
              <button
                onClick={() => window.open("https://chromewebstore.google.com/detail/twinmind/agpbjhhcmoanaljagpoheldgjhclepdj", "_blank")}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
              >
                <img src="https://www.google.com/chrome/static/images/favicons/favicon-32x32.png" className="w-5 h-5 mr-2" />
                Install Chrome Extension
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Centered Section */}
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="max-w-3xl text-center">
          <div className="text-sm text-gray-500 mb-2">✨ Your Smart Assistant</div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-2">
            Never Forget Anything with Your
          </h1>
          <div className="text-4xl sm:text-5xl font-extrabold text-twinmind transition-all duration-500 mb-6">
            {highlight}
          </div>

          <p className="text-gray-700 text-lg mb-8">
            Get <strong>perfect notes</strong> and <strong>answers before you ask</strong> — powered by AI.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={handleLogin}
              className="bg-twinmind text-white px-6 py-3 rounded-md text-lg hover:bg-orange-700 transition"
            >
              Sign in with Google
            </button>
            <button
              onClick={() =>
                window.open("https://www.youtube.com/watch?v=EPvCkJ2B0iA", "_blank")
              }
              className="border border-twinmind text-twinmind px-6 py-3 rounded-md text-lg hover:bg-twinmind hover:text-white transition"
            >
              ▶️ Watch Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
