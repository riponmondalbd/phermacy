import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard, ShoppingCart, Package, ShoppingBag, Truck,
  Users, BarChart3, Wallet, Settings, Database, ArrowLeftRight,
  ClipboardList, LogOut, ChevronLeft, ChevronRight, Bell, User,
  Menu, X, PillIcon
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/pos', icon: ShoppingCart, label: 'POS / Billing' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/inventory', icon: ClipboardList, label: 'Inventory' },
  { to: '/purchases', icon: ShoppingBag, label: 'Purchases', roles: ['ADMIN','MANAGER'] },
  { to: '/suppliers', icon: Truck, label: 'Suppliers', roles: ['ADMIN','MANAGER'] },
  { to: '/sales', icon: BarChart3, label: 'Sales' },
  { to: '/customers', icon: Users, label: 'Customers', roles: ['ADMIN','MANAGER'] },
  { to: '/returns', icon: ArrowLeftRight, label: 'Returns' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/cash', icon: Wallet, label: 'Cash Management' },
  { to: '/backup', icon: Database, label: 'Backup', roles: ['ADMIN','MANAGER'] },
  { to: '/users', icon: User, label: 'Users', roles: ['ADMIN'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['ADMIN'] },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const filteredLinks = navLinks.filter(l => !l.roles || l.roles.includes(user?.role))

  const NavItems = () => (
    <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto scrollbar-hide py-2">
      {filteredLinks.map(({ to, icon: Icon, label, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => clsx('nav-item', isActive && 'active')}
        >
          <Icon size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
    </nav>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 px-3 py-4 border-b border-[#2a2f45]', collapsed && 'justify-center')}>
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
          <PillIcon size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm text-white">PharmaCare</div>
            <div className="text-xs text-[#94a3b8]">Management System</div>
          </div>
        )}
      </div>

      <NavItems />

      {/* User section */}
      <div className="border-t border-[#2a2f45] p-3">
        <div className={clsx('flex items-center gap-2 mb-2', collapsed && 'justify-center')}>
          <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#e2e8f0] truncate">{user?.name}</div>
              <div className="text-xs text-[#94a3b8] capitalize">{user?.role?.toLowerCase()}</div>
            </div>
          )}
        </div>
        <button onClick={handleLogout} className={clsx('nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10', collapsed && 'justify-center')}>
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117]">
      {/* Desktop sidebar */}
      <aside className={clsx(
        'hidden lg:flex flex-col bg-[#1a1d27] border-r border-[#2a2f45] transition-all duration-200 relative shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-[#2a2f45] rounded-full flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-brand-600 transition-colors z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 bg-[#1a1d27] border-r border-[#2a2f45] flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-[#1a1d27] border-b border-[#2a2f45] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden btn-ghost btn-icon"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu size={18} />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <PillIcon size={16} className="text-brand-400" />
              <span className="font-bold text-white text-sm">PharmaCare</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] sm:text-xs text-[#94a3b8]">
              {new Date().toLocaleDateString('en-BD', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
