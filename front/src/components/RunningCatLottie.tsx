import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useSyncExternalStore, type CSSProperties } from 'react'
import runningCatUrl from '../assets/running-Cat.lottie?url'

type Props = {
  className?: string
  style?: CSSProperties
  /** 系统「减少动态效果」开启时不自动播放（停留首帧） */
  respectReducedMotion?: boolean
}

export function RunningCatLottie({
  className,
  style,
  respectReducedMotion = true,
}: Props) {
  const reduceMotion = useSyncExternalStore(
    (onStoreChange) => {
      if (!respectReducedMotion || typeof window === 'undefined') return () => {}
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      const onChange = () => onStoreChange()
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => {
      if (!respectReducedMotion || typeof window === 'undefined') return false
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    },
    () => false,
  )

  return (
    <DotLottieReact
      src={runningCatUrl}
      loop
      autoplay={!reduceMotion}
      className={className}
      style={style}
      aria-hidden
    />
  )
}
