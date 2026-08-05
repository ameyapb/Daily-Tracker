import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from './Header'

describe('Header', () => {
  it('renders the app title', () => {
    render(<Header />)
    expect(screen.getByText('Daily Tracker')).toBeInTheDocument()
  })

  it('renders a HOME nav button', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: 'HOME' })).toBeInTheDocument()
  })

  it('navigates to the tracker home when HOME is clicked', () => {
    const assign = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign },
    })

    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: 'HOME' }))

    expect(assign).toHaveBeenCalledWith('/')

    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })
})
