import os
import openai
import json
from typing import List, Dict, Any, Tuple

def translate_text(text: str, source_language: str = "English", target_language: str = "Hindi") -> str:
    """
    Translate text from source language to target language using OpenAI
    
    Args:
        text: The text to translate
        source_language: The source language (default: English)
        target_language: The target language (default: Hindi)
        
    Returns:
        Translated text
    """
    try:
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        system_prompt = f"You are a professional translator. Translate the following text from {source_language} to {target_language}. Maintain the original meaning, tone, and style as closely as possible."
        
        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.3,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
        )
        
        translated_text = response.choices[0].message.content
        return translated_text.strip()
        
    except Exception as e:
        print(f"Error in translation: {e}")
        return ""

def translate_transcript_with_timestamps(transcript: List[Tuple[str, float, float]], 
                                        source_language: str = "English", 
                                        target_language: str = "Hindi") -> List[Tuple[str, float, float]]:
    """
    Translate a transcript (list of text with timestamps) while preserving the timing
    
    Args:
        transcript: List of tuples (text, start_time, end_time)
        source_language: The source language (default: English)
        target_language: The target language (default: Hindi)
        
    Returns:
        List of tuples (translated_text, start_time, end_time)
    """
    try:
        # Extract text from transcript, keeping the timestamps separate
        texts = [item[0] for item in transcript]
        timestamps = [(item[1], item[2]) for item in transcript]
        
        # Combine texts for efficient batch translation
        combined_text = "\n---\n".join([f"{i+1}. {text}" for i, text in enumerate(texts)])
        
        # Translate the combined text
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        system_prompt = f"""You are a professional translator. Translate the following numbered statements from {source_language} to {target_language}. 
        Maintain the original meaning, tone, and style as closely as possible.
        Keep the numbering format (1., 2., etc.) at the beginning of each translated statement.
        Respond with ONLY the translated text, keeping the '---' separators.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.3,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": combined_text},
            ],
        )
        
        # Parse the translated text back into individual segments
        translated_combined = response.choices[0].message.content
        translated_segments = translated_combined.split("\n---\n")
        
        # Clean up numbering pattern and extra spaces
        cleaned_segments = []
        for segment in translated_segments:
            # Remove numbering (e.g., "1. ")
            cleaned = segment.strip()
            if cleaned and cleaned[0].isdigit() and ". " in cleaned[:5]:
                cleaned = cleaned.split(". ", 1)[1]
            cleaned_segments.append(cleaned)
        
        # Combine translated texts with original timestamps
        result = []
        for i, (start, end) in enumerate(timestamps):
            if i < len(cleaned_segments):
                result.append((cleaned_segments[i], start, end))
        
        return result
        
    except Exception as e:
        print(f"Error in transcript translation: {e}")
        return transcript  # Return original transcript if translation fails 