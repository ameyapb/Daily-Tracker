import { useEffect, useRef, useState } from 'react'
import { RAIL_WIDTH_PX, RAIL_WIDTH_MOBILE_PX } from './railConstants'
import { HEADER_HEIGHT_PX } from './headerConstants'
import './Rail.css'

export function Rail({ onCreateLane }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [newLaneName, setNewLaneName] = useState('')
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!isPopoverOpen) return undefined

    function closeOnOutsideClick(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsPopoverOpen(false)
      }
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsPopoverOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isPopoverOpen])

  function togglePopover() {
    setIsPopoverOpen((currentlyOpen) => !currentlyOpen)
  }

  async function handleCreateLane(event) {
    event.preventDefault()
    const trimmedName = newLaneName.trim()
    if (!trimmedName) return
    await onCreateLane(trimmedName)
    setNewLaneName('')
    setIsPopoverOpen(false)
  }

  return (
    <div
      className="rail"
      ref={popoverRef}
      style={{
        '--rail-width-px': `${RAIL_WIDTH_PX}px`,
        '--rail-width-mobile-px': `${RAIL_WIDTH_MOBILE_PX}px`,
        '--header-height-px': `${HEADER_HEIGHT_PX}px`,
      }}
    >
      <button
        type="button"
        className="rail__add-lane-button"
        onClick={togglePopover}
        aria-label="Add lane"
        title="Add lane"
      >
        +
      </button>

      {isPopoverOpen && (
        <form className="rail__popover" onSubmit={handleCreateLane}>
          <input
            className="rail__popover-input"
            value={newLaneName}
            onChange={(event) => setNewLaneName(event.target.value)}
            placeholder="New lane name"
            aria-label="New lane name"
            autoFocus
          />
          <button type="submit" className="rail__popover-submit button--lift">
            Create lane
          </button>
        </form>
      )}
    </div>
  )
}
