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
    # 1. Try without proxy first
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Try to find manually created transcript
        try:
            transcript = transcript_list.find_manually_created_transcript(languages)
        except NoTranscriptFound:
            # Fallback to generated
            try:
                transcript = transcript_list.find_generated_transcript(languages)
            except NoTranscriptFound:
                 # If specific lang not found, get any english or the first available and translate
                 # For now, just getting the first available
                 transcript = transcript_list.find_transcript(languages)

        return transcript.fetch()

    except (TranscriptsDisabled, NoTranscriptFound) as e:
        # Fatal errors that proxy won't fix
        return {"error": str(e)}
    except Exception as e:
        # If rate limited or connection error, try proxies
        print(f"Direct fetch failed: {e}, trying proxies...", file=sys.stderr)
        pass

    # 2. Try with proxies
    # Shuffle proxies to distribute load
    random.shuffle(PROXIES)
    
    for proxy in PROXIES:
        try:
            proxies_dict = get_proxy_dict(proxy)
            
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id, proxies=proxies_dict)
            
            try:
                transcript = transcript_list.find_manually_created_transcript(languages)
            except NoTranscriptFound:
                transcript = transcript_list.find_generated_transcript(languages)
            
            return transcript.fetch()
            
        except Exception as e:
            continue

    return {"error": "Could not fetch transcript (all attempts failed)."}

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
