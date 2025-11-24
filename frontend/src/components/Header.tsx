import React from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
// Đã xóa import 'lucide-react' để tránh lỗi biên dịch

// Component SVG inline thay thế cho ShoppingCart
const ShoppingCartIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.72a2 2 0 0 0 2-1.58L23 6H6" />
    </svg>
);


export default function Header(){
    const { user, logout, isAuthenticated } = useAuthContext();
    return (
        <header className="bg-white shadow-md sticky top-0 z-10">
            <div className="container mx-auto px-4 flex items-center justify-between py-4">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <Link to="/" className="flex items-center gap-2">
                        {/* Biểu tượng Grab Green (dùng màu 700) */}
                        <div className="w-8 h-8 rounded-full bg-grabGreen-700 shadow-md flex items-center justify-center">
                            <span className="text-white font-black text-sm">FF</span>
                        </div>
                        <div className="text-xl font-bold text-gray-800">Fast Food</div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex space-x-6 text-sm font-medium text-gray-600">
                    <Link to="/" className="hover:text-grabGreen-700 transition duration-150">Trang chủ</Link>

                    {user?.role === "merchant" && (
                        <Link to="/merchant/dashboard" className="hover:text-grabGreen-700 transition duration-150">Quản lý Cửa hàng</Link>
                    )}
                    {user?.role === "shipper" && (
                        <Link to="/shipper" className="hover:text-grabGreen-700 transition duration-150">Quản lý Đơn hàng</Link>
                    )}
                    {(!user || user.role === "customer") && (
                        <>
                            <Link to="/customer" className="hover:text-grabGreen-700 transition duration-150">Menu</Link>
                            <Link to="/stores" className="hover:text-grabGreen-700 transition duration-150">Cửa hàng</Link>
                            <Link to="/customer/orders" className="hover:text-grabGreen-700 transition duration-150">Đơn hàng</Link>
                            <Link to="/profile" className="hover:text-grabGreen-700 transition duration-150">Hồ sơ</Link>
                            <Link to="/merchant/register" className="hover:text-grabGreen-700 transition duration-150">Đăng ký cửa hàng</Link>
                        </>
                    )}
                    {user?.role === "merchant" && (
                        <>
                            <Link to="/merchant/dashboard" className="hover:text-grabGreen-700 transition duration-150">Tổng quan</Link>
                            <Link to="/merchant/menu" className="hover:text-grabGreen-700 transition duration-150">Quản lý Menu</Link>
                            <Link to="/merchant/revenue" className="hover:text-grabGreen-700 transition duration-150">Doanh thu</Link>
                        </>
                    )}
                    {user?.role === "shipper" && (
                        <>
                            <Link to="/shipper/revenue" className="hover:text-grabGreen-700 transition duration-150">Doanh thu</Link>
                            <Link to="/shipper/profile" className="hover:text-grabGreen-700 transition duration-150">Hồ sơ</Link>
                        </>
                    )}
                    {user?.role === "admin" && (
                        <Link to="/admin" className="hover:text-grabGreen-700 transition duration-150">Quản trị</Link>
                    )}
                </nav>

                {/* User Actions */}
                <div className="flex items-center gap-4">
                    <Link to="/cart" className="p-2 rounded-full hover:bg-grabGreen-50 transition duration-150 text-gray-600 hover:text-grabGreen-700">
                        <ShoppingCartIcon className="w-5 h-5" /> 
                    </Link>

                    {isAuthenticated && user ? (
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-medium text-gray-700 hidden sm:block">{user.name || user.email}</div>
                            {/* Nút Đăng xuất - Màu Xanh Grab */}
                            <button 
                                onClick={logout} 
                                className="px-4 py-2 text-sm bg-grabGreen-700 text-white rounded-full font-medium hover:bg-grabGreen-800 transition duration-150 shadow-md"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Link 
                                to="/login" 
                                className="px-4 py-2 text-sm border border-gray-300 rounded-full font-medium text-gray-700 hover:bg-gray-50 transition duration-150"
                            >
                                Đăng nhập
                            </Link>
                            <Link 
                                to="/register" 
                                className="px-4 py-2 text-sm bg-grabGreen-700 text-white rounded-full font-medium hover:bg-grabGreen-800 transition duration-150 shadow-md"
                            >
                                Đăng ký
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
