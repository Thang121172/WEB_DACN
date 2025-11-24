import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useLocation, LocationData } from '../hooks/useLocation'

interface LocationContextType {
  location: LocationData | null
  loading: boolean
  error: string | null
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown'
  requestPermission: (forceRefresh?: boolean) => Promise<void>
  getCurrentLocation: (forceRefresh?: boolean) => Promise<void>
  clearLocation: () => void
  address: string | null
  setAddress: (address: string | null) => void
  isFetchingAddress: boolean
  addressFetchFailed: boolean
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
  const locationHook = useLocation()
  const [address, setAddress] = useState<string | null>(null)
  const [isFetchingAddress, setIsFetchingAddress] = useState(false)
  const [addressFetchFailed, setAddressFetchFailed] = useState(false)

  // Lấy địa chỉ từ localStorage khi mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('user_address')
    if (savedAddress) {
      setAddress(savedAddress)
    }
  }, [])

  // Lưu địa chỉ vào localStorage khi thay đổi
  useEffect(() => {
    if (address) {
      localStorage.setItem('user_address', address)
    } else {
      localStorage.removeItem('user_address')
    }
  }, [address])

  // Reset trạng thái khi vị trí thay đổi
  useEffect(() => {
    if (locationHook.location) {
      setAddressFetchFailed(false)
    }
  }, [locationHook.location?.latitude, locationHook.location?.longitude])

  // Thử lấy địa chỉ từ tọa độ (reverse geocoding) khi có vị trí
  // Chỉ fetch nếu chưa có address (để tránh override address đã được set thủ công)
  useEffect(() => {
    if (locationHook.location && !address && !addressFetchFailed) {
      // Sử dụng OpenStreetMap Nominatim API để reverse geocoding
      const fetchAddress = async () => {
        setIsFetchingAddress(true)
        setAddressFetchFailed(false)
        try {
          const { latitude, longitude } = locationHook.location!
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=vi`,
            {
              headers: {
                'User-Agent': 'FastFoodApp/1.0'
              }
            }
          )
          const data = await response.json()
          
          if (data.address) {
            // Format địa chỉ theo chuẩn Việt Nam
            const parts: string[] = []
            
            // Số nhà và tên đường
            if (data.address.house_number) {
              parts.push(data.address.house_number)
            }
            if (data.address.road) {
              // Xử lý tên đường (có thể là "Đường X" hoặc chỉ "X")
              let roadName = data.address.road
              if (!roadName.toLowerCase().includes('đường') && !roadName.toLowerCase().includes('street')) {
                roadName = `Đường ${roadName}`
              }
              parts.push(roadName)
            }
            
            // Phường/Xã
            if (data.address.quarter || data.address.neighbourhood || data.address.suburb) {
              const ward = data.address.quarter || data.address.neighbourhood || data.address.suburb
              if (!ward.toLowerCase().includes('phường') && !ward.toLowerCase().includes('xã')) {
                parts.push(`Phường ${ward}`)
              } else {
                parts.push(ward)
              }
            }
            
            // Quận/Huyện
            if (data.address.city_district || data.address.district) {
              const district = data.address.city_district || data.address.district
              if (!district.toLowerCase().includes('quận') && !district.toLowerCase().includes('huyện')) {
                // Thử đoán xem là quận hay huyện dựa vào context
                if (data.address.city || data.address.town) {
                  parts.push(`Quận ${district}`)
                } else {
                  parts.push(`Huyện ${district}`)
                }
              } else {
                parts.push(district)
              }
            }
            
            // Thành phố/Tỉnh
            if (data.address.city || data.address.town || data.address.village) {
              const city = data.address.city || data.address.town || data.address.village
              parts.push(city)
            } else if (data.address.state) {
              parts.push(data.address.state)
            }
            
            // Nếu có display_name và không có địa chỉ chi tiết, dùng display_name
            if (parts.length === 0 && data.display_name) {
              // Lấy phần đầu của display_name (thường là địa chỉ cụ thể hơn)
              const displayParts = data.display_name.split(',')
              // Lấy 2-3 phần đầu (thường là địa chỉ chi tiết)
              const relevantParts = displayParts.slice(0, Math.min(3, displayParts.length))
              setAddress(relevantParts.join(', ').trim())
            } else if (parts.length > 0) {
              setAddress(parts.join(', '))
            } else {
              // Nếu không lấy được địa chỉ, đánh dấu là đã thử nhưng thất bại
              setAddressFetchFailed(true)
            }
          } else {
            setAddressFetchFailed(true)
          }
        } catch (error) {
          console.error('Failed to fetch address from coordinates:', error)
          // Nếu lỗi, đánh dấu là đã thử nhưng thất bại
          setAddressFetchFailed(true)
        } finally {
          setIsFetchingAddress(false)
        }
      }

      fetchAddress()
    }
  }, [locationHook.location, address, addressFetchFailed])

  const value: LocationContextType = {
    ...locationHook,
    address,
    setAddress,
    isFetchingAddress,
    addressFetchFailed
  }

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocationContext() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider')
  }
  return context
}

