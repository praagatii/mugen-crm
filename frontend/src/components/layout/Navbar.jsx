import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/upload', label: 'Upload' },
  { to: '/scrape', label: 'Scrape' },
  { to: '/leads', label: 'Leads' },
  { to: '/settings', label: 'Settings' },
]

export default function Navbar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50"
      style={{width:"220px", background:'#111111', borderRight:"1px solid #202020"}}>
      <div className="px-4 pt-6 pb-6">
        <img src="/mugenlogo.png" alt="Mugen" style={{height:"64px", opacity:0.4}} />
      </div>
      <nav className="flex flex-col gap-3 pt-0">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
