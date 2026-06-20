import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarCheck,
  CaretDown,
  ChartLineUp,
  CheckCircle,
  Lightning,
  NotePencil,
  Play,
  SealCheck,
  Sparkle,
  Star,
  Trophy,
} from '@phosphor-icons/react';
import BrandLogo from '../components/ui/BrandLogo';

const navItems = ['Tính năng', 'Cách hoạt động', 'Bảng giá', 'Blog'];

const stats = [
  { label: 'GPA hiện tại', value: '3.72', detail: '/4.00', tone: 'violet', icon: ChartLineUp },
  { label: 'Tín chỉ', value: '87', detail: '/120', tone: 'peach', icon: BookOpen },
  { label: 'Môn học', value: '6', detail: 'kỳ này', tone: 'mint', icon: NotePencil },
  { label: 'Xếp hạng', value: 'Top 18%', detail: '+5% kỳ này', tone: 'rose', icon: Trophy },
];

const courses = [
  { name: 'Data Structures', code: 'CS 201', grade: 'A', progress: 86, color: '#45c48a' },
  { name: 'Calculus II', code: 'MATH 122', grade: 'A-', progress: 74, color: '#50c79f' },
  { name: 'English Literature', code: 'ENG 210', grade: 'B+', progress: 58, color: '#f4bd4f' },
  { name: 'Physics I', code: 'PHY 101', grade: 'B', progress: 49, color: '#f5c14d' },
];

const assignments = ['Calculus II — Problem set 6', 'Data Structures — Project', 'English Literature — Essay'];

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function LandingPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#fbf7ff] text-[#141936]">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-80">
        <div className="absolute -left-32 top-28 h-96 w-96 rounded-full bg-[#d8cbff]/55 blur-3xl" />
        <div className="absolute left-[36%] -top-28 h-[34rem] w-[34rem] rounded-full bg-[#ffe2b7]/50 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[34rem] w-[34rem] rounded-full bg-[#b7eeff]/45 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.92),transparent_24rem),radial-gradient(circle_at_82%_64%,rgba(255,255,255,0.8),transparent_22rem)]" />
      </div>

      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.18] [background-image:linear-gradient(rgba(123,92,246,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(123,92,246,.2)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(circle_at_center,black_24%,transparent_82%)]" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1500px] flex-col px-5 py-5 sm:px-8 lg:px-12">
        <nav className="flex items-center justify-between gap-5 rounded-[2rem] border border-white/70 bg-white/35 px-4 py-3 shadow-[0_20px_70px_rgba(138,118,211,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
          <Link to="/" aria-label="GPA Master home" className="flex items-center gap-3">
            <BrandLogo size={46} textClassName="text-lg leading-none" />
          </Link>

          <div className="hidden items-center gap-9 text-[14px] font-bold text-[#242749] lg:flex">
            {navItems.map((item) => (
              <a key={item} href={`#${item.toLowerCase().replaceAll(' ', '-')}`} className="transition-colors hover:text-[#7657ff]">
                {item}
              </a>
            ))}
            <a href="#resources" className="flex items-center gap-1 transition-colors hover:text-[#7657ff]">
              Tài nguyên <CaretDown size={14} weight="bold" />
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden h-12 items-center rounded-2xl border border-white/70 bg-white/45 px-6 text-sm font-black text-[#1f2545] shadow-[0_12px_30px_rgba(137,124,190,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] transition hover:-translate-y-0.5 hover:bg-white/70 sm:flex"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="group flex h-12 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7357ff_0%,#8358ff_52%,#48c8f6_100%)] px-5 text-sm font-black text-white shadow-[0_18px_34px_rgba(112,88,255,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(112,88,255,0.34)] active:scale-[0.98] sm:px-7"
            >
              Bắt đầu miễn phí
              <Sparkle size={17} weight="fill" className="transition group-hover:rotate-12" />
            </Link>
          </div>
        </nav>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.88fr_1.32fr] lg:py-8 xl:gap-8">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-20 max-w-[620px] pt-4 lg:pt-0">
            <motion.div variants={fadeUp} className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/75 bg-white/45 px-4 py-2 text-[13px] font-black text-[#6750d8] shadow-[0_16px_40px_rgba(140,120,215,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl">
              <Sparkle size={16} weight="fill" className="text-[#ffc94a]" />
              Theo dõi GPA thông minh cho sinh viên
            </motion.div>

            <motion.h1 variants={fadeUp} className="max-w-[11ch] text-[clamp(3.1rem,7.2vw,6.35rem)] font-black leading-[0.95] tracking-[-0.075em] text-[#111631] [text-wrap:balance]" style={{ fontFamily: "'Be Vietnam Pro', 'Outfit', sans-serif" }}>
              Hiểu GPA.
              <span className="block text-[#7357ff]">Định hình</span>
              <span className="bg-[linear-gradient(100deg,#171b38_0%,#7357ff_42%,#ff995f_86%)] bg-clip-text text-transparent">tương lai.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-7 max-w-[520px] text-[18px] font-semibold leading-8 text-[#626985] [text-wrap:pretty]">
              Theo dõi điểm theo thời gian thực, đặt mục tiêu từng kỳ và nhận gợi ý để cải thiện kết quả học tập mà không phải tự tính thủ công.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className="group inline-flex h-16 items-center justify-center gap-4 rounded-[1.65rem] bg-[linear-gradient(135deg,#7255ff,#59c6ff)] px-8 text-[16px] font-black text-white shadow-[0_24px_45px_rgba(91,96,255,0.32)] transition hover:-translate-y-1 active:scale-[0.98]"
              >
                Bắt đầu theo dõi
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[#7657ff] transition group-hover:translate-x-1">
                  <ArrowRight size={18} weight="bold" />
                </span>
              </Link>
              <button className="group inline-flex h-16 items-center gap-4 rounded-[1.65rem] px-2 text-left transition hover:-translate-y-0.5" type="button">
                <span className="grid h-14 w-14 place-items-center rounded-full border border-white/80 bg-white/55 text-[#7357ff] shadow-[0_16px_36px_rgba(120,103,211,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] transition group-hover:scale-105">
                  <Play size={19} weight="fill" />
                </span>
                <span>
                  <span className="block text-sm font-black text-[#171b38]">Xem demo</span>
                  <span className="block text-xs font-bold text-[#7b829d]">1 phút</span>
                </span>
              </button>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-10 grid max-w-[560px] grid-cols-1 gap-4 text-[13px] font-bold text-[#626985] sm:grid-cols-3">
              <TrustItem icon={CalendarCheck} text="Miễn phí để bắt đầu" />
              <TrustItem icon={SealCheck} text="Không cần thẻ" />
              <TrustItem icon={Star} text="Dành cho sinh viên" />
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 44, rotate: 1.5 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ duration: 0.82, delay: 0.18, ease: [0.16, 1, 0.3, 1] }} className="relative min-h-[680px] lg:min-h-[760px]">
            <HeroDecor />
            <DashboardMockup />
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function TrustItem({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/55 text-[#7357ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_22px_rgba(143,126,210,0.12)]">
        <Icon size={17} weight="duotone" />
      </span>
      <span>{text}</span>
    </div>
  );
}

function HeroDecor() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-[-5%] top-[6%] text-7xl drop-shadow-[0_22px_25px_rgba(111,84,255,0.22)]">🪐</div>
      <div className="absolute right-[2%] top-[-2%] rotate-12 text-8xl drop-shadow-[0_28px_32px_rgba(111,84,255,0.18)]">🎓</div>
      <div className="absolute bottom-[3%] left-[7%] w-[230px] rounded-[2rem] border border-white/70 bg-white/55 p-5 shadow-[0_30px_80px_rgba(120,102,215,0.18)] backdrop-blur-xl">
        <p className="text-[15px] font-black leading-7 text-[#323757]">Mỗi bước nhỏ hôm nay, điểm số tốt hơn ngày mai. 🚀</p>
      </div>
      <div className="absolute bottom-[6%] right-[1%] rounded-[1.8rem] bg-[#7057f8] px-6 py-4 text-sm font-black leading-6 text-white shadow-[0_22px_48px_rgba(112,87,248,0.28)]">Cùng cải thiện nhé 💪</div>
      <div className="absolute bottom-[12%] left-[-1%] text-8xl">🌟</div>
      <div className="absolute right-[8%] top-[16%] text-5xl">🔔</div>
      <div className="absolute left-[42%] top-[3%] h-20 w-48 rounded-full border-t-2 border-dashed border-[#d9c3ff]" />
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="absolute right-0 top-8 w-full max-w-[900px] origin-center rotate-[2deg] rounded-[3rem] border border-white/75 bg-white/48 p-5 shadow-[0_45px_120px_rgba(139,119,214,0.22),inset_0_1px_0_rgba(255,255,255,0.98)] backdrop-blur-2xl lg:right-[-4%] xl:right-0">
      <div className="grid min-h-[660px] grid-cols-[170px_1fr] gap-5 rounded-[2.5rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(246,241,255,0.52))] p-5">
        <aside className="hidden rounded-[2rem] border border-white/65 bg-white/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] md:block">
          <div className="mb-8 flex items-center gap-2 text-sm font-black text-[#171b38]">
            <img src="/assets/dashboard/logo.png" alt="GPA Master logo" className="h-8 w-8 object-contain" />
            GPA Master
          </div>
          {['Dashboard', 'Môn học', 'Bảng điểm', 'GPA Calculator', 'Mục tiêu', 'Lịch học', 'Cài đặt'].map((item, index) => (
            <div key={item} className={`mb-2 flex items-center gap-3 rounded-2xl px-3 py-3 text-[12px] font-black ${index === 0 ? 'bg-[#efeaff] text-[#7057f8] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]' : 'text-[#656c89]'}`}>
              <span className="h-2 w-2 rounded-full bg-current opacity-60" />
              {item}
            </div>
          ))}
        </aside>

        <div className="min-w-0">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-black text-[#171b38]">Chào buổi tối, Alex 👋</p>
              <p className="mt-1 text-xs font-bold text-[#7d84a0]">Bạn đang đi đúng hướng. Giữ nhịp học tuần này nhé.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-2xl bg-white/65 px-4 py-2 text-xs font-black text-[#343956] shadow-[0_12px_28px_rgba(143,126,210,0.12)]" type="button">Spring 2024</button>
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/65 text-[#7057f8] shadow-[0_12px_28px_rgba(143,126,210,0.12)]"><Bell size={18} weight="duotone" /></span>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
            <TrendCard />
            <CourseCard />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <AssignmentCard />
            <GoalCard />
            <StreakCard />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, detail, tone, icon: Icon }) {
  const tones = {
    violet: 'from-[#f4efff] to-[#ffffff] text-[#7057f8]',
    peach: 'from-[#fff3e9] to-[#ffffff] text-[#e8894d]',
    mint: 'from-[#edfff7] to-[#ffffff] text-[#2ba976]',
    rose: 'from-[#fff0f6] to-[#ffffff] text-[#d95f8e]',
  };
  return (
    <div className={`rounded-[1.6rem] bg-gradient-to-br ${tones[tone]} p-4 shadow-[0_18px_40px_rgba(146,128,205,0.12),inset_0_1px_0_rgba(255,255,255,0.94)]`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-black text-[#69708b]">{label}</p>
        <Icon size={19} weight="duotone" />
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-black tracking-[-0.04em] text-[#111631]">{value}</span>
        <span className="mb-1 text-xs font-bold text-[#7d84a0]">{detail}</span>
      </div>
    </div>
  );
}

function TrendCard() {
  return (
    <section className="rounded-[1.8rem] bg-white/58 p-5 shadow-[0_20px_55px_rgba(146,128,205,0.13),inset_0_1px_0_rgba(255,255,255,0.96)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-black text-[#171b38]">Xu hướng GPA</h2>
        <span className="rounded-xl bg-white/70 px-3 py-1.5 text-[11px] font-black text-[#656c89]">Tất cả kỳ</span>
      </div>
      <div className="relative h-48 overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#faf7ff,#fff)] p-4">
        <svg viewBox="0 0 420 180" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="gpaLine" x1="0" x2="1" y1="0" y2="0">
              <stop stopColor="#7657ff" />
              <stop offset="1" stopColor="#58c7ff" />
            </linearGradient>
          </defs>
          <path d="M18 134 C72 98 96 92 132 86 C178 78 178 132 228 110 C270 90 302 82 386 88" fill="none" stroke="url(#gpaLine)" strokeWidth="8" strokeLinecap="round" />
          {[18, 132, 228, 386].map((x, i) => <circle key={x} cx={x} cy={[134, 86, 110, 88][i]} r="7" fill="#fff" stroke="#7657ff" strokeWidth="4" />)}
        </svg>
        <span className="absolute right-8 top-14 rounded-2xl bg-[#7657ff] px-3 py-2 text-xs font-black text-white shadow-lg">3.72</span>
      </div>
      <p className="mt-4 rounded-2xl bg-[#f3efff] px-4 py-3 text-xs font-bold text-[#656c89]">⭐ GPA của bạn đang tăng đều trong 3 kỳ gần nhất.</p>
    </section>
  );
}

function CourseCard() {
  return (
    <section className="rounded-[1.8rem] bg-white/58 p-5 shadow-[0_20px_55px_rgba(146,128,205,0.13),inset_0_1px_0_rgba(255,255,255,0.96)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-black text-[#171b38]">Tổng quan môn học</h2>
        <a href="#features" className="text-xs font-black text-[#7657ff]">Xem tất cả</a>
      </div>
      <div className="space-y-4">
        {courses.map((course) => (
          <div key={course.name} className="grid grid-cols-[1fr_92px_34px] items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-[#242949]">{course.name}</p>
              <p className="text-[10px] font-bold text-[#8b91aa]">{course.code}</p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#ece8f5]">
              <div className="h-full rounded-full" style={{ width: `${course.progress}%`, backgroundColor: course.color }} />
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-black text-[#31a36f] shadow-[0_8px_18px_rgba(133,118,190,0.12)]">{course.grade}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AssignmentCard() {
  return (
    <section className="rounded-[1.8rem] bg-white/58 p-5 shadow-[0_20px_55px_rgba(146,128,205,0.12),inset_0_1px_0_rgba(255,255,255,0.96)]">
      <h2 className="mb-4 text-sm font-black text-[#171b38]">Bài cần làm</h2>
      <div className="space-y-3">
        {assignments.map((item, index) => (
          <div key={item} className="flex items-center gap-3 text-[11px] font-bold text-[#656c89]">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#f1ecff] text-[#7657ff]"><CheckCircle size={15} weight="duotone" /></span>
            <span className="truncate">{item}</span>
            <span className="ml-auto text-[#e8894d]">{index + 2} ngày</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function GoalCard() {
  return (
    <section className="rounded-[1.8rem] bg-white/58 p-5 shadow-[0_20px_55px_rgba(146,128,205,0.12),inset_0_1px_0_rgba(255,255,255,0.96)]">
      <h2 className="mb-4 text-sm font-black text-[#171b38]">Mục tiêu GPA</h2>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-black text-[#111631]">3.80</span>
        <span className="mb-1 text-xs font-bold text-[#7d84a0]">/4.00</span>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#ece8f5]">
        <div className="h-full w-[92%] rounded-full bg-[linear-gradient(90deg,#7657ff,#55c9ff)]" />
      </div>
      <p className="mt-3 text-xs font-black text-[#31a36f]">92% hoàn thành</p>
    </section>
  );
}

function StreakCard() {
  return (
    <section className="rounded-[1.8rem] bg-white/58 p-5 shadow-[0_20px_55px_rgba(146,128,205,0.12),inset_0_1px_0_rgba(255,255,255,0.96)]">
      <h2 className="mb-4 text-sm font-black text-[#171b38]">Chuỗi học tập</h2>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-end gap-2">
            <Lightning size={30} weight="fill" className="text-[#ff805f]" />
            <span className="text-4xl font-black text-[#111631]">12</span>
          </div>
          <p className="mt-2 text-xs font-bold text-[#7d84a0]">ngày liên tiếp</p>
        </div>
        <span className="text-5xl">🔥</span>
      </div>
    </section>
  );
}
