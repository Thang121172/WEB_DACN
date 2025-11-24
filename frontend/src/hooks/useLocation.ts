import { useState, useEffect, useCallback } from 'react'

export interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp?: number
}

export interface UseLocationReturn {
  location: LocationData | null
  loading: boolean
  error: string | null
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown'
  requestPermission: (forceRefresh?: boolean) => Promise<void>
  getCurrentLocation: (forceRefresh?: boolean) => Promise<void>
  clearLocation: () => void
  setLocation: (lat: number, lng: number) => void
}

/**
 * Hook để lấy và quản lý vị trí địa lý của người dùng
 */
export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown')

  // Kiểm tra trạng thái quyền geolocation
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPermissionStatus('denied')
      setError('Trình duyệt của bạn không hỗ trợ định vị địa lý')
      return
    }

    // Kiểm tra quyền nếu browser hỗ trợ Permissions API
    if ('permissions' in navigator) {
      // @ts-ignore - Permissions API có thể chưa có type đầy đủ
      navigator.permissions.query({ name: 'geolocation' }).then((result: PermissionStatus) => {
        setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied')
        
        // Lắng nghe thay đổi quyền
        result.onchange = () => {
          setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied')
        }
      }).catch(() => {
        // Nếu không hỗ trợ Permissions API, mặc định là 'prompt'
        setPermissionStatus('prompt')
      })
    } else {
      // Nếu không hỗ trợ Permissions API, mặc định là 'prompt'
      setPermissionStatus('prompt')
    }

    // Lấy vị trí đã lưu từ localStorage
    const savedLocation = localStorage.getItem('user_location')
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation)
        // Nếu có flag forceSet, không kiểm tra timestamp (luôn dùng)
        const isForceSet = parsed.forceSet === true || localStorage.getItem('location_force_set') === 'true'
        
        // Kiểm tra xem vị trí có còn hợp lệ không (không quá 1 giờ) hoặc đã được force set
        if (isForceSet || (parsed.timestamp && Date.now() - parsed.timestamp < 3600000)) {
          console.log('✅ Load location từ localStorage:', parsed)
          setLocation(parsed)
          // Nếu đã có location, set permission status là granted
          if (isForceSet || parsed.timestamp) {
            setPermissionStatus('granted')
          }
        } else {
          console.log('⚠️ Location trong localStorage đã hết hạn (quá 1 giờ)')
          // Xóa location đã hết hạn
          localStorage.removeItem('user_location')
          localStorage.removeItem('location_force_set')
        }
      } catch (e) {
        console.error('Failed to parse saved location:', e)
      }
    } else {
      console.log('⚠️ Không có location trong localStorage')
    }
  }, [])

  // Yêu cầu quyền và lấy vị trí
  const requestPermission = useCallback(async (forceRefresh: boolean = false) => {
    // Nếu không phải force refresh, kiểm tra xem location đã được force set chưa
    if (!forceRefresh) {
      const forceSet = localStorage.getItem('location_force_set')
      if (forceSet === 'true') {
        console.log('⚠️ Location đã được force set, không cho phép GPS override')
        // Vẫn load location từ localStorage
        const savedLocation = localStorage.getItem('user_location')
        if (savedLocation) {
          try {
            const parsed = JSON.parse(savedLocation)
            setLocation(parsed)
            setPermissionStatus('granted')
          } catch (e) {
            console.error('Failed to parse saved location:', e)
          }
        }
        return
      }
    } else {
      // Nếu là force refresh, xóa flag force_set và location cũ để cho phép GPS override
      console.log('🔄 Force refresh GPS - xóa flag location_force_set và location cũ')
      localStorage.removeItem('location_force_set')
      // Xóa location cũ để tránh browser cache
      localStorage.removeItem('user_location')
      // Clear location state để force reload
      setLocation(null)
    }

    if (!('geolocation' in navigator)) {
      setError('Trình duyệt của bạn không hỗ trợ định vị địa lý')
      setPermissionStatus('denied')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Sử dụng watchPosition để lấy nhiều điểm và chọn điểm chính xác nhất
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        let bestPosition: GeolocationPosition | null = null
        let bestAccuracy = Infinity
        let positionCount = 0
        const maxPositions = 5 // Lấy tối đa 5 điểm
        const maxWaitTime = 25000 // Chờ tối đa 25 giây
        
        const startTime = Date.now()
        
        // Sử dụng watchPosition để lấy nhiều điểm và chọn điểm tốt nhất
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            positionCount++
            const accuracy = pos.coords.accuracy || Infinity
            const elapsed = Date.now() - startTime
            
            // Lưu điểm tốt nhất (accuracy nhỏ nhất = chính xác nhất)
            if (accuracy < bestAccuracy) {
              bestPosition = pos
              bestAccuracy = accuracy
              console.log(`📍 GPS update #${positionCount}: accuracy = ${accuracy.toFixed(2)}m (best so far)`)
            }
            
            // Nếu accuracy < 30m (rất chính xác) hoặc đã lấy đủ điểm, dừng lại
            if (accuracy < 30 || positionCount >= maxPositions) {
              navigator.geolocation.clearWatch(watchId)
              if (bestPosition) {
                console.log(`✅ Chọn GPS tốt nhất: accuracy = ${bestAccuracy.toFixed(2)}m sau ${positionCount} lần đo`)
                resolve(bestPosition)
              } else {
                resolve(pos)
              }
            }
          },
          (err) => {
            navigator.geolocation.clearWatch(watchId)
            // Nếu có lỗi nhưng đã có bestPosition, dùng nó
            if (bestPosition) {
              console.log(`⚠️ GPS error nhưng đã có kết quả tốt nhất: accuracy = ${bestAccuracy.toFixed(2)}m`)
              resolve(bestPosition)
            } else {
              reject(err)
            }
          },
          {
            enableHighAccuracy: true,
            timeout: maxWaitTime,
            maximumAge: 0 // Không dùng cache
          }
        )
        
        // Timeout sau maxWaitTime nếu chưa có kết quả tốt
        setTimeout(() => {
          navigator.geolocation.clearWatch(watchId)
          if (bestPosition) {
            console.log(`⏱️ Timeout - dùng GPS tốt nhất: accuracy = ${bestAccuracy.toFixed(2)}m sau ${positionCount} lần đo`)
            resolve(bestPosition)
          } else {
            // Fallback về getCurrentPosition nếu watchPosition không hoạt động
            console.log('⚠️ watchPosition không có kết quả, fallback về getCurrentPosition')
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: true,
                timeout: 30000, // 30 giây
                maximumAge: 0
              }
            )
          }
        }, maxWaitTime)
      })

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      }

      // Log accuracy để debug
      if (locationData.accuracy) {
        console.log(`📍 GPS cuối cùng: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`)
        console.log(`📍 Độ chính xác: ${locationData.accuracy.toFixed(2)}m`)
        if (locationData.accuracy > 100) {
          console.warn(`⚠️ GPS accuracy khá thấp (${locationData.accuracy.toFixed(2)}m), có thể bị sai lệch khoảng ${(locationData.accuracy / 1000).toFixed(2)}km`)
        } else if (locationData.accuracy > 50) {
          console.warn(`⚠️ GPS accuracy trung bình (${locationData.accuracy.toFixed(2)}m)`)
        } else {
          console.log(`✅ GPS accuracy tốt (${locationData.accuracy.toFixed(2)}m)`)
        }
      }

      setLocation(locationData)
      setPermissionStatus('granted')
      
      // Lưu vào localStorage
      localStorage.setItem('user_location', JSON.stringify(locationData))
    } catch (err: any) {
      let errorMessage = 'Không thể lấy vị trí của bạn'
      
      if (err.code === 1) {
        errorMessage = 'Bạn đã từ chối quyền truy cập vị trí'
        setPermissionStatus('denied')
      } else if (err.code === 2) {
        errorMessage = 'Không thể xác định vị trí của bạn'
      } else if (err.code === 3) {
        errorMessage = 'Yêu cầu vị trí đã hết thời gian chờ'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Lấy vị trí hiện tại (không yêu cầu quyền nếu đã có)
  const getCurrentLocation = useCallback(async (forceRefresh: boolean = false) => {
    if (permissionStatus === 'denied') {
      setError('Bạn đã từ chối quyền truy cập vị trí. Vui lòng cấp quyền trong cài đặt trình duyệt.')
      return
    }

    await requestPermission(forceRefresh)
  }, [permissionStatus, requestPermission])

  // Xóa vị trí đã lưu
  const clearLocation = useCallback(() => {
    setLocation(null)
    localStorage.removeItem('user_location')
  }, [])

  // Set vị trí thủ công
  const setLocationManual = useCallback((lat: number, lng: number) => {
    console.log('🔧 setLocationManual được gọi với:', lat, lng)
    const locationData: LocationData = {
      latitude: lat,
      longitude: lng,
      timestamp: Date.now()
    }
    console.log('💾 Đang lưu location vào localStorage:', locationData)
    localStorage.setItem('user_location', JSON.stringify(locationData))
    console.log('✅ Đã lưu vào localStorage')
    
    // Force update location state
    setLocation(prev => {
      console.log('🔄 setLocation được gọi, prev location:', prev)
      console.log('🔄 New location:', locationData)
      return locationData
    })
    console.log('✅ Đã gọi setLocation với:', locationData)
  }, [])

  return {
    location,
    loading,
    error,
    permissionStatus,
    requestPermission,
    getCurrentLocation,
    clearLocation,
    setLocation: setLocationManual
  }
}

