import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * 返回上一级。
 *
 * 之前各个页面的返回箭头都写死了目标（学习页固定回首页、游戏页固定回 /games），
 * 从词库点进学习再点返回，会被直接扔回首页，来路丢了。
 * 这里优先走浏览器历史；只有在没有历史（直接打开链接 / 从外部跳进来）时，
 * 才回落到调用方给的兜底路径。
 */
export function useBack(fallback = '/') {
  const navigate = useNavigate()
  return useCallback(() => {
    const state = window.history.state as { idx?: number } | null
    if ((state?.idx ?? 0) > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, fallback])
}
