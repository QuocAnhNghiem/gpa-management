import { DASHBOARD_STICKERS } from '../../constants/dashboardStickers';

export default function BrandLogo({
  size = 44,
  showText = true,
  textClassName = '',
  logoClassName = '',
  titleStyle = {},
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`overflow-hidden rounded-full flex items-center justify-center shrink-0 ${logoClassName}`}
        style={{ width: size, height: size }}
      >
        <img
          src={DASHBOARD_STICKERS.logo}
          alt="GPA Master"
          className="w-full h-full object-contain select-none pointer-events-none"
          style={{ transform: 'scale(1.3)' }}
        />
      </div>
      {showText && (
        <div
          className={`whitespace-nowrap overflow-hidden text-center ${textClassName}`}
          style={{ ...titleStyle }}
        >
          <span
            className="font-extrabold tracking-tight"
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: '#1e293b' }}
          >
            GPA{' '}
          </span>
          <span
            className="font-extrabold tracking-tight"
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: '#7c5ce0' }}
          >
            Master
          </span>
        </div>
      )}
    </div>
  );
}
