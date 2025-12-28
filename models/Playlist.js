import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  duration: { type: String, default: "" },
});

const playlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    playlistId: { type: String, required: true },
    title: { type: String, required: true },
    videos: [videoSchema],
    isSingleVideo: { type: Boolean, default: false },
    totalRuntime: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Playlist || mongoose.model("Playlist", playlistSchema);
