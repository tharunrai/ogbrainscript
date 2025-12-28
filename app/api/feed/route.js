import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Playlist from "@/models/Playlist";

// Mulberry32 seeded RNG
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle using provided rng
const shuffleWithRng = (arr, rng) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Helper to parse "HH:MM:SS" or "MM:SS" into seconds
function parseDuration(duration) {
  if (!duration || typeof duration !== "string") return 0;
  const parts = duration
    .split(":")
    .map(Number)
    .filter((n) => !isNaN(n));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "random";
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "50", 10));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));
    const seed = searchParams.get("seed") || "";

    await connectDB();

    // determine seed number
    let seedNum;
    if (seed && String(seed).trim()) {
      seedNum = Number(String(seed).slice(0, 12)) || 1;
    } else {
      seedNum = Date.now() & 0xffffffff;
    }
    const rng = mulberry32(seedNum);

    // Fetch playlists from all users that have at least one video
    const playlists = await Playlist.find({ "videos.0": { $exists: true } })
      .select("title videos isSingleVideo createdAt user")
      .populate("user", "name picture")
      .lean();

    if (!playlists || playlists.length === 0) {
      return NextResponse.json({
        success: true,
        videos: [],
        total: 0,
        hasMore: false,
        currentPage: 1,
        totalPages: 0,
        seed: seedNum,
      });
    }

    // Build mixed entries
    const allItems = [];

    playlists.forEach((playlist) => {
      const uploader = playlist.user || {};
      const uploaderIdStr = String(uploader._id || "");
      const uploaderName = uploader.name || "Unknown";
      const uploaderAvatar = uploader.picture || null;
      const pVideos = playlist.videos || [];

      // 1. Add the Playlist itself as an item (if it has videos)
      if (pVideos.length > 0 && !playlist.isSingleVideo) {
        // Find a valid thumbnail from the first valid video
        const firstValid = pVideos.find(
          (v) => v && v.videoId && v.videoId.length === 11
        );
        const thumb = firstValid
          ? firstValid.thumbnailUrl ||
            `https://img.youtube.com/vi/${firstValid.videoId}/hqdefault.jpg`
          : "https://via.placeholder.com/320x180?text=Playlist";

        allItems.push({
          type: "playlist",
          playlistId: playlist._id,
          title: playlist.title,
          videoCount: pVideos.length,
          thumbnailUrl: thumb,
          uploaderId: uploaderIdStr,
          uploaderName,
          uploaderAvatar,
          addedAt: playlist.createdAt,
          playlistTitle: playlist.title,
        });
      }

      // 2. Add individual videos
      pVideos.forEach((video) => {
        if (
          video &&
          video.videoId &&
          video.title &&
          !/^private video$/i.test(video.title) &&
          !/^deleted video$/i.test(video.title) &&
          video.videoId.length === 11
        ) {
          allItems.push({
            type: "video",
            videoId: video.videoId,
            title: video.title,
            duration: video.duration || null,
            playlistTitle: playlist.title || "",
            playlistId: playlist._id,
            isSingleVideo: !!playlist.isSingleVideo,
            addedAt: playlist.createdAt,
            thumbnailUrl:
              video.thumbnailUrl ||
              `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
            uploaderId: uploaderIdStr,
            uploaderName,
            uploaderAvatar,
          });
        }
      });
    });

    // Filter
    let filteredItems = allItems;
    if (search && search.trim()) {
      const s = search.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.title.toLowerCase().includes(s) ||
          (item.playlistTitle || "").toLowerCase().includes(s) ||
          (item.uploaderName || "").toLowerCase().includes(s)
      );
    }

    // Sorting
    const applySort = (arr, sortKey) => {
      if (sortKey === "random") return shuffleWithRng(arr, rng);
      if (sortKey === "title")
        return arr.sort((a, b) => a.title.localeCompare(b.title));
      if (sortKey === "duration")
        return arr.sort(
          (a, b) => parseDuration(b.duration) - parseDuration(a.duration)
        );
      if (sortKey === "playlist")
        return arr.sort((a, b) =>
          (a.playlistTitle || "").localeCompare(b.playlistTitle || "")
        );
      return arr.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    };

    const sortedItems = applySort(filteredItems.slice(), sort);

    // Lightweight neighbor swaps for variety
    const swaps = Math.max(0, Math.floor(sortedItems.length * 0.02));
    for (let s = 0; s < swaps; s++) {
      const i = Math.floor(rng() * sortedItems.length);
      const j = Math.floor(rng() * sortedItems.length);
      [sortedItems[i], sortedItems[j]] = [sortedItems[j], sortedItems[i]];
    }

    // Pagination
    const total = sortedItems.length;
    const paginated = sortedItems.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return NextResponse.json({
      success: true,
      videos: paginated,
      total,
      hasMore,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
      seed: seedNum,
    });
  } catch (error) {
    console.error("Feed fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch feed data" },
      { status: 500 }
    );
  }
}
