import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default AppLayout

