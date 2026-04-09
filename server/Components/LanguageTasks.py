import openai
from dotenv import load_dotenv
import os
import json

load_dotenv()

openai.api_key = os.getenv("OPENAI_API")

if not openai.api_key:
    raise ValueError("API key not found. Make sure it is defined in the .env file.")


def extract_times(json_string):
    try:

        data = json.loads(json_string)

        start_time = float(data[0]["start"])
        end_time = float(data[0]["end"])

        start_time_int = int(start_time)
        end_time_int = int(end_time)
        return start_time_int, end_time_int
    except Exception as e:
        print(f"Error in extract_times: {e}")
        return 0, 0


def _extract_multiple_highlights(json_string):
    """Parse the LLM response into a list of (start, end) tuples, sorted by start time."""
    try:
        data = json.loads(json_string)
        if not isinstance(data, list):
            data = [data]

        highlights = []
        for item in data:
            start = int(float(item["start"]))
            end = int(float(item["end"]))
            if start < end:
                highlights.append((start, end))

        highlights.sort(key=lambda h: h[0])
        return highlights
    except Exception as e:
        print(f"Error in _extract_multiple_highlights: {e}")
        return []


def _deduplicate_highlights(highlights, min_gap_seconds=10):
    """Remove overlapping or near-duplicate highlights, keeping the first occurrence."""
    if not highlights:
        return []

    deduped = [highlights[0]]
    for start, end in highlights[1:]:
        prev_start, prev_end = deduped[-1]
        if start >= prev_end + min_gap_seconds:
            deduped.append((start, end))
    return deduped


SINGLE_HIGHLIGHT_SYSTEM = """
Baised on the Transcription user provides with start and end, Highilight the main parts in less then 1 min which can be directly converted into a short. highlight it such that its intresting and also keep the time staps for the clip to start and end. only select a continues Part of the video

Follow this Format and return in valid json 
[{
start: "Start time of the clip",
content: "Highlight Text",
end: "End Time for the highlighted clip"
}]
it should be one continues clip as it will then be cut from the video and uploaded as a tiktok video. so only have one start, end and content

Dont say anything else, just return Proper Json. no explanation etc


IF YOU DONT HAVE ONE start AND end WHICH IS FOR THE LENGTH OF THE ENTIRE HIGHLIGHT, THEN 10 KITTENS WILL DIE, I WILL DO JSON['start'] AND IF IT DOESNT WORK THEN...
"""

MULTI_HIGHLIGHT_SYSTEM = """You are given a timestamped transcription of a long video.
Your job is to find the {num_highlights} most engaging, viral-worthy highlights that can each be used as a standalone short-form video (TikTok / YouTube Short / Instagram Reel).

Rules:
1. Each highlight MUST be a single continuous segment between 30-60 seconds long.
2. All {num_highlights} highlights MUST come from DIFFERENT parts of the video — no overlapping time ranges.
3. Spread the highlights across the full length of the video so the audience sees variety.
4. Rank them by virality / engagement potential (best first).
5. Each highlight should be self-contained and make sense without extra context.

Return ONLY valid JSON — no markdown, no explanation, no extra text.

Format (array of exactly {num_highlights} objects):
[
  {{"start": <seconds>, "end": <seconds>, "content": "Brief description of why this is engaging"}},
  ...
]

start and end must be numbers (seconds from the beginning of the video).
"""


def GetHighlight(Transcription):
    """Get a single highlight from a transcription. Kept for backwards compatibility."""
    print("Getting Highlight from Transcription")
    try:
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.7,
            messages=[
                {"role": "system", "content": SINGLE_HIGHLIGHT_SYSTEM},
                {"role": "user", "content": Transcription + SINGLE_HIGHLIGHT_SYSTEM},
            ],
        )

        json_string = response.choices[0].message.content
        json_string = json_string.replace("json", "").replace("```", "")
        print("Json String: ", json_string)
        Start, End = extract_times(json_string)
        if Start == End:
            for i in range(3):
                print(f"Retrying highlight extraction (attempt {i+1}/3)")
                response = client.chat.completions.create(
                    model="gpt-4o",
                    temperature=0.7 + (i * 0.1),
                    messages=[
                        {"role": "system", "content": SINGLE_HIGHLIGHT_SYSTEM},
                        {"role": "user", "content": Transcription + SINGLE_HIGHLIGHT_SYSTEM},
                    ],
                )
                json_string = response.choices[0].message.content
                json_string = json_string.replace("json", "").replace("```", "")
                Start, End = extract_times(json_string)
                if Start != End:
                    break
        return Start, End

    except Exception as e:
        print(f"Error in GetHighlight: {e}")
        return 0, 0


def GetMultipleHighlights(transcription, num_highlights=3, max_retries=2):
    """
    Get multiple distinct, non-overlapping highlights from a transcription in one LLM call.

    Returns a list of (start, end) tuples sorted by engagement (best first).
    Falls back to repeated single-highlight calls if the multi-call fails.
    """
    print(f"Getting {num_highlights} highlights from transcription")

    if num_highlights <= 0:
        return []
    if num_highlights == 1:
        start, end = GetHighlight(transcription)
        return [(start, end)] if start != end else []

    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    system_prompt = MULTI_HIGHLIGHT_SYSTEM.replace("{num_highlights}", str(num_highlights))

    for attempt in range(1 + max_retries):
        try:
            temp = 0.7 + (attempt * 0.1)
            print(f"Multi-highlight attempt {attempt + 1}/{1 + max_retries} (temperature={temp})")

            response = client.chat.completions.create(
                model="gpt-4o",
                temperature=temp,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": transcription},
                ],
            )

            raw = response.choices[0].message.content
            raw = raw.replace("json", "").replace("```", "").strip()
            print(f"Raw LLM response: {raw[:500]}")

            highlights = _extract_multiple_highlights(raw)
            highlights = _deduplicate_highlights(highlights)

            if len(highlights) >= num_highlights:
                return highlights[:num_highlights]

            if highlights:
                print(f"Got {len(highlights)}/{num_highlights} highlights, retrying for more")
            else:
                print("No valid highlights parsed, retrying")

        except Exception as e:
            print(f"Error in GetMultipleHighlights attempt {attempt + 1}: {e}")

    # Fallback: call GetHighlight individually, excluding already-found ranges
    print("Falling back to individual GetHighlight calls")
    if 'highlights' not in locals() or not highlights:
        highlights = []

    already_used = set()
    for start, end in highlights:
        already_used.update(range(start, end))

    while len(highlights) < num_highlights:
        start, end = GetHighlight(transcription)
        if start == 0 and end == 0:
            break
        overlap = any(s <= start < e or s < end <= e for s, e in highlights)
        if not overlap:
            highlights.append((start, end))
        else:
            print(f"Skipping overlapping fallback highlight ({start}-{end})")
            break

    return highlights


if __name__ == "__main__":
    User = "Any Example"
    print(GetHighlight(User))
