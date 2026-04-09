import os
import re
import yt_dlp


def _sanitize_filename(name):
    """Remove characters that are problematic in file paths."""
    name = re.sub(r'[\\/*?:"<>|]', "", name)
    name = name.strip(". ")
    return name[:100] if name else "video"


def download_youtube_video(url, max_height=720):
    """
    Download a YouTube video using yt-dlp.

    Optimizations over the old pytubefix approach:
    - yt-dlp uses concurrent fragment downloads (N_CONNECTIONS)
    - Caps resolution to 720p by default (plenty for short-form vertical video)
    - Muxes audio+video with ffmpeg copy (no re-encode)
    - Retries automatically on transient failures
    """
    try:
        if not os.path.exists("videos"):
            os.makedirs("videos")

        # First pass: extract title for the output filename
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as probe:
            info = probe.extract_info(url, download=False)
            title = _sanitize_filename(info.get("title", "video"))

        output_path = os.path.join("videos", f"{title}.mp4")

        ydl_opts = {
            # Best video up to max_height + best audio, merged into mp4
            "format": f"bestvideo[height<={max_height}][ext=mp4]+bestaudio[ext=m4a]/"
                      f"bestvideo[height<={max_height}]+bestaudio/"
                      "best[height<=720]/"
                      "best",
            "outtmpl": output_path,
            "merge_output_format": "mp4",
            # Speed: concurrent fragment downloads
            "concurrent_fragment_downloads": 4,
            # Mux without re-encoding
            "postprocessor_args": {"merger": ["-c", "copy"]},
            "retries": 3,
            "fragment_retries": 5,
            "quiet": False,
            "no_warnings": True,
            "noprogress": False,
        }

        print(f"Downloading: {title}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if os.path.exists(output_path):
            print(f"Downloaded: {title} -> {output_path}")
            return output_path

        # yt-dlp may append a different extension during merge; find the actual file
        for ext in (".mp4", ".mkv", ".webm"):
            candidate = os.path.join("videos", f"{title}{ext}")
            if os.path.exists(candidate):
                print(f"Downloaded: {title} -> {candidate}")
                return candidate

        print("Download completed but output file not found")
        return None

    except Exception as e:
        print(f"Download error: {e}")
        return None


if __name__ == "__main__":
    youtube_url = input("Enter YouTube video URL: ")
    result = download_youtube_video(youtube_url)
    if result:
        print(f"Success: {result}")
    else:
        print("Download failed")
