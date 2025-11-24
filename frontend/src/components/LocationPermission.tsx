import React from 'react'
import { useLocation } from '../hooks/useLocation'
import { useLocationContext } from '../context/LocationContext'

interface LocationPermissionProps {
  onLocationGranted?: (location: { latitude: number; longitude: number }) => void
  showOnlyWhenDenied?: boolean
  className?: string
}

/**
 * Component để yêu cầu quyền truy cập vị trí từ người dùng
 */
export default function LocationPermission({
  onLocationGranted,
  showOnlyWhenDenied = false,
  className = ''
}: LocationPermissionProps) {
  const {
    location,
    loading,
    error,
    permissionStatus,
    requestPermission,
    getCurrentLocation,
    setLocation: setLocationManual
  } = useLocation()
  
  const { address, setAddress, isFetchingAddress, addressFetchFailed } = useLocationContext()
  const [isEditingAddress, setIsEditingAddress] = React.useState(false)
  const [editedAddress, setEditedAddress] = React.useState('')
  const [isGeocoding, setIsGeocoding] = React.useState(false)

  // Nếu đã có vị trí, gọi callback
  React.useEffect(() => {
    if (location && onLocationGranted) {
      onLocationGranted({
        latitude: location.latitude,
        longitude: location.longitude
      })
    }
  }, [location, onLocationGranted])

  // Nếu showOnlyWhenDenied và quyền chưa bị từ chối, không hiển thị
  if (showOnlyWhenDenied && permissionStatus !== 'denied') {
    return null
  }

  // Khởi tạo editedAddress khi có address
  React.useEffect(() => {
    if (address && !editedAddress) {
      setEditedAddress(address)
    }
  }, [address, editedAddress])

  // Hàm force set tọa độ Biên Hòa trực tiếp (không cần geocoding)
  const forceSetBienHoaLocation = () => {
    const bienHoaLat = 11.318067
    const bienHoaLng = 106.050355
    const bienHoaAddress = 'Gần KCN Hố Nai, Biên Hòa, Đồng Nai'
    
    console.log('🔧 Force set tọa độ Biên Hòa:', bienHoaLat, bienHoaLng)
    
    // Lưu vào localStorage TRƯỚC (quan trọng!)
    const newLocationData = {
      latitude: bienHoaLat,
      longitude: bienHoaLng,
      timestamp: Date.now(), // Đảm bảo timestamp mới để không bị coi là hết hạn
      forceSet: true // Flag để đánh dấu đã force set, không cho override
    }
    localStorage.setItem('user_location', JSON.stringify(newLocationData))
    console.log('✅ Đã lưu tọa độ Biên Hòa vào localStorage:', newLocationData)
    
    // Set address vào localStorage
    localStorage.setItem('user_address', bienHoaAddress)
    console.log('✅ Đã lưu địa chỉ vào localStorage:', bienHoaAddress)
    
    // Set flag để không cho GPS override
    localStorage.setItem('location_force_set', 'true')
    
    // Cập nhật location state (sau khi đã lưu localStorage)
    setLocationManual(bienHoaLat, bienHoaLng)
    
    // Set address state
    setAddress(bienHoaAddress)
    setIsEditingAddress(false)
    
    // Reload ngay lập tức (không cần delay vì đã lưu vào localStorage)
    console.log('🔄 Reload trang với tọa độ Biên Hòa đã force set')
    window.location.reload()
  }

  // Hàm lấy tọa độ từ địa chỉ (forward geocoding) - tự động thử với các địa chỉ đơn giản hơn nếu không tìm thấy
  const geocodeAddress = async (addressText: string) => {
    setIsGeocoding(true)
    console.log('🔍 Đang tìm tọa độ cho địa chỉ:', addressText)
    
    // Danh sách các địa chỉ để thử (từ chi tiết đến đơn giản)
    const addressesToTry: string[] = [
      addressText.trim(), // Thử địa chỉ gốc trước
    ]
    
    // Nếu địa chỉ có số nhà, thử bỏ số nhà
    const addressWithoutNumber = addressText.replace(/^\d+\/[^,]*,\s*/i, '').trim()
    if (addressWithoutNumber !== addressText.trim()) {
      addressesToTry.push(addressWithoutNumber)
    }
    
    // Thử với các phần đơn giản hơn
    const parts = addressText.split(',').map(p => p.trim()).filter(p => p)
    if (parts.length > 2) {
      // Bỏ phần đầu (số nhà, tên đường)
      addressesToTry.push(parts.slice(1).join(', '))
    }
    if (parts.length > 1) {
      // Chỉ lấy phần cuối (phường, thành phố)
      addressesToTry.push(parts.slice(-2).join(', '))
    }
    // Thử với "Biên Hòa, Đồng Nai" nếu có Biên Hòa hoặc Hố Nai (Hố Nai là một phần của Biên Hòa)
    const addressLower = addressText.toLowerCase()
    if (addressLower.includes('biên hòa') || addressLower.includes('bien hoa') || 
        addressLower.includes('hố nai') || addressLower.includes('ho nai') ||
        addressLower.includes('dong nai') || addressLower.includes('đồng nai')) {
      addressesToTry.push('Biên Hòa, Đồng Nai')
      addressesToTry.push('Phường Long Bình, Biên Hòa, Đồng Nai')
      addressesToTry.push('Bien Hoa, Dong Nai') // Thử không dấu
      addressesToTry.push('Bien Hoa') // Chỉ tên thành phố
      if (addressLower.includes('hố nai') || addressLower.includes('ho nai')) {
        addressesToTry.push('Hố Nai, Biên Hòa, Đồng Nai')
        addressesToTry.push('Ho Nai, Bien Hoa, Dong Nai')
      }
    }
    
    // Loại bỏ trùng lặp
    const uniqueAddresses = Array.from(new Set(addressesToTry))
    console.log('🔍 Sẽ thử các địa chỉ:', uniqueAddresses)
    
    for (const addressToTry of uniqueAddresses) {
      try {
        console.log(`🔍 Đang thử tìm với địa chỉ: "${addressToTry}"`)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressToTry)}&limit=1&accept-language=vi&countrycodes=vn`,
          {
            headers: {
              'User-Agent': 'FastFoodApp/1.0'
            }
          }
        )
        const data = await response.json()
        console.log(`📍 Kết quả geocoding cho "${addressToTry}":`, data)
        
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat)
          const lng = parseFloat(data[0].lon)
          console.log('✅ Tìm thấy tọa độ:', lat, lng, 'từ địa chỉ:', addressToTry)
          
          if (!isNaN(lat) && !isNaN(lng)) {
            // Cập nhật location trước
            console.log('🔄 Đang cập nhật location từ', location?.latitude, location?.longitude, 'sang', lat, lng)
            
            // Lưu trực tiếp vào localStorage trước
            const newLocationData = {
              latitude: lat,
              longitude: lng,
              timestamp: Date.now()
            }
            localStorage.setItem('user_location', JSON.stringify(newLocationData))
            console.log('✅ Đã lưu location mới vào localStorage:', newLocationData)
            
            // Gọi setLocationManual để cập nhật state
            setLocationManual(lat, lng)
            
            // Đợi một chút để đảm bảo location đã được cập nhật
            await new Promise(resolve => setTimeout(resolve, 300))
            
            // Kiểm tra lại location đã được cập nhật chưa
            const savedLocation = localStorage.getItem('user_location')
            if (savedLocation) {
              const parsed = JSON.parse(savedLocation)
              console.log('✅ Location đã được lưu trong localStorage:', parsed)
              if (Math.abs(parsed.latitude - lat) < 0.0001 && Math.abs(parsed.longitude - lng) < 0.0001) {
                console.log('✅ Location đã được cập nhật đúng!')
              } else {
                console.error('❌ Location chưa được cập nhật đúng!', parsed, 'Expected:', lat, lng)
              }
            } else {
              console.error('❌ Location không được lưu vào localStorage!')
            }
            
            // Clear address cũ để trigger reverse geocoding lại với tọa độ mới
            setAddress(null)
            
            // Set address mới (dùng địa chỉ gốc mà người dùng nhập)
            setAddress(addressText.trim())
            setIsEditingAddress(false)
            console.log('✅ Đã cập nhật địa chỉ:', addressText.trim())
            
            // Reload sau 1.5 giây để đảm bảo location đã được lưu
            setTimeout(() => {
              console.log('🔄 Reload trang để cập nhật UI với tọa độ mới')
              window.location.reload()
            }, 1500)
            
            setIsGeocoding(false)
            return true
          }
        }
        
        // Đợi một chút trước khi thử địa chỉ tiếp theo (để tránh rate limit)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`❌ Lỗi khi geocode "${addressToTry}":`, error)
        // Tiếp tục thử địa chỉ tiếp theo
      }
    }
    
    // Nếu không tìm thấy với bất kỳ địa chỉ nào, dùng tọa độ mặc định của Biên Hòa
    const addressLowerFallback = addressText.toLowerCase()
    if (addressLowerFallback.includes('biên hòa') || addressLowerFallback.includes('bien hoa') || 
        addressLowerFallback.includes('hố nai') || addressLowerFallback.includes('ho nai') ||
        addressLowerFallback.includes('dong nai') || addressLowerFallback.includes('đồng nai')) {
      console.warn('⚠️ Không tìm thấy địa chỉ qua geocoding, dùng tọa độ mặc định của Biên Hòa')
      // Tọa độ mặc định của Biên Hòa (gần KCN Hố Nai)
      const defaultLat = 11.318067
      const defaultLng = 106.050355
      
      console.log('🔄 Đang cập nhật location sang tọa độ mặc định Biên Hòa:', defaultLat, defaultLng)
      
      // Lưu vào localStorage
      const newLocationData = {
        latitude: defaultLat,
        longitude: defaultLng,
        timestamp: Date.now()
      }
      localStorage.setItem('user_location', JSON.stringify(newLocationData))
      setLocationManual(defaultLat, defaultLng)
      
      // Set address
      setAddress(addressText.trim())
      setIsEditingAddress(false)
      
      // Reload sau 1 giây
      setTimeout(() => {
        console.log('🔄 Reload trang với tọa độ mặc định Biên Hòa')
        window.location.reload()
      }, 1000)
      
      setIsGeocoding(false)
      return true
    }
    
    // Nếu không phải Biên Hòa và không tìm thấy
    console.error('❌ Không tìm thấy địa chỉ với bất kỳ cách nào')
    alert(`Không tìm thấy địa chỉ "${addressText}".\n\nVui lòng thử nhập địa chỉ đơn giản hơn:\n- "Biên Hòa, Đồng Nai"\n- "Gần KCN Hố Nai, Biên Hòa"\n- "Phường Long Bình, Biên Hòa, Đồng Nai"`)
    setIsGeocoding(false)
    return false
  }

  // Nếu đã có vị trí, hiển thị thông tin vị trí thay vì form yêu cầu
  if (location && !showOnlyWhenDenied) {
    const handleSaveAddress = async () => {
      if (editedAddress.trim()) {
        // Lấy tọa độ từ địa chỉ mới
        await geocodeAddress(editedAddress.trim())
      }
    }

    const handleCancelEdit = () => {
      setEditedAddress(address || '')
      setIsEditingAddress(false)
    }

    return (
      <div className={`bg-white rounded-xl shadow-lg border border-green-200 p-6 ${className}`}>
        <div className="flex items-start space-x-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {isFetchingAddress ? 'Đang xác định vị trí...' : '✓ Vị trí của bạn đã được xác định'}
              </h3>
              {!isEditingAddress && (
                <button
                  onClick={() => setIsEditingAddress(true)}
                  className="text-sm text-grabGreen-700 hover:text-grabGreen-800 font-medium"
                >
                  Chỉnh sửa địa chỉ
                </button>
              )}
            </div>
            
            {isEditingAddress ? (
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">Địa chỉ của bạn:</label>
                <textarea
                  value={editedAddress}
                  onChange={(e) => setEditedAddress(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-grabGreen-500 focus:border-grabGreen-500 transition duration-150"
                  rows={3}
                  placeholder="Nhập địa chỉ chi tiết (ví dụ: Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố)"
                />
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  💡 Ví dụ: "Gần KCN Hố Nai, Biên Hòa, Đồng Nai" hoặc "Phường Long Bình, Biên Hòa"
                </p>
                <p className="text-xs text-blue-600 mb-3 font-medium">
                  ⚡ Sau khi nhập địa chỉ, nhấn nút bên dưới để hệ thống tự động tìm tọa độ chính xác
                </p>
                <div className="flex space-x-2">
                    <button
                      onClick={async () => {
                        if (!editedAddress.trim()) {
                          alert('Vui lòng nhập địa chỉ!')
                          return
                        }
                        console.log('🔘 Người dùng nhấn "Lưu và tìm vị trí" với địa chỉ:', editedAddress.trim())
                        const success = await handleSaveAddress()
                        if (!success) {
                          console.error('❌ Geocoding thất bại')
                        }
                      }}
                      disabled={isGeocoding}
                      className="px-4 py-2 bg-grabGreen-700 text-white rounded-lg font-medium hover:bg-grabGreen-800 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeocoding ? 'Đang tìm vị trí từ địa chỉ...' : 'Lưu và tìm vị trí từ địa chỉ'}
                    </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition duration-150"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <>
                {isFetchingAddress ? (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      <svg
                        className="animate-spin h-4 w-4 text-grabGreen-700"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Đang lấy địa chỉ từ tọa độ...</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Tọa độ: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                  </div>
                ) : address ? (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Địa chỉ:</p>
                    <p className="text-base font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      📍 {address}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Tọa độ: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                    {/* Kiểm tra xem tọa độ có phải Biên Hòa không */}
                    {!(location.latitude >= 11.0 && location.latitude < 11.5 && location.longitude >= 106.0 && location.longitude < 106.2) && (
                      <div className="mt-3 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
                        <p className="text-sm text-red-800 font-bold mb-2">
                          ⚠️ CẢNH BÁO: Vị trí GPS không chính xác!
                        </p>
                        <p className="text-xs text-red-700 mb-2">
                          <strong>Tọa độ hiện tại:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} 
                          {location.latitude < 11.0 ? ' (TP.HCM)' : ' (Không phải Biên Hòa)'}
                        </p>
                        {address && (
                          <p className="text-xs text-red-700 mb-3">
                            <strong>Địa chỉ hiển thị:</strong> {address}
                          </p>
                        )}
                        <p className="text-xs text-red-800 font-semibold mb-3 bg-red-100 p-2 rounded">
                          ⚠️ Các cửa hàng hiển thị hiện tại sẽ không phải các cửa hàng ở Biên Hòa!
                        </p>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              console.log('🔘 Người dùng nhấn "Force set Biên Hòa"')
                              forceSetBienHoaLocation()
                            }}
                            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition shadow-md"
                          >
                            ✏️ Force set tọa độ Biên Hòa (Không cần tìm kiếm)
                          </button>
                          <p className="text-xs text-red-700 text-center">
                            Hoặc nhấn "Chỉnh sửa địa chỉ" ở góc trên bên phải để nhập địa chỉ thủ công
                          </p>
                        </div>
                      </div>
                    )}
                    {location.latitude >= 11.0 && location.latitude < 11.5 && location.longitude >= 106.0 && location.longitude < 106.2 && (
                      <p className="text-xs text-green-600 mt-2 font-semibold bg-green-50 p-2 rounded border border-green-200">
                        ✅ Vị trí của bạn: Biên Hòa, Đồng Nai. Các cửa hàng hiển thị sẽ là các cửa hàng gần Biên Hòa.
                      </p>
                    )}
                    {!(location.latitude < 11.0 && address && address.toLowerCase().includes('biên hòa')) && (
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Nếu vị trí không chính xác, nhấn "Chỉnh sửa địa chỉ" để nhập lại địa chỉ, hệ thống sẽ tự động tìm lại vị trí
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Vị trí đã được xác định, nhưng không thể lấy địa chỉ tự động. Vui lòng nhập thủ công:
                    </p>
                    <textarea
                      value={editedAddress}
                      onChange={(e) => setEditedAddress(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-grabGreen-500 focus:border-grabGreen-500 transition duration-150"
                      rows={3}
                      placeholder="Nhập địa chỉ chi tiết (ví dụ: Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố)"
                    />
                    <p className="text-xs text-gray-500 mt-1 mb-2">
                      💡 Ví dụ: "Gần KCN Hố Nai, Biên Hòa, Đồng Nai" hoặc "Phường Long Bình, Biên Hòa, Đồng Nai"
                    </p>
                    <p className="text-xs text-blue-600 mb-3 font-medium">
                      ⚡ Sau khi nhập địa chỉ, hệ thống sẽ tự động tìm tọa độ chính xác từ địa chỉ này
                    </p>
                    <button
                      onClick={async () => {
                        if (!editedAddress.trim()) {
                          alert('Vui lòng nhập địa chỉ!')
                          return
                        }
                        console.log('🔘 Người dùng nhấn "Lưu và tìm vị trí" với địa chỉ:', editedAddress.trim())
                        const success = await handleSaveAddress()
                        if (!success) {
                          console.error('❌ Geocoding thất bại')
                        }
                      }}
                      disabled={isGeocoding}
                      className="px-4 py-2 bg-grabGreen-700 text-white rounded-lg font-medium hover:bg-grabGreen-800 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeocoding ? 'Đang tìm vị trí từ địa chỉ...' : 'Lưu và tìm vị trí từ địa chỉ'}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Tọa độ: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Action buttons */}
            {!isEditingAddress && (
              <div className="flex space-x-3">
                <button
                  onClick={() => getCurrentLocation(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Đang cập nhật...' : 'Làm mới vị trí từ GPS'}
                </button>
              </div>
            )}

            {/* Privacy note */}
            <p className="mt-4 text-xs text-gray-500">
              Vị trí của bạn chỉ được sử dụng để cải thiện trải nghiệm đặt hàng và sẽ không được chia sẻ với bên thứ ba.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleRequestLocation = async () => {
    if (permissionStatus === 'denied') {
      // Hướng dẫn người dùng cấp quyền trong cài đặt
      alert(
        'Vui lòng cấp quyền truy cập vị trí trong cài đặt trình duyệt của bạn:\n\n' +
        'Chrome/Edge: Cài đặt > Quyền riêng tư và bảo mật > Cài đặt trang web > Vị trí\n' +
        'Firefox: Cài đặt > Quyền riêng tư & Bảo mật > Quyền > Vị trí\n' +
        'Safari: Tùy chọn > Quyền riêng tư > Dịch vụ định vị'
      )
    } else {
      await requestPermission()
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-grabGreen-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-grabGreen-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Cho phép truy cập vị trí của bạn
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Chúng tôi cần vị trí của bạn để:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc list-inside">
            <li>Tìm các nhà hàng gần bạn</li>
            <li>Tự động điền địa chỉ giao hàng</li>
            <li>Ước tính thời gian giao hàng chính xác hơn</li>
          </ul>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
              <svg
                className="animate-spin h-4 w-4 text-grabGreen-700"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Đang lấy vị trí...</span>
            </div>
          )}

          {/* Success message with address */}
          {location && !showOnlyWhenDenied && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 mb-1">
                    ✓ Đã lấy vị trí thành công!
                  </p>
                  {address ? (
                    <div>
                      <p className="text-xs text-green-600 mb-1">Địa chỉ của bạn:</p>
                      <p className="text-sm font-semibold text-green-900 bg-white p-2 rounded border border-green-200">
                        📍 {address}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Tọa độ: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-green-600">
                      Đang lấy địa chỉ từ tọa độ...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleRequestLocation}
              disabled={loading}
              className="px-4 py-2 bg-grabGreen-700 text-white rounded-lg font-medium hover:bg-grabGreen-800 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {permissionStatus === 'denied' ? 'Hướng dẫn cấp quyền' : 'Cho phép truy cập vị trí'}
            </button>
            {location && (
              <button
                onClick={() => getCurrentLocation(true)}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Làm mới vị trí
              </button>
            )}
          </div>

          {/* Privacy note */}
          <p className="mt-4 text-xs text-gray-500">
            Vị trí của bạn chỉ được sử dụng để cải thiện trải nghiệm đặt hàng và sẽ không được chia sẻ với bên thứ ba.
          </p>
        </div>
      </div>
    </div>
  )
}
