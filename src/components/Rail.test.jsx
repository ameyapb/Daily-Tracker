import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Rail } from './Rail'

describe('Rail', () => {
  it('renders the add-lane button', () => {
    render(<Rail onCreateLane={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add lane' })).toBeInTheDocument()
  })

  it('opens the popover when the add-lane button is clicked', () => {
    render(<Rail onCreateLane={vi.fn()} />)
    expect(screen.queryByLabelText('New lane name')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add lane' }))

    expect(screen.getByLabelText('New lane name')).toBeInTheDocument()
  })

  it('calls onCreateLane with the trimmed name and closes the popover on submit', async () => {
    const onCreateLane = vi.fn().mockResolvedValue(undefined)
    render(<Rail onCreateLane={onCreateLane} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add lane' }))
    fireEvent.change(screen.getByLabelText('New lane name'), { target: { value: '  Work  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create lane' }))

    expect(onCreateLane).toHaveBeenCalledWith('Work')
  })

  it('does not call onCreateLane when the trimmed name is empty', () => {
    const onCreateLane = vi.fn()
    render(<Rail onCreateLane={onCreateLane} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add lane' }))
    fireEvent.change(screen.getByLabelText('New lane name'), { target: { value: '   ' } })
    fireEvent.submit(screen.getByLabelText('New lane name').closest('form'))

    expect(onCreateLane).not.toHaveBeenCalled()
  })

  it('closes the popover on Escape', () => {
    render(<Rail onCreateLane={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add lane' }))
    expect(screen.getByLabelText('New lane name')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByLabelText('New lane name')).not.toBeInTheDocument()
  })

  it('closes the popover on outside click', () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <Rail onCreateLane={vi.fn()} />
      </div>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add lane' }))
    expect(screen.getByLabelText('New lane name')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))

    expect(screen.queryByLabelText('New lane name')).not.toBeInTheDocument()
  })
})
