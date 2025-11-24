import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import './index.css'

import Home from './pages/Home'
import CustomerApp from './pages/CustomerApp'
import CustomerOrders from './pages/CustomerOrders'
import Merchant from './pages/Merchant'
import ShipperApp from './pages/ShipperApp'
import Cart from './pages/Cart'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import PaymentMethods from './pages/PaymentMethods'
import PaymentCard from './pages/PaymentCard'
import VerifyOTP from './pages/VerifyOTP'
import OtpSuccess from './pages/OtpSuccess'
import Checkout from './pages/Checkout'
import OrderDetail from './pages/OrderDetail'
import ReviewOrder from './pages/ReviewOrder'
import ComplaintForm from './pages/ComplaintForm'
import StoreDiscovery from './pages/StoreDiscovery'
import RestaurantDetail from './pages/RestaurantDetail'
import AdminHome from './pages/AdminHome'
import UserManagement from './pages/Admin/UserManagement'
import ShipperRevenue from './pages/ShipperRevenue'
import ShipperProfile from './pages/ShipperProfile'
import Profile from './pages/Profile'

import MerchantDashboard from './pages/Merchant/MerchantDashboard'
import MerchantConfirmOrder from './pages/Merchant/MerchantConfirmOrder'
import RegisterStore from './pages/Merchant/RegisterStore'
import MerchantMenu from './pages/Merchant/MerchantMenu'
import MerchantRevenue from './pages/Merchant/MerchantRevenue'
import Inventory from './pages/Merchant/Inventory'
import Complaints from './pages/Merchant/Complaints'
import InventoryManagement from './pages/Merchant/InventoryManagement'
import ComplaintsManagement from './pages/Merchant/ComplaintsManagement'
import HandleOutOfStock from './pages/Merchant/HandleOutOfStock'
import RefundManagement from './pages/Merchant/RefundManagement'

import ProtectedRoute from './components/ProtectedRoute'
import RoleGate from './components/RoleGate'

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="container py-6">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route 
            path="/customer" 
            element={
              <ProtectedRoute>
                <CustomerApp />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/customer/orders" 
            element={
              <ProtectedRoute>
                <CustomerOrders />
              </ProtectedRoute>
            } 
          />

          {/* đăng ký cửa hàng */}
          <Route path="/merchant/register" element={<RegisterStore />} />

          {/* trang merchant chính (nếu bạn vẫn muốn giữ /merchant riêng) */}
          <Route path="/merchant" element={<Merchant />} />

          {/* dashboard merchant có bảo vệ */}
          <Route
            path="/merchant/dashboard"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <MerchantDashboard />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* confirm order */}
          <Route
            path="/merchant/orders/:orderId/confirm"
            element={<MerchantConfirmOrder />}
          />

          {/* merchant menu management */}
          <Route
            path="/merchant/menu"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <MerchantMenu />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* merchant revenue */}
          <Route
            path="/merchant/revenue"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <MerchantRevenue />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* merchant inventory */}
          <Route
            path="/merchant/inventory"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <Inventory />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* merchant complaints */}
          <Route
            path="/merchant/complaints"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <Complaints />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* merchant inventory */}
          <Route
            path="/merchant/inventory"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <InventoryManagement />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* merchant complaints */}
          <Route
            path="/merchant/complaints"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <ComplaintsManagement />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* merchant handle out of stock */}
          <Route
            path="/merchant/orders/:orderId/handle-out-of-stock"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <HandleOutOfStock />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* merchant refund */}
          <Route
            path="/merchant/orders/:orderId/refund"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <RefundManagement />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          <Route 
            path="/shipper" 
            element={
              <ProtectedRoute>
                <RoleGate allow={['shipper', 'admin']}>
                  <ShipperApp />
                </RoleGate>
              </ProtectedRoute>
            } 
          />

          <Route
            path="/shipper/revenue"
            element={
              <ProtectedRoute>
                <RoleGate allow={['shipper', 'admin']}>
                  <ShipperRevenue />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          <Route
            path="/shipper/profile"
            element={
              <ProtectedRoute>
                <RoleGate allow={['shipper', 'admin']}>
                  <ShipperProfile />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          <Route path="/cart" element={<Cart />} />

          <Route 
            path="/checkout" 
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          {/* auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/otp-success" element={<OtpSuccess />} />

          {/* thanh toán */}
          <Route path="/payment" element={<PaymentMethods />} />
          <Route path="/payment/card" element={<PaymentCard />} />

          {/* order detail */}
          <Route 
            path="/orders/:orderId" 
            element={
              <ProtectedRoute>
                <OrderDetail />
              </ProtectedRoute>
            } 
          />

          {/* review order */}
          <Route 
            path="/orders/:orderId/review" 
            element={
              <ProtectedRoute>
                <ReviewOrder />
              </ProtectedRoute>
            } 
          />

          {/* complaint form */}
          <Route 
            path="/orders/:orderId/complaint" 
            element={
              <ProtectedRoute>
                <ComplaintForm />
              </ProtectedRoute>
            } 
          />

          {/* store discovery */}
          <Route path="/stores" element={<StoreDiscovery />} />

          {/* restaurant detail */}
          <Route path="/restaurant/:restaurantId" element={<RestaurantDetail />} />

          {/* admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleGate allow={['admin']}>
                  <AdminHome />
                </RoleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <RoleGate allow={['admin']}>
                  <UserManagement />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* merchant additional routes */}
          <Route
            path="/merchant/inventory"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <Inventory />
                </RoleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/merchant/orders/:orderId/handle-out-of-stock"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <HandleOutOfStock />
                </RoleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/merchant/complaints"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <ComplaintsManagement />
                </RoleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/merchant/orders/:orderId/refund"
            element={
              <ProtectedRoute>
                <RoleGate allow={['merchant', 'admin']}>
                  <RefundManagement />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* admin user management */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <RoleGate allow={['admin']}>
                  <UserManagement />
                </RoleGate>
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}
