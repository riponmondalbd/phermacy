import { useEffect, useState } from 'react'
import api from '../../api/client'
import { useSettingsStore } from '../../store/settingsStore'
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
  Clock, DollarSign, Users, Truck, ArrowUpRight, Activity
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format } from 'date-fns'
import clsx from 'clsx'

const StatCard = ({ title, value, sub, icon: Icon, color = 'brand', trend }) => {
  const colors = {
    brand: 'bg-brand-600/15 text-brand-400',
    red: 'bg-red-500/15 text-red-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
    blue: 'bg-blue-500/15 text-blue-400',
    purple: 'bg-purple-500/15 text-purple-400',
  }
  return (
    <div className="stat-card card-hover">
      <div className="flex items-start justify-between">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', colors[color])}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={clsx('flex items-center gap-0.5 text-xs font-medium', trend >= 0 ? 'text-green-400' : 'text-red-400')}>
            <ArrowUpRight size={12} className={trend < 0 ? 'rotate-90' : ''} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-[#94a3b8] mt-0.5">{title}</div>
      </div>
      {sub && <div className="text-xs text-[#64748b]">{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs">
      <div className="text-[#94a3b8] mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="font-semibold" style={{ color: p.color }}>
          {currency}{Number(p.value).toFixed(0)}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { settings } = useSettingsStore()
  const cur = settings.currency || '৳'

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner w-8 h-8" />
    </div>
  )

  if (!data) return <div className="text-[#94a3b8]">Failed to load dashboard</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
          <Activity size={14} className="text-green-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard title="Today's Revenue" value={`${cur}${data.today.revenue.toFixed(0)}`}
          sub={`${data.today.salesCount} sales`} icon={TrendingUp} color="brand" />
        <StatCard title="Month Revenue" value={`${cur}${data.month.revenue.toFixed(0)}`}
          sub={`${data.month.salesCount} sales`} icon={DollarSign} color="blue" />
        <StatCard title="Customer Dues" value={`${cur}${data.dues.customer.toFixed(0)}`}
          icon={Users} color="yellow" />
        <StatCard title="Supplier Dues" value={`${cur}${data.dues.supplier.toFixed(0)}`}
          icon={Truck} color="purple" />
      </div>

      {/* Alerts */}
      {(data.inventory.lowStockCount > 0 || data.inventory.expiredCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.inventory.lowStockCount > 0 && (
            <div className="alert-warning flex items-center gap-2">
              <AlertTriangle size={16} />
              <span><strong>{data.inventory.lowStockCount}</strong> products are low on stock</span>
            </div>
          )}
          {data.inventory.expiredCount > 0 && (
            <div className="alert-danger flex items-center gap-2">
              <Clock size={16} />
              <span><strong>{data.inventory.expiredCount}</strong> batches have expired</span>
            </div>
          )}
          {data.inventory.expiringCount > 0 && (
            <div className="alert-warning flex items-center gap-2">
              <Clock size={16} />
              <span><strong>{data.inventory.expiringCount}</strong> batches expiring within 90 days</span>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Sales chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-[#e2e8f0] mb-4">Last 7 Days Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.salesChart}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1f9870" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1f9870" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={v => format(new Date(v), 'MMM d')} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip currency={cur} />} />
              <Area type="monotone" dataKey="revenue" stroke="#1f9870" strokeWidth={2}
                fill="url(#revGrad)" name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="card p-5">
          <h3 className="font-semibold text-[#e2e8f0] mb-4">Top Products (by quantity)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={110} />
              <Tooltip content={<CustomTooltip currency="" />} />
              <Bar dataKey="quantity" fill="#1f9870" radius={[0, 4, 4, 0]} name="Qty Sold" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card">
        <div className="p-4 border-b border-[#2a2f45] flex items-center justify-between">
          <h3 className="font-semibold text-[#e2e8f0]">Recent Sales</h3>
          <a href="/sales" className="text-xs text-brand-400 hover:text-brand-300">View all</a>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Due</th>
                <th>Method</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentSales.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-[#94a3b8] py-8">No sales today</td></tr>
              ) : data.recentSales.map(sale => (
                <tr key={sale.id}>
                  <td className="font-mono text-brand-400 text-xs">{sale.invoiceNo}</td>
                  <td>{sale.customer?.name || <span className="text-[#94a3b8]">Walk-in</span>}</td>
                  <td className="font-semibold">{cur}{sale.totalAmount.toFixed(2)}</td>
                  <td>
                    {sale.dueAmount > 0
                      ? <span className="badge-red">{cur}{sale.dueAmount.toFixed(2)}</span>
                      : <span className="badge-green">Paid</span>}
                  </td>
                  <td className="capitalize">{sale.paymentMethod}</td>
                  <td className="text-[#94a3b8] text-xs">{format(new Date(sale.saleDate), 'hh:mm a')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
