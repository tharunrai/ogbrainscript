import sys
import json
import random
import time
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

# List of free proxies (for demonstration - in production, use a paid proxy service)
# Format: "http://user:pass@host:port" or "http://host:port"
PROXIES = [
    # Add your proxies here. 
    # Example:
    # "http://123.45.67.89:8080",
]

def get_proxy_dict(proxy_url):
    if not proxy_url:
        return None
    return {
        "http": proxy_url,
        "https": proxy_url,
    }

def fetch_transcript(video_id, languages=['en']):
    try:
        # Create instance and fetch
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id, languages=languages)
        # Convert to list of dicts for JSON serialization
        return [{"text": s.text, "start": s.start, "duration": s.duration} for s in transcript.snippets]
    except Exception as e:
        return {"error": f"Could not fetch transcript: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing video URL or ID"}))
        sys.exit(1)

    input_str = sys.argv[1]
    
    # Extract ID from URL if needed
    video_id = input_str
    if "youtube.com" in input_str or "youtu.be" in input_str:
        if "v=" in input_str:
            video_id = input_str.split("v=")[1].split("&")[0]
        else:
            # handle youtu.be/ID
            video_id = input_str.split("/")[-1].split("?")[0]

    langs = ['en']
    if len(sys.argv) > 2:
        langs = sys.argv[2].split(",")

    try:
        data = fetch_transcript(video_id, langs)
        
        if isinstance(data, list):
             print(json.dumps(data))
        else:
             print(json.dumps(data))
             
    except Exception as e:
        print(json.dumps({"error": str(e)}))
