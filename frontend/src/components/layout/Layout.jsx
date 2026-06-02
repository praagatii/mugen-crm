import Navbar from './Navbar.jsx'

export default function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen flex flex-col items-center" style={{marginLeft:"220px"}}>
        {children}
      </main>
    </>
  )
}
