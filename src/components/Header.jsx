import { HEADER_HEIGHT_PX } from './headerConstants'
import './Header.css'

function goHome() {
  window.location.assign('/')
}

export function Header() {
  return (
    <header className="header" style={{ '--header-height-px': `${HEADER_HEIGHT_PX}px` }}>
      <div className="header__left">
        <span className="header__title">Daily Tracker</span>
        <nav className="header__nav">
          <button type="button" className="header__nav-item header__nav-item--active" onClick={goHome}>
            <span>HOME</span>
          </button>
        </nav>
      </div>
      <div className="header__right" />
    </header>
  )
}
