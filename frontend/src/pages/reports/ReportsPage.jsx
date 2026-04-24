import { useState, useEffect } from 'react'
import api from '../../api/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { BarChart3, TrendingUp, DollarSign, Package, Download, Calendar, Printer, Filter } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { useSettingsStore } from '../../store/settingsStore'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import clsx from 'clsx'

const ReportCard = ({ title, value, icon: Icon, color }) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center', 
      color === 'green' ? 'bg-green-500/10 text-green-400' : 
      color === 'blue' ? 'bg-blue-500/10 text-blue-400' : 
      color === 'red' ? 'bg-red-500/10 text-red-400' : 'bg-brand-600/10 text-brand-400')}>
      <Icon size={24} />
    </div>
    <div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-[#94a3b8] font-medium uppercase tracking-wider">{title}</div>
    </div>
  </div>
)

export default function ReportsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dates, setDates] = useState({ 
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), 
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd') 
  })
  const { settings } = useSettingsStore()
  const cur = settings.currency || '৳'

  const fetchReports = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/reports/sales?from=${dates.from}&to=${dates.to}`)
      setData(data)
    } finally { setLoading(false) }
  }

  const handlePrint = () => {
    if (!data) return
    const doc = new jsPDF()
    const pageW = doc.internal.pageSize.width
    
    doc.setFontSize(18)
    doc.text(settings.shopName || 'PharmaCare Report', pageW / 2, 20, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Period: ${format(new Date(dates.from), 'PP')} to ${format(new Date(dates.to), 'PP')}`, pageW / 2, 28, { align: 'center' })

    // Summary section
    doc.autoTable({
      startY: 35,
      head: [['Total Revenue', 'Net Profit', 'Total Discount', 'Outstanding Dues']],
      body: [[
        `${cur}${data.summary.totalRevenue.toFixed(2)}`,
        `${cur}${data.summary.totalProfit.toFixed(2)}`,
        `${cur}${data.summary.totalDiscount.toFixed(2)}`,
        `${cur}${data.summary.totalDue.toFixed(2)}`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [31, 152, 112] }
    })

    // Details table
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Date', 'Sales', 'Revenue', 'Profit']],
      body: data.daily.map(d => [
        format(new Date(d.date), 'MMM d, yyyy'),
        d.count,
        `${cur}${d.revenue.toFixed(2)}`,
        `${cur}${d.profit.toFixed(2)}`
      ]),
      headStyles: { fillColor: [42, 47, 69] }
    })

    doc.save(`Financial-Report-${dates.from}-to-${dates.to}.pdf`)
  }

  const handleExport = () => {
    if (!data) return
    let csv = 'Date,SalesCount,Revenue,Discount,Profit\n'
    data.daily.forEach(d => {
      csv += `${d.date},${d.count},${d.revenue},${d.discount || 0},${d.profit}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Report-${dates.from}-to-${dates.to}.csv`
    a.click()
  }

  useEffect(() => { fetchReports() }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Analyze sales, profits and trends</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={!data} className="btn-secondary gap-2"><Download size={14} /> Export</button>
          <button onClick={handlePrint} disabled={!data} className="btn-secondary gap-2"><Printer size={14} /> Print</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-3 flex flex-wrap items-end gap-4">
        <div className="form-group">
          <label className="label">From Date</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <input type="date" className="input-sm pl-9" value={dates.from} onChange={e => setDates({...dates, from: e.target.value})} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">To Date</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <input type="date" className="input-sm pl-9" value={dates.to} onChange={e => setDates({...dates, to: e.target.value})} />
          </div>
        </div>
        <button onClick={fetchReports} className="btn-primary h-9 gap-2"><Filter size={14} /> Generate Report</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : !data ? (
        <div className="text-center py-12 text-[#94a3b8]">No data found for selected range</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <ReportCard title="Total Revenue" value={`${cur}${data.summary.totalRevenue.toFixed(0)}`} icon={TrendingUp} color="brand" />
            <ReportCard title="Net Profit" value={`${cur}${data.summary.totalProfit.toFixed(0)}`} icon={DollarSign} color="green" />
            <ReportCard title="Total Discounts" value={`${cur}${data.summary.totalDiscount.toFixed(0)}`} icon={BarChart3} color="blue" />
            <ReportCard title="Outstanding Dues" value={`${cur}${data.summary.totalDue.toFixed(0)}`} icon={Package} color="red" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 card p-6">
              <h3 className="font-semibold text-white mb-6">Revenue Trend</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1f9870" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#1f9870" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" vertical={false} />
                    <XAxis dataKey="date" tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={v => format(new Date(v), 'MMM d')} />
                    <YAxis tick={{fill: '#94a3b8', fontSize: 11}} />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#1a1d27', border: '1px solid #2a2f45', borderRadius: '8px', fontSize: '12px'}} 
                      itemStyle={{color: '#1f9870'}}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#1f9870" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-white mb-6">Profit Analysis</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" vertical={false} />
                    <XAxis dataKey="date" tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={v => format(new Date(v), 'MMM d')} />
                    <YAxis tick={{fill: '#94a3b8', fontSize: 11}} />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#1a1d27', border: '1px solid #2a2f45', borderRadius: '8px', fontSize: '12px'}}
                      cursor={{fill: '#21263a'}}
                    />
                    <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-4 border-b border-[#2a2f45] font-semibold text-white">Daily Summary Details</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sales Count</th>
                    <th>Revenue</th>
                    <th>Discounts</th>
                    <th>Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map(d => (
                    <tr key={d.date}>
                      <td>{format(new Date(d.date), 'EEEE, MMM d, yyyy')}</td>
                      <td>{d.count}</td>
                      <td className="font-semibold">{cur}{d.revenue.toFixed(2)}</td>
                      <td className="text-red-400">-{cur}{(d.discount || 0).toFixed(2)}</td>
                      <td className="text-green-400 font-bold">{cur}{d.profit.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
