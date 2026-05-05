"""PRISM — Multimodal Processor: Image OCR + Audio Whisper"""
import io, base64, os, tempfile
from typing import Optional, Dict
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
from config.settings import get_settings

settings = get_settings()

class PRISMImageProcessor:
    """Extract and classify text from prescription/lab/radiology images."""

    def process(self, image_bytes: bytes, language: str = "en") -> Dict:
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            # Enhance for OCR
            img = ImageEnhance.Contrast(img).enhance(2.0)
            img = img.filter(ImageFilter.SHARPEN)
            # Tesseract lang map
            lang_map = {"en":"eng","hi":"hin","te":"tel","es":"spa","pa":"pan"}
            tess_lang = lang_map.get(language, "eng")
            text = pytesseract.image_to_string(img, lang=tess_lang)
            doc_type = self._classify(text)
            return {"text": text.strip(), "doc_type": doc_type, "success": True}
        except Exception as e:
            return {"text": "", "doc_type": "unknown", "success": False, "error": str(e)}

    def _classify(self, text: str) -> str:
        tl = text.lower()
        if any(w in tl for w in ["rx","prescription","sig","refill","dispense","tablet","capsule","mg"]): return "prescription"
        if any(w in tl for w in ["glucose","hba1c","cholesterol","creatinine","lab","report","result"]): return "lab_report"
        if any(w in tl for w in ["x-ray","mri","ct","scan","impression","findings","radiology"]): return "radiology"
        return "general_medical"


class PRISMAudioProcessor:
    """Transcribe patient audio using OpenAI Whisper."""

    def __init__(self):
        self._model = None

    def _get_model(self):
        if self._model is None:
            import whisper
            self._model = whisper.load_model(settings.whisper_model)
        return self._model

    def process(self, audio_bytes: bytes, language: str = "en") -> Dict:
        try:
            model = self._get_model()
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(audio_bytes); tmp = f.name
            result = model.transcribe(tmp, language=language if language != "en" else None)
            os.unlink(tmp)
            return {"text": result["text"].strip(), "language": result.get("language","en"), "success": True}
        except Exception as e:
            return {"text": "", "language": language, "success": False, "error": str(e)}


class PRISMMultimodalProcessor:
    def __init__(self):
        self.image = PRISMImageProcessor()
        self.audio = PRISMAudioProcessor()

    def process(self, data_bytes: bytes, media_type: str, language: str = "en") -> Dict:
        if media_type.startswith("image/"):
            result = self.image.process(data_bytes, language)
            result["media_type"] = "image"
        elif media_type.startswith("audio/"):
            result = self.audio.process(data_bytes, language)
            result["media_type"] = "audio"
        else:
            result = {"text": "", "media_type": "unknown", "success": False}
        result["base64"] = base64.b64encode(data_bytes).decode() if len(data_bytes) < 5_000_000 else ""
        return result
