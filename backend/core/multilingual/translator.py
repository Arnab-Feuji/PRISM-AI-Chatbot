"""PRISM — Multilingual Translator"""
from deep_translator import GoogleTranslator
from langdetect import detect as langdetect_detect
from typing import Optional

LANG_NAMES = {"en":"English","hi":"हिंदी","te":"తెలుగు","es":"Español","pa":"ਪੰਜਾਬੀ"}

UI_TRANSLATIONS = {
    "en": {"welcome":"Welcome to PRISM","ask_question":"Ask your health question…","send":"Send","clear":"Clear","subscribe":"Subscribe","diseases":"Disease Areas","agents":"Agents","logout":"Logout","settings":"Settings","feedback":"Feedback"},
    "hi": {"welcome":"PRISM में आपका स्वागत है","ask_question":"अपना स्वास्थ्य प्रश्न पूछें…","send":"भेजें","clear":"साफ़ करें","subscribe":"सदस्यता","diseases":"रोग क्षेत्र","agents":"एजेंट","logout":"लॉग आउट","settings":"सेटिंग्स","feedback":"प्रतिक्रिया"},
    "te": {"welcome":"PRISM కు స్వాగతం","ask_question":"మీ ఆరోగ్య ప్రశ్న అడగండి…","send":"పంపండి","clear":"క్లియర్","subscribe":"సభ్యత్వం","diseases":"వ్యాధి రంగాలు","agents":"ఏజెంట్లు","logout":"లాగ్అవుట్","settings":"సెట్టింగులు","feedback":"అభిప్రాయం"},
    "es": {"welcome":"Bienvenido a PRISM","ask_question":"Haz tu pregunta de salud…","send":"Enviar","clear":"Limpiar","subscribe":"Suscribirse","diseases":"Áreas de enfermedad","agents":"Agentes","logout":"Cerrar sesión","settings":"Configuración","feedback":"Comentarios"},
    "pa": {"welcome":"PRISM ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ","ask_question":"ਆਪਣਾ ਸਿਹਤ ਸਵਾਲ ਪੁੱਛੋ…","send":"ਭੇਜੋ","clear":"ਸਾਫ਼ ਕਰੋ","subscribe":"ਸਦੱਸਤਾ","diseases":"ਬਿਮਾਰੀ ਖੇਤਰ","agents":"ਏਜੰਟ","logout":"ਲਾਗਆਊਟ","settings":"ਸੈਟਿੰਗਜ਼","feedback":"ਫੀਡਬੈਕ"},
}

class PRISMTranslator:
    def translate(self, text: str, src: str = "auto", tgt: str = "en") -> str:
        if src == tgt or not text.strip():
            return text
        try:
            return GoogleTranslator(source=src, target=tgt).translate(text)
        except Exception:
            return text

    def detect(self, text: str) -> str:
        try:
            return langdetect_detect(text)
        except Exception:
            return "en"

    def get_ui(self, lang: str) -> dict:
        return UI_TRANSLATIONS.get(lang, UI_TRANSLATIONS["en"])
