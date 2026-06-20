export default function TopBanner() {
  return (
    <div
      className="w-full flex items-center justify-between px-8 rounded-2xl relative overflow-visible h-28 select-none"
      style={{
        backgroundColor: '#d6e8f7',
        border: '2.5px dashed rgb(30, 61, 89)',
      }}
    >
      {/* Left: Title */}
      <div className="z-10 py-4 flex flex-col justify-center">
        <h1
          className="text-2xl font-black tracking-wide leading-tight"
          style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: 'rgb(30, 61, 89)' }}
        >
          ACADEMIC MASTER |<br />
          LỘ TRÌNH GPA 4 NĂM
        </h1>
      </div>

      {/* Center/Right: Panda & Heart & Semester Badge Container */}
      <div className="relative flex items-end h-full z-10 flex-1 justify-end gap-16 pr-2 overflow-visible">
        
        {/* Panda Group (Panda + Heart) */}
        <div className="relative flex items-end h-full overflow-visible pb-[2px]">
          {/* Blue Heart floating next to Panda's left cheek */}
          <div className="absolute left-[-16px] bottom-[50px] animate-bounce z-20" style={{ animationDuration: '2.5s' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#7dc2ec" stroke="rgb(30, 61, 89)" strokeWidth="2.2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>

          {/* Panda SVG - refined lines, shadows and layout */}
          <svg width="150" height="110" viewBox="0 0 150 110" className="overflow-visible block transform translate-y-[4.5px]">
            {/* Feet */}
            <ellipse cx="50" cy="98" rx="14" ry="10" fill="rgb(30, 61, 89)" />
            <ellipse cx="100" cy="98" rx="14" ry="10" fill="rgb(30, 61, 89)" />
            
            {/* Body */}
            <ellipse cx="75" cy="85" rx="38" ry="24" fill="#ffffff" stroke="rgb(30, 61, 89)" strokeWidth="3" />
            
            {/* Black vest/shoulders */}
            <path d="M 40 75 Q 75 90 110 75 Q 112 85 105 92 Q 75 95 45 92 Z" fill="rgb(30, 61, 89)" />
            
            {/* Ears */}
            <circle cx="43" cy="27" r="14" fill="rgb(30, 61, 89)" stroke="rgb(30, 61, 89)" strokeWidth="2.5" />
            <circle cx="43" cy="27" r="6" fill="#ffffff" />
            
            <circle cx="107" cy="27" r="14" fill="rgb(30, 61, 89)" stroke="rgb(30, 61, 89)" strokeWidth="2.5" />
            <circle cx="107" cy="27" r="6" fill="#ffffff" />

            {/* Head */}
            <ellipse cx="75" cy="50" rx="38" ry="30" fill="#ffffff" stroke="rgb(30, 61, 89)" strokeWidth="3" />
            
            {/* Eye patches */}
            <ellipse cx="61" cy="48" rx="9" ry="12" fill="rgb(30, 61, 89)" transform="rotate(-15 61 48)" />
            <ellipse cx="89" cy="48" rx="9" ry="12" fill="rgb(30, 61, 89)" transform="rotate(15 89 48)" />
            
            {/* Eyes (happy curves) */}
            <path d="M 57 46 Q 61 41 65 46" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 85 46 Q 89 41 93 46" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

            {/* Rosy cheeks */}
            <ellipse cx="47" cy="59" rx="6" ry="4" fill="#ffb3ba" opacity="0.8" />
            <ellipse cx="103" cy="59" rx="6" ry="4" fill="#ffb3ba" opacity="0.8" />

            {/* Nose */}
            <ellipse cx="75" cy="52" rx="4" ry="2.5" fill="rgb(30, 61, 89)" />
            
            {/* Mouth (smiling open) */}
            <path d="M 70 57 Q 75 62 80 57" fill="none" stroke="rgb(30, 61, 89)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 71 58 Q 75 67 79 58 Z" fill="#ff6b6b" stroke="rgb(30, 61, 89)" strokeWidth="1.5" />

            {/* Left waving hand */}
            <path d="M 39 70 C 25 55 22 42 32 38 C 42 34 46 50 43 65 Z" fill="rgb(30, 61, 89)" stroke="rgb(30, 61, 89)" strokeWidth="2.5" />
            
            {/* Hand print details */}
            <ellipse cx="29" cy="45" rx="5" ry="6" fill="#ffffff" transform="rotate(-30 29 45)" />
            <circle cx="23" cy="40" r="1.5" fill="#ffffff" />
            <circle cx="28" cy="37" r="1.5" fill="#ffffff" />
            <circle cx="34" cy="40" r="1.5" fill="#ffffff" />

            {/* Right hand */}
            <path d="M 111 70 C 122 75 125 85 115 88 C 105 91 106 78 108 68 Z" fill="rgb(30, 61, 89)" />
          </svg>
        </div>

        {/* Semester Scallop Badge (Aligned with image) */}
        <div className="relative flex items-center justify-center w-28 h-28 overflow-visible pb-1 select-none">
          <svg className="absolute top-0 left-0 w-full h-full animate-spin" style={{ animationDuration: '80s' }} viewBox="0 0 100 100">
            <path
              d="M 50 2
                 C 54 2, 55 6, 59 7
                 C 63 8, 66 6, 69 9
                 C 72 12, 72 16, 75 20
                 C 78 24, 82 25, 83 29
                 C 84 33, 82 37, 85 41
                 C 88 45, 92 46, 92 50
                 C 92 54, 88 55, 85 59
                 C 82 63, 84 67, 83 71
                 C 82 75, 78 76, 75 80
                 C 72 84, 72 88, 69 91
                 C 66 94, 63 92, 59 93
                 C 55 94, 54 98, 50 98
                 C 46 98, 45 94, 41 93
                 C 37 92, 34 94, 31 91
                 C 28 88, 28 84, 25 80
                 C 22 76, 18 75, 17 71
                 C 16 67, 18 63, 15 59
                 C 12 55, 8 54, 8 50
                 C 8 46, 12 45, 15 41
                 C 18 37, 16 33, 17 29
                 C 18 25, 22 24, 25 20
                 C 28 16, 28 12, 31 9
                 C 34 6, 37 8, 41 7
                 C 45 6, 46 2, 50 2 Z"
              fill="#d6e8f7"
              stroke="rgb(30, 61, 89)"
              strokeWidth="2"
            />
          </svg>
          <div className="relative text-center z-10 px-2 flex flex-col items-center justify-center">
            <span className="block text-[11px] font-bold text-gray-600 leading-tight">Kỳ học hiện tại:</span>
            <span className="block text-base font-extrabold mt-1.5 leading-tight" style={{ fontFamily: "'Be Vietnam Pro', sans-serif", color: 'rgb(30, 61, 89)' }}>
              Năm 2<br />Kỳ 2
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
