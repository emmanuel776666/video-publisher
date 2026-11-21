
import { useState, useEffect } from "react";

import {
  LayoutDashboard,
  Radio,
  Clapperboard,
  Video,
  Share2,
  Settings,
  Menu,
  X,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  WandSparkles,
  Download,
  RefreshCw,
} from "lucide-react";

import {
  getAutoSettings,
  updateAutoSettings,
  pauseAutoPublisher,
  generateManualVideo,
  getMyVideos,
} from "./services/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Auto Publisher", icon: Radio },
  { name: "Video Studio", icon: Clapperboard },
  { name: "My Videos", icon: Video },
  { name: "Social Accounts", icon: Share2 },
  { name: "Settings", icon: Settings },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Automatic publishing settings
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [topic, setTopic] = useState("Trending topics");
  const [duration, setDuration] = useState("30 seconds");

  // Manual Video Studio settings
  const [script, setScript] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoStyle, setVideoStyle] = useState("Cinematic");
  const [videoDuration, setVideoDuration] = useState("30 seconds");

  // Manual video generation status
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoMessage, setVideoMessage] = useState("");
  const [videoError, setVideoError] = useState("");
  const [generatedVideo, setGeneratedVideo] = useState(null);

  // Saved videos
  const [myVideos, setMyVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videosError, setVideosError] = useState("");

  // API status messages
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  // Load automatic publishing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingSettings(true);
        setSettingsError("");

        const data = await getAutoSettings();

        if (data.success && data.settings) {
          setAutoEnabled(data.settings.enabled);
          setTopic(data.settings.category);
          setDuration(`${data.settings.duration} seconds`);
        }
      } catch (error) {
        setSettingsError(error.message);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  // Load saved videos when opening My Videos
  useEffect(() => {
    if (activePage === "My Videos") {
      loadVideos();
    }
  }, [activePage]);

  const getVideoUrl = (video, type = "stream") => {
    const id = video?._id || video?.id;

    if (!id) return "";

    const route =
      type === "download"
        ? `/api/videos/${id}/download`
        : `/api/videos/${id}/stream`;

    return `${API_BASE_URL}${route}`;
  };

  const loadVideos = async () => {
    try {
      setLoadingVideos(true);
      setVideosError("");

      const data = await getMyVideos();

      setMyVideos(
        Array.isArray(data.videos)
          ? data.videos
          : Array.isArray(data)
            ? data
            : []
      );
    } catch (error) {
      setVideosError(error.message);
    } finally {
      setLoadingVideos(false);
    }
  };

  // Enable or pause automatic publishing
  const handleAutoToggle = async () => {
    try {
      setSavingSettings(true);
      setSettingsError("");
      setSettingsMessage("");

      if (autoEnabled) {
        const data = await pauseAutoPublisher();

        if (data.success) {
          setAutoEnabled(false);
          setSettingsMessage("Automatic publishing has been paused.");
        }
      } else {
        const data = await updateAutoSettings({ enabled: true });

        if (data.success) {
          setAutoEnabled(true);
          setSettingsMessage("Automatic publishing has been enabled.");
        }
      }
    } catch (error) {
      setSettingsError(error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Save automatic publishing preferences
  const handleSavePreferences = async () => {
    try {
      setSavingSettings(true);
      setSettingsError("");
      setSettingsMessage("");

      const selectedDuration = Number.parseInt(duration, 10);

      const data = await updateAutoSettings({
        category: topic,
        duration: selectedDuration,
      });

      if (data.success) {
        setSettingsMessage("Publishing preferences saved successfully.");
      }
    } catch (error) {
      setSettingsError(error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Generate a manual video
  const addVideo = async () => {
    if (!script.trim()) {
      setVideoError("Please enter your video script first.");
      return;
    }

    try {
      setGeneratingVideo(true);
      setVideoError("");
      setVideoMessage("Preparing your video. This may take several minutes.");
      setGeneratedVideo(null);

      const firstWords = script.trim().split(/\s+/).slice(0, 8).join(" ");

      const data = await generateManualVideo({
        mode: "manual",
        topic: videoTitle.trim() || firstWords,
        script: script.trim(),
        videoStyle,
        duration: Number.parseInt(videoDuration, 10),
      });

      if (!data.success) {
        throw new Error(data.message || "Video generation failed.");
      }

      const savedVideo = data.video || data.savedVideo || data;

      setGeneratedVideo(savedVideo);
      setVideoMessage("Your video has been generated and saved successfully.");

      // Refresh the saved video list
      try {
        const videosData = await getMyVideos();
        setMyVideos(
          Array.isArray(videosData.videos)
            ? videosData.videos
            : Array.isArray(videosData)
              ? videosData
              : []
        );
      } catch {
        // The generated video is still available in the preview.
      }
    } catch (error) {
      setVideoError(error.message);
      setVideoMessage("");
    } finally {
      setGeneratingVideo(false);
    }
  };

  const changePage = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
    setSettingsMessage("");
    setSettingsError("");
  };

  // Dashboard
  const renderDashboard = () => (
    <>
      <div className="mb-8">
        <p className="text-sm text-zinc-400 mb-2">
          Welcome to your workspace
        </p>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-2">
          Manage your automatic publishing and video creation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="rounded-2xl border border-white/10 bg-[#151520] p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="p-3 rounded-xl bg-purple-500/15 text-purple-400">
              <Radio size={23} />
            </div>
            <span className="text-xs text-zinc-400">AUTOMATIC WORKFLOW</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Auto Publisher</h2>
          <p className="text-sm text-zinc-400 leading-6 mb-6">
            Discover trending topics, generate videos with AI and publish them
            to your connected social accounts.
          </p>
          <button
            onClick={() => changePage("Auto Publisher")}
            className="flex items-center gap-2 text-purple-400 font-medium hover:text-purple-300"
          >
            Open Auto Publisher <ChevronRight size={17} />
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151520] p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400">
              <Clapperboard size={23} />
            </div>
            <span className="text-xs text-zinc-400">MANUAL WORKFLOW</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Video Studio</h2>
          <p className="text-sm text-zinc-400 leading-6 mb-6">
            Write your own script, choose a video style and create downloadable
            videos.
          </p>
          <button
            onClick={() => changePage("Video Studio")}
            className="flex items-center gap-2 text-blue-400 font-medium hover:text-blue-300"
          >
            Open Video Studio <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Publishing overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Videos created", value: String(myVideos.length), icon: Video },
          { label: "Published videos", value: "0", icon: CheckCircle2 },
          { label: "Connected accounts", value: "0 / 3", icon: Share2 },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-[#151520] border border-white/10 rounded-xl p-5"
          >
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-zinc-400">{item.label}</p>
              <item.icon size={19} className="text-zinc-500" />
            </div>
            <h3 className="text-2xl font-bold">{item.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-[#151520] border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold">Social media connections</h2>
          <button
            onClick={() => changePage("Social Accounts")}
            className="text-sm text-purple-400"
          >
            Manage accounts
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: "Facebook", icon: Share2 },
            { name: "YouTube", icon: Video },
            { name: "TikTok", icon: Clapperboard },
          ].map((social) => (
            <div
              key={social.name}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#20202c]"
            >
              <social.icon size={22} className="text-zinc-300" />
              <div>
                <p className="text-sm font-medium">{social.name}</p>
                <p className="text-xs text-yellow-400">Not connected</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // Automatic Publisher
  const renderAutoPublisher = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Auto Publisher</h1>
        <p className="text-zinc-400 mt-2">
          Let AI create and publish videos automatically.
        </p>
      </div>

      {settingsError && (
        <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {settingsError}
        </div>
      )}

      {settingsMessage && (
        <div className="mb-5 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          {settingsMessage}
        </div>
      )}

      {loadingSettings && (
        <p className="text-sm text-zinc-400 mb-5">
          Loading your saved settings...
        </p>
      )}

      <div className="bg-[#151520] border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-purple-400" size={21} />
              <h2 className="font-semibold text-lg">
                Automatic video publishing
              </h2>
            </div>
            <p className="text-sm text-zinc-400">
              Enable or pause your daily video publishing system.
            </p>
          </div>

          <button
            onClick={handleAutoToggle}
            disabled={savingSettings || loadingSettings}
            className={`px-5 py-3 rounded-xl text-sm font-semibold h-fit disabled:opacity-50 ${
              autoEnabled
                ? "bg-green-500/15 text-green-400"
                : "bg-purple-600 text-white"
            }`}
          >
            {savingSettings
              ? "Please wait..."
              : autoEnabled
                ? "Pause Auto Publisher"
                : "Enable Auto Publisher"}
          </button>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-[#20202c]">
          <p className="text-sm text-zinc-400">Current status</p>
          <p className="mt-1 font-medium">
            {autoEnabled ? "Enabled" : "Paused"}
          </p>
        </div>
      </div>

      <div className="bg-[#151520] border border-white/10 rounded-2xl p-6">
        <h2 className="font-semibold text-lg mb-6">
          Publishing preferences
        </h2>

        <div className="mb-6">
          <label className="block text-sm mb-2 text-zinc-300">
            Content discovery
          </label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-[#20202c] border border-white/10 rounded-xl p-3 outline-none"
          >
            <option>Trending topics</option>
            <option>Finance and business</option>
            <option>Technology and AI</option>
            <option>Stories and life lessons</option>
            <option>Science and discoveries</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm mb-2 text-zinc-300">
            Video duration
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full bg-[#20202c] border border-white/10 rounded-xl p-3 outline-none"
          >
            <option>20 seconds</option>
            <option>30 seconds</option>
          </select>
        </div>

        <button
          onClick={handleSavePreferences}
          disabled={savingSettings || loadingSettings}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl py-3 font-semibold"
        >
          {savingSettings ? "Saving..." : "Save Preferences"}
        </button>

        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <p className="text-sm text-purple-300">
            Planned publishing frequency: 1 video every day at 12:00 PM
            (Nigeria time).
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            The daily schedule is fixed. The automatic generation and social
            media publishing pipeline still needs to be completed and tested.
          </p>
        </div>
      </div>
    </>
  );

  // Manual Video Studio
  const renderVideoStudio = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Video Studio</h1>
        <p className="text-zinc-400 mt-2">
          Turn your script into a video you can download.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#151520] border border-white/10 rounded-2xl p-6">
          <label className="block font-medium mb-3">Video title</label>
          <input
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            placeholder="Give your video a title..."
            className="w-full bg-[#20202c] border border-white/10 rounded-xl p-4 mb-6 outline-none focus:border-purple-500"
          />

          <label className="block font-medium mb-3">Your video script</label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Paste or write your video script here..."
            rows={12}
            className="w-full resize-y bg-[#20202c] border border-white/10 rounded-xl p-4 outline-none focus:border-purple-500"
          />

          <div className="flex justify-between text-xs text-zinc-500 mt-2 gap-3">
            <span>
              {script.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            <span>Your script will guide the AI video generation.</span>
          </div>

          {videoError && (
            <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {videoError}
            </div>
          )}

          {videoMessage && (
            <div className="mt-5 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {videoMessage}
            </div>
          )}

          <button
            onClick={addVideo}
            disabled={generatingVideo}
            className="mt-6 w-full flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl py-4 font-semibold"
          >
            {generatingVideo ? (
              <>
                <RefreshCw size={19} className="animate-spin" />
                Generating video...
              </>
            ) : (
              <>
                <WandSparkles size={19} />
                Generate Video
              </>
            )}
          </button>

          {generatingVideo && (
            <p className="text-xs text-zinc-400 text-center mt-3">
              Keep this page open while the video is being generated.
            </p>
          )}
        </div>

        <div className="bg-[#151520] border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold mb-6">Video settings</h2>

          <label className="block text-sm text-zinc-300 mb-2">
            Video style
          </label>
          <select
            value={videoStyle}
            onChange={(e) => setVideoStyle(e.target.value)}
            className="w-full bg-[#20202c] border border-white/10 rounded-xl p-3 mb-6 outline-none"
          >
            <option>Cinematic</option>
            <option>Realistic</option>
            <option>Documentary</option>
            <option>Animated</option>
            <option>Social media</option>
          </select>

          <label className="block text-sm text-zinc-300 mb-2">
            Video duration
          </label>
          <select
            value={videoDuration}
            onChange={(e) => setVideoDuration(e.target.value)}
            className="w-full bg-[#20202c] border border-white/10 rounded-xl p-3 mb-6 outline-none"
          >
            <option>20 seconds</option>
            <option>30 seconds</option>
          </select>

          <div className="p-4 rounded-xl bg-[#20202c]">
            <p className="text-sm font-medium mb-2">Output format</p>
            <p className="text-xs text-zinc-400">
              MP4 video, vertical 9:16 format.
            </p>
          </div>
        </div>
      </div>

      {generatedVideo && (
        <div className="mt-6 bg-[#151520] border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold text-lg mb-4">
            Your generated video
          </h2>

          <video
            key={generatedVideo._id || generatedVideo.id}
            controls
            playsInline
            className="w-full max-w-md rounded-xl bg-black"
            src={getVideoUrl(generatedVideo)}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">
                {generatedVideo.title || videoTitle || "Generated video"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Saved to My Videos
              </p>
            </div>

            <a
              href={getVideoUrl(generatedVideo, "download")}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 rounded-xl px-5 py-3 text-sm font-semibold"
            >
              <Download size={17} />
              Download MP4
            </a>
          </div>
        </div>
      )}
    </>
  );

  // My Videos
  const renderMyVideos = () => (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Videos</h1>
          <p className="text-zinc-400 mt-2">
            Your manually generated and saved videos.
          </p>
        </div>

        <button
          onClick={loadVideos}
          disabled={loadingVideos}
          className="flex items-center gap-2 bg-[#20202c] border border-white/10 rounded-xl px-4 py-3 text-sm"
        >
          <RefreshCw size={16} className={loadingVideos ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {videosError && (
        <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {videosError}
        </div>
      )}

      {loadingVideos ? (
        <p className="text-zinc-400">Loading your saved videos...</p>
      ) : myVideos.length === 0 ? (
        <div className="bg-[#151520] border border-white/10 rounded-2xl p-12 text-center">
          <Video size={42} className="mx-auto text-zinc-600 mb-4" />
          <h2 className="font-semibold text-lg mb-2">
            No saved videos yet
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Videos you generate in Video Studio will appear here.
          </p>
          <button
            onClick={() => changePage("Video Studio")}
            className="bg-purple-600 rounded-xl px-5 py-3 text-sm font-semibold"
          >
            Create your first video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {myVideos.map((video) => (
            <div
              key={video._id}
              className="bg-[#151520] border border-white/10 rounded-2xl p-4"
            >
              <video
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-xl bg-black aspect-video"
                src={getVideoUrl(video)}
              />

              <h2 className="font-semibold mt-4">
                {video.title || "Untitled video"}
              </h2>

              <p className="text-xs text-zinc-400 mt-2">
                {video.duration} seconds · {video.videoStyle || "Cinematic"}
              </p>

              <a
                href={getVideoUrl(video, "download")}
                className="mt-4 w-full inline-flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-500 rounded-xl py-3 text-sm font-semibold"
              >
                <Download size={16} />
                Download video
              </a>
            </div>
          ))}
        </div>
      )}
    </>
  );

  // Social Accounts
  const renderSocialAccounts = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Social Accounts</h1>
        <p className="text-zinc-400 mt-2">
          Connect the accounts where your videos will be published.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { name: "Facebook", icon: Share2, color: "text-blue-400" },
          { name: "YouTube", icon: Video, color: "text-red-400" },
          { name: "TikTok", icon: Clapperboard, color: "text-white" },
        ].map((social) => (
          <div
            key={social.name}
            className="bg-[#151520] border border-white/10 rounded-2xl p-6"
          >
            <social.icon size={32} className={`${social.color} mb-5`} />
            <h2 className="font-semibold text-lg mb-2">{social.name}</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Connect your {social.name} account to publish videos.
            </p>
            <button
              disabled
              className="w-full rounded-xl bg-[#292936] text-zinc-500 py-3 text-sm"
            >
              Connect (coming soon)
            </button>
          </div>
        ))}
      </div>
    </>
  );

  // Application Settings
  const renderSettings = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-zinc-400 mt-2">
          Manage your application preferences.
        </p>
      </div>

      <div className="bg-[#151520] border border-white/10 rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Application information</h2>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-zinc-400">Application</span>
            <span>Video Publisher</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-400">Frontend</span>
            <span>React + Vite</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-400">Database</span>
            <span>MongoDB connected</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-400">AI services</span>
            <span>Not tested yet</span>
          </div>
        </div>
      </div>
    </>
  );

  const pageContent = {
    Dashboard: renderDashboard,
    "Auto Publisher": renderAutoPublisher,
    "Video Studio": renderVideoStudio,
    "My Videos": renderMyVideos,
    "Social Accounts": renderSocialAccounts,
    Settings: renderSettings,
  };

  return (
    <div className="min-h-screen bg-[#09090f] text-white">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-[#11111b] border-r border-white/10 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Video <span className="text-purple-400">Publisher</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              AI video workspace
            </p>
          </div>

          <button
            className="md:hidden text-zinc-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-4 flex-1">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-3">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const selected = activePage === item.name;

              return (
                <button
                  key={item.name}
                  onClick={() => changePage(item.name)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition ${
                    selected
                      ? "bg-purple-600/15 text-purple-400"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="bg-[#20202c] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={17} className="text-purple-400" />
              <p className="text-sm font-semibold">Getting started</p>
            </div>
            <p className="text-xs text-zinc-400 leading-5">
              Configure your publishing settings and connect your social
              accounts when their integrations are ready.
            </p>
          </div>
        </div>
      </aside>

      <div className="md:ml-64 min-h-screen">
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-5 md:px-8 sticky top-0 bg-[#09090f]/90 backdrop-blur-xl z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-zinc-300"
            >
              <Menu size={24} />
            </button>
            <p className="text-sm text-zinc-400">
              Workspace / <span className="text-white">{activePage}</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              Development mode
            </div>
            <div className="w-9 h-9 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-300 font-bold">
              VP
            </div>
          </div>
        </header>

        <main className="p-5 md:p-8 max-w-7xl mx-auto">
          {pageContent[activePage]()}
        </main>

        <footer className="px-8 py-6 border-t border-white/10 text-center text-xs text-zinc-600">
          Video Publisher · Development version
        </footer>
      </div>
    </div>
  );
}

export default App;
