import { SignInButton, SignedIn, SignedOut, useClerk, useUser } from '@clerk/clerk-react'
import { LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isClerkAuthEnabled } from '../config/clerk'

function SignedInUser() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const name = user?.fullName ?? user?.username ?? email ?? '用户'
  const img = user?.imageUrl

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  return (
    <div ref={wrapRef} className="relative flex max-w-[min(100%,280px)] items-center gap-2">
      <span className="hidden min-w-0 truncate text-xs text-[var(--text)] sm:inline" title={email}>
        {email || '已登录'}
      </span>
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-[var(--border-warm)] transition hover:ring-[var(--terracotta)]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="账户菜单"
      >
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <UserRound className="text-[var(--text)]" size={18} strokeWidth={2} aria-hidden />
        )}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[160px] rounded-xl border border-[var(--border-warm)] bg-[var(--bg)] py-1 shadow-lg"
          role="menu"
        >
          <div className="border-b border-[var(--border-warm)] px-3 py-2">
            <p className="truncate text-xs font-medium text-[var(--text-h)]">{name}</p>
            {email ? <p className="mt-0.5 truncate text-[11px] text-[var(--text)]">{email}</p> : null}
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-h)] hover:bg-[var(--warm-sand)]"
            onClick={() => {
              setOpen(false)
              void signOut({ redirectUrl: window.location.origin })
            }}
          >
            <LogOut size={14} strokeWidth={2} aria-hidden />
            退出登录
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * 登录后：头像 + 邮箱 + 自绘菜单（仅退出），不含 Clerk 默认弹层里的「管理账户」与底部品牌条。
 */
export function ClerkUserBar() {
  if (!isClerkAuthEnabled()) {
    return null
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-lg border border-[var(--border-warm)] bg-[var(--ivory)] px-3 py-2 text-sm text-[var(--text-h)] transition hover:bg-[var(--warm-sand)]"
          >
            登录
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <SignedInUser />
      </SignedIn>
    </div>
  )
}
