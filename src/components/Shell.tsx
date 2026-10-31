import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, BookOpen, Gamepad2, Home, Library, PenLine, Search, Settings, User } from 'lucide-react'
import { openSearch } from './CommandPalette'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'

const NAV = [
  { to: '/', icon: Home, key: 'nav.home' },
  { to: '/learn', icon: BookOpen, key: 'nav.learn' },
  { to: '/grammar', icon: PenLine, key: 'nav.grammar' },
  { to: '/games', icon: Gamepad2, key: 'nav.games' },
  { to: '/library', icon: Library, key: 'nav.library' },
  { to: '/profile', icon: User, key: 'nav.profile' },
]

// 手机底部五个位置更耐看，语法从首页的快捷入口进
const MOBILE_NAV = NAV.filter((n) => n.to !== '/grammar')

/** 桌面端只在子页面出现的窄工具条：首页的导航交给了星系，这里只需要一条退路 */
function DeskBar() {
  const t = useT()
  const { pathname } = useLocation()
  const current = NAV.filter((n) => n.to !== '/').find((n) => pathname.startsWith(n.to))
  const label = current ? t(current.key) : pathname.startsWith('/settings') ? t('nav.settings') : ''

  return (
    <div className="mb-6 hidden items-center gap-3 lg:flex">
      <Link
        to="/"
        className="flex items-center gap-1.5 rounded-full border border-line px-3 py-[6px] text-[11.5px] text-ink-2 transition-colors hover:border-[rgba(var(--brand-rgb)/0.45)] hover:text-ink"
      >
        <ArrowLeft size={13} />
        {t('nav.home')}
      </Link>
      <span className="text-[10px] uppercase tracking-[0.22em] text-ink-3">{label}</span>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={openSearch}
          aria-label={t('search.title')}
          className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-[var(--surface)] hover:text-ink"
        >
          <Search size={15} />
        </button>
        <Link
          to="/profile"
          aria-label={t('nav.profile')}
          className={cn(
            'grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-[var(--surface)] hover:text-ink',
            pathname.startsWith('/profile') ? 'text-ink' : 'text-ink-3',
          )}
        >
          <User size={15} />
        </Link>
        <Link
          to="/settings"
          aria-label={t('nav.settings')}
          className={cn(
            'grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-[var(--surface)] hover:text-ink',
            pathname.startsWith('/settings') ? 'text-ink' : 'text-ink-3',
          )}
        >
          <Settings size={15} />
        </Link>
      </div>
    </div>
  )
}

export default function Shell() {
  const t = useT()
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="relative z-[1] min-h-full">
      <main>
        <div
          className={cn(
            // 移动端底部要同时避开底栏和右侧悬浮的助手按钮，留白比桌面版多
            'mx-auto w-full px-4 pb-32 pt-5 sm:px-6 lg:pb-14 lg:pt-8',
            // 首页是仪表盘、词库是「三栏 + 书架」，都需要更宽的画布
            // 首页星河要通铺到屏幕边，否则两侧会留出两条空带
            location.pathname === '/'
              ? 'max-w-none'
              : location.pathname === '/library'
                ? 'max-w-[1240px]'
                : 'max-w-[940px]',
          )}
        >
          {!isHome && <DeskBar />}

          {/* 首页自带通铺星河，这条搜索栏会把首屏顶下去；桌面端由顶栏接管 */}
          {!isHome && (
            <button
              type="button"
              onClick={openSearch}
              className="mb-4 flex w-full items-center gap-2.5 rounded-full border border-line bg-[var(--surface)] px-4 py-2.5 text-left text-[13px] text-ink-3 lg:hidden"
            >
              <Search size={16} />
              <span className="flex-1 truncate">{t('search.placeholder')}</span>
            </button>
          )}

          <Outlet />
        </div>
      </main>

      <nav className="safe-b fixed inset-x-0 bottom-0 z-20 border-t border-line bg-[var(--glass)] px-2 pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between">
          {MOBILE_NAV.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] transition-colors',
                  isActive ? 'text-brand' : 'text-ink-3',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={19} strokeWidth={isActive ? 2.4 : 1.9} />
                  <span>{t(key)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
