import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Playlist from "@/models/Playlist";
import { NextResponse } from "next/server";
import { fetchPlaylistData, fetchVideoData, extractVideoId, extractPlaylistId } from "@/lib/utils/youtubeService";
import mongoose from "mongoose";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    // Ensure user ID exists
    if (!session.user.id) {
      console.error("Session user:", session.user);
      return NextResponse.json({ error: "User ID not found in session" }, { status: 400 });
    }
    
    let { url, playlistId, videoId } = await request.json();
    console.log("Received request:", { url, playlistId, videoId });

    if (url) {
      const p = extractPlaylistId(url);
      const v = extractVideoId(url);
      playlistId = playlistId || p || null;
      videoId = videoId || (!p && v ? v : null);
    }

    if (!playlistId && !videoId) {
      return NextResponse.json(
        { message: "Provide either a YouTube playlist or video URL/ID." },
        { status: 400 }
      );
    }

    // Convert session.user.id to ObjectId
    const userId = new mongoose.Types.ObjectId(session.user.id);

    let canonicalKey;
    let payload;

    if (playlistId) {
      canonicalKey = playlistId;
      const existing = await Playlist.findOne({
        user: userId,
        playlistId: canonicalKey,
      });
      if (existing) return NextResponse.json(existing);

      const data = await fetchPlaylistData(playlistId);
      payload = {
        user: userId,
        playlistId: data.playlistId,
        title: data.title,
        videos: data.videos,
        isSingleVideo: false,
        totalRuntime: data.totalRuntime || null,
      };
    } else {
      canonicalKey = videoId;
      const existing = await Playlist.findOne({
        user: userId,
        playlistId: canonicalKey,
      });
      if (existing) return NextResponse.json(existing);

      const videoInfo = await fetchVideoData(videoId);
      payload = {
        user: userId,
        playlistId: videoId,
        title: videoInfo.title,
        videos: [videoInfo],
        isSingleVideo: true,
        totalRuntime: videoInfo.duration || null,
      };
    }

    const created = await Playlist.create(payload);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create playlist error:", error);
    return NextResponse.json(
      { message: error.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const playlists = await Playlist.find({ user: session.user.id }).sort({
      createdAt: -1,
    });
    
    return NextResponse.json(playlists);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}
