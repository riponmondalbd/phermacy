import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      settings: {
        shopName: 'PharmaCare Pharmacy',
        shopAddress: '123 Health Street, Dhaka',
        shopPhone: '',
        shopEmail: '',
        currency: '৳',
        taxRate: '0',
        invoiceFooter: 'Thank you for your purchase!',
      },
      setSettings: (settings) => set({ settings }),
      updateSetting: (key, value) => set(s => ({ settings: { ...s.settings, [key]: value } }))
    }),
    { name: 'pharmacy-settings' }
  )
)
