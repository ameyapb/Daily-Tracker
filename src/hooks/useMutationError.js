import { useCallback, useState } from 'react'

export function useMutationError() {
  const [mutationError, setMutationError] = useState(null)

  const clearMutationError = useCallback(() => setMutationError(null), [])

  const runMutation = useCallback(async (mutationFn) => {
    try {
      setMutationError(null)
      return await mutationFn()
    } catch (error) {
      setMutationError(error)
      throw error
    }
  }, [])

  return { mutationError, clearMutationError, runMutation }
}
