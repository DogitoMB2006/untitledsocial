const Footer = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-slate-500">
        <p className="">&copy; {new Date().getFullYear()} NebulaX. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <button className="hover:text-slate-300 transition-colors">About</button>
          <button className="hover:text-slate-300 transition-colors">Terms</button>
          <button className="hover:text-slate-300 transition-colors">Privacy</button>
        </div>
      </div>
    </footer>
  )
}

export default Footer

