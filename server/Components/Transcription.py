from faster_whisper import WhisperModel
import torch

# Singleton pattern for Whisper model to avoid reloading on every call
_whisper_model = None
_whisper_device = None

def get_whisper_model():
    """Get or create the singleton Whisper model instance."""
    global _whisper_model, _whisper_device
    
    if _whisper_model is None:
        _whisper_device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading Whisper model on device: {_whisper_device}")
        _whisper_model = WhisperModel("base.en", device=_whisper_device)
        print("Whisper model loaded and cached")
    
    return _whisper_model

def transcribeAudio(audio_path):
    try:
        print("Transcribing audio...")
        model = get_whisper_model()
        segments, info = model.transcribe(audio=audio_path, beam_size=5, language="en", max_new_tokens=128, condition_on_previous_text=False)
        print("Segments calculated")
        segments = list(segments)
        print(segments)
        extracted_texts = [[segment.text, segment.start, segment.end] for segment in segments]
        return extracted_texts
    except Exception as e:
        print("Transcription Error:", e)
        return []

def transcribeAudioWithWordTimestamps(audio_path):
    """
    Transcribe audio and return word-level timestamps for captions.
    Returns segments in the format expected by GenerateCaptions.
    """
    try:
        print("Transcribing audio with word timestamps...")
        model = get_whisper_model()
        segments, info = model.transcribe(
            audio=audio_path, 
            beam_size=5, 
            language="en", 
            max_new_tokens=128, 
            condition_on_previous_text=False,
            word_timestamps=True
        )
        print("Segments with word timestamps calculated")
        segments = list(segments)
        
        # Format for GenerateCaptions - needs word-level timestamps
        result = []
        for segment in segments:
            segment_data = {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "words": []
            }
            if segment.words:
                for word in segment.words:
                    segment_data["words"].append({
                        "word": " " + word.word,
                        "start": word.start,
                        "end": word.end
                    })
            result.append(segment_data)
        
        return result
    except Exception as e:
        print("Transcription with word timestamps Error:", e)
        return []

if __name__ == "__main__":
    audio_path = "audio.wav"
    transcriptions = transcribeAudio(audio_path)
    print("Done")
    TransText = ""

    for text, start, end in transcriptions:
        TransText += (f"{start} - {end}: {text}")
    print(TransText)