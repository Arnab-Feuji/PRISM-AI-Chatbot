import { THEMES } from '../../store/theme';

export const GRADIENT_BRAND = 'linear-gradient(135deg, #1565C0 0%, #00897B 55%, #42A5F5 100%)';
export const GRADIENT_PAGE = 'linear-gradient(165deg, #E8F1FC 0%, #F4F7FB 38%, #E6F4F1 72%, #EEF2FA 100%)';
export const GRADIENT_PAGE_ADMIN = 'linear-gradient(165deg, #E3EAF6 0%, #EEF2FA 38%, #E8EFF8 72%, #EAEFF6 100%)';
export const GRADIENT_CARD_BORDER =
  'linear-gradient(135deg, rgba(21,101,192,0.35) 0%, rgba(0,137,123,0.25) 50%, rgba(66,165,245,0.2) 100%)';

export const THEME_PICKER_OPTIONS = [
  { id: THEMES.BLACK_PINK, name: 'WOW Factor', color: '#ec4899', swatchClass: 'bg-pink-500' },
  { id: THEMES.TITANIUM_GOLD, name: 'Titanium & Gold', color: '#D4AF37', swatchClass: 'bg-[#D4AF37]' },
  { id: THEMES.NEURAL_GLASS, name: 'Natural Glass', color: '#22D3EE', swatchClass: 'bg-cyan-400' },
  { id: THEMES.MATERIAL_PATIENT, name: 'Material UI', color: '#1565C0', swatchClass: 'bg-[#1565C0]' },
];

export const LATAM_COUNTRIES = [
  { code: 'MX', label: 'Mexico 🇲🇽' },
  { code: 'BR', label: 'Brazil 🇧🇷' },
  { code: 'AR', label: 'Argentina 🇦🇷' },
  { code: 'CO', label: 'Colombia 🇨🇴' },
  { code: 'CL', label: 'Chile 🇨🇱' },
  { code: 'PE', label: 'Peru 🇵🇪' },
  { code: 'BO', label: 'Bolivia 🇧🇴' },
  { code: 'UY', label: 'Uruguay 🇺🇾' },
  { code: 'VE', label: 'Venezuela 🇻🇪' },
  { code: 'EC', label: 'Ecuador 🇪🇨' },
  { code: 'CR', label: 'Costa Rica 🇨🇷' },
  { code: 'GT', label: 'Guatemala 🇬🇹' },
  { code: 'PA', label: 'Panama 🇵🇦' },
  { code: 'DO', label: 'Dominican Republic 🇩🇴' },
  { code: 'US', label: 'USA 🇺🇸' },
];

export const DEVICE_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};
