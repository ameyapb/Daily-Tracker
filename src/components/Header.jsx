import { HEADER_HEIGHT_PX } from './headerConstants'
import './Header.css'

export function Header() {
  return (
    <header className="header" style={{ '--header-height-px': `${HEADER_HEIGHT_PX}px` }}>
      <div className="header__left">
        <span className="header__title">Daily Tracker</span>
      </div>
      <nav className="header__nav">
        <button type="button" className="header__nav-item header__nav-item--active" onClick={() => {}}>
          HOME
        </button>
      </nav>
      <div className="header__right" />
    </header>
  )
}
