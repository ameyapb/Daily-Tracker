import { useCallback, useState } from 'react'

export function useArmedAction() {
  const [isArmed, setIsArmed] = useState(false)

  const arm = useCallback(() => setIsArmed(true), [])
  const disarm = useCallback(() => setIsArmed(false), [])

  const trigger = useCallback(() => {
    if (isArmed) {
      setIsArmed(false)
      return true
    }
    setIsArmed(true)
    return false
  }, [isArmed])

  return { isArmed, arm, disarm, trigger }
}
