import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { useDeviceStore } from '../store/device';

const PREVIEW_LABELS = {
  tablet: 'Tablet preview',
  mobile: 'Mobile preview',
};

export default function DeviceSimulationBar({ className = '' }) {
  const { currentDevice, setDevice } = useDeviceStore();

  if (currentDevice === 'desktop') return null;

  const devices = [
    { id: 'desktop', icon: Monitor, label: 'Back to Desktop' },
    { id: 'tablet', icon: Tablet, label: 'Tablet' },
    { id: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 z-[200] ${className}`}
      role="toolbar"
      aria-label="Device preview controls"
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
        {PREVIEW_LABELS[currentDevice] || 'Device preview'}
      </span>

      {devices.map((device) => {
        const Icon = device.icon;
        const isActive = currentDevice === device.id;
        const isDesktop = device.id === 'desktop';

        return (
          <button
            key={device.id}
            type="button"
            onClick={() => setDevice(device.id)}
            title={device.label}
            className={`flex items-center gap-1.5 rounded-full text-xs font-semibold transition-all
              ${isActive
                ? 'bg-[#1565C0] text-white shadow-md px-3 py-1.5'
                : isDesktop
                  ? 'bg-white text-[#1565C0] border-2 border-[#1565C0] px-3 py-1.5 hover:bg-blue-50'
                  : 'bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 hover:border-[#1565C0]/50'
              }`}
          >
            <Icon size={14} />
            <span className={isDesktop && !isActive ? 'inline' : isDesktop ? 'inline' : 'hidden sm:inline'}>
              {device.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
