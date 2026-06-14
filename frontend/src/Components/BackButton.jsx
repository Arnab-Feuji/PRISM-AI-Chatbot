import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ fallbackPath = '/', className = '', style, iconSize = 20, label }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallbackPath);
  };

  const defaultClassName =
    'flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all';

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back"
      className={className || (style ? undefined : defaultClassName)}
      style={style}
    >
      <ArrowLeft size={iconSize} />
      {label && <span className="ml-1 text-xs font-semibold">{label}</span>}
    </button>
  );
}
