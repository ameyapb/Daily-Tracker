import { useEffect } from 'react'

export function usePolling(callback, intervalMs) {
  useEffect(() => {
    callback()
    const intervalId = setInterval(callback, intervalMs)
    return () => clearInterval(intervalId)
  }, [callback, intervalMs])
}
