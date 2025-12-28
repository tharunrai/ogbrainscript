import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Playlist from "@/models/Playlist";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await params;
    
    const playlist = await Playlist.findById(id);
    
    if (!playlist) {
      return NextResponse.json({ message: "Playlist not found" }, { status: 404 });
    }
    
    return NextResponse.json(playlist);
  } catch (error) {
    console.error("Get playlist error:", error);
    return NextResponse.json(
      { message: "Failed to fetch playlist" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await params;
    const userId = new mongoose.Types.ObjectId(session.user.id);
    
    const deleted = await Playlist.findOneAndDelete({
      _id: id,
      user: userId,
    });
    
    if (!deleted) {
      return NextResponse.json({ message: "Playlist not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Playlist deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to delete playlist" },
      { status: 500 }
    );
  }
}
