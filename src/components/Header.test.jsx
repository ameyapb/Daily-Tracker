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

  it('does not throw when HOME is clicked, and calls no handler', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Header />)

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'HOME' }))).not.toThrow()

    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
