"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Playlist() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [formError, setFormError] = useState("");
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }
    if (status === "authenticated") {
      fetchMyPlaylists();
    }
  }, [status, router]);

  const fetchMyPlaylists = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/playlists");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch playlists");
      setPlaylists(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm("Are you sure you want to remove this playlist?"))
      return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove playlist");
      }
      setPlaylists((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id) => {
    router.push(`/player/${id}`);
  };

  const extractIds = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === "youtu.be" && urlObj.pathname.length > 1) {
        return { videoId: urlObj.pathname.slice(1) };
      } else if (["www.youtube.com", "youtube.com"].includes(urlObj.hostname)) {
        const v = urlObj.searchParams.get("v");
        const list = urlObj.searchParams.get("list");
        if (list && v) return { videoId: v, playlistId: list };
        if (list) return { playlistId: list };
        if (v) return { videoId: v };
      }
      return {};
    } catch {
      return {};
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError("");
    const { videoId, playlistId } = extractIds(input);

    if (!videoId && !playlistId) {
      setFormError("Please enter a valid YouTube video or playlist link.");
      return;
    }

    setError("");
    setLoading(true);

    const body = { videoId, playlistId };

    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const newPlaylist = await res.json();
      if (!res.ok)
        throw new Error(newPlaylist.message || "Failed to add playlist/video");
      setPlaylists((prev) => [...prev, newPlaylist]);
      setInput("");
      // Navigate to the player page
      router.push(`/player/${newPlaylist._id}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-center text-indigo-500 animate-pulse text-lg">
          Checking login...
        </p>
      </div>
    );
  }

  const getThumbnailUrl = (playlist) => {
    // Single video entries: actual video lives in videos[0]
    if (playlist.isSingleVideo && playlist.videos?.[0]?.videoId) {
      return `https://img.youtube.com/vi/${playlist.videos[0].videoId}/hqdefault.jpg`;
    }

    // Playlist: use first item's thumbnail
    if (!playlist.isSingleVideo && playlist.videos?.length > 0) {
      return `https://img.youtube.com/vi/${playlist.videos[0].videoId}/hqdefault.jpg`;
    }

    return "https://via.placeholder.com/320x180?text=No+Image";
  };

  const getDisplayInfo = (playlist) => {
    if (playlist.isSingleVideo) {
      const v = playlist.videos?.[0];
      return {
        duration: v?.duration || null,
        isPlaylist: false,
      };
    }

    if (!playlist.isSingleVideo && playlist.videos?.length > 0) {
      return {
        duration: playlist.totalRuntime || "0m",
        isPlaylist: true,
        count: playlist.videos.length,
      };
    }

    return { duration: null, isPlaylist: false };
  };

  return (
    <div className=" bg-white">

    <div className="max-w-7xl mx-auto p-4 bg-white min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-center text-indigo-700">
        Your Playlists & Videos
      </h2>

      {/* Add Playlist Form */}
      <form
        onSubmit={handleAdd}
        className="mb-6 flex flex-col sm:flex-row justify-center items-start sm:items-end gap-3"
      >
        <div className="w-full sm:w-2/3 lg:w-1/2">
          <label className="block text-black mb-2 font-semibold text-center sm:text-left">
            Add YouTube Video or Playlist Link
          </label>
          <input
            type="text"
            placeholder="Paste YouTube video or playlist URL"
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            required
          />
          {formError && (
            <p className="text-red-500 mt-1 text-center sm:text-left">{formError}</p>
          )}
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 self-center sm:self-auto"
          disabled={loading}
        >
          Add
        </button>
      </form>

      {loading && (
        <p className="text-center text-indigo-500 animate-pulse">Loading...</p>
      )}
      {error && (
        <p className="text-center text-red-600 font-semibold">{error}</p>
      )}

      {!loading && !error && playlists.length === 0 && (
        <p className="text-gray-500 italic text-center mt-10">
          No playlists or videos added yet.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mt-8">
        {playlists.map((playlist) => {
          const key = playlist._id || playlist.videoId;
          const navigateId = playlist._id || playlist.videoId;
          const thumbnail = getThumbnailUrl(playlist);
          const title = playlist.title || "Untitled";
          const displayInfo = getDisplayInfo(playlist);

          return (
            <div
              key={key}
              className="bg-white rounded-lg shadow-md p-4 cursor-pointer relative transform transition duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div onClick={() => handleSelect(navigateId)}>
                <div className="relative group">
                  <div className="relative">
                    <img
                      src={thumbnail}
                      alt={title}
                      className="w-full h-44 object-cover rounded-md mb-3 shadow-sm"
                      onError={(e) => {
                        if (e.currentTarget.src.includes("hqdefault")) {
                          e.currentTarget.src = e.currentTarget.src.replace(
                            "hqdefault",
                            "mqdefault"
                          );
                        } else if (e.currentTarget.src.includes("mqdefault")) {
                          e.currentTarget.src =
                            "https://via.placeholder.com/320x180?text=No+Image";
                        }
                      }}
                    />

                    {/* Duration overlay (single videos only) */}
                    {displayInfo.duration && !displayInfo.isPlaylist && (
                      <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 text-gray-800 text-xs font-semibold px-2 py-1 rounded shadow-sm">
                        {displayInfo.duration}
                      </div>
                    )}

                    {/* Playlist badge (count) */}
                    {displayInfo.isPlaylist && displayInfo.count > 0 && (
                      <div className="absolute top-2 right-2 bg-white bg-opacity-90 text-gray-800 text-xs font-semibold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        {displayInfo.count}
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    className="text-base font-semibold text-gray-800 truncate"
                    title={title}
                  >
                    {title}
                  </h3>

                  {/* Playlist extra info */}
                  {displayInfo.isPlaylist && (
                    <p className="text-xs text-gray-500 mt-1">
                      {displayInfo.count || 0} videos • {displayInfo.duration || "0m"} total
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemove(key)}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg font-bold shadow-md"
                aria-label="Remove playlist"
                title="Remove playlist"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </div>
    
    </div>
  );
}
