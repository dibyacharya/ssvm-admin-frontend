import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

// Carousel images
const carouselImages = [
  "/image3.jpg",
  "/image4.jpg",
  "/image5.jpg"
];

const Login = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Preload images
  useEffect(() => {
    carouselImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % carouselImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const result = await login(formData);
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col lg:flex-row font-sans">
      {/* Left side - Image and Welcome Text */}
      <div className="relative hidden lg:flex w-full lg:w-1/2 items-end justify-center p-12 bg-gradient-to-r from-green-700 to-green-700 bg-cover bg-center overflow-hidden">
        {/* Carousel Images */}
        {carouselImages.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Carousel ${index + 1}`}
            className="absolute inset-0 object-cover w-full h-full transition-opacity duration-1000 ease-in-out"
            style={{
              opacity: index === currentImageIndex ? 0.4 : 0,
              zIndex: 0
            }}
            onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/1000x1200/111827/ffffff?text=Campus'; }}
          />
        ))}
         <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute z-10 text-white top-5 left-10 "
        >
          <img src="/logo_full.png" alt="" className="h-12" />
        
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 text-white top-[-50%] left-[-10%]"
        >
          <h2 className="text-4xl font-bold leading-tight mb-3 ">
            Empowering Minds, <br /> One Login at a Time.
          </h2>
          <p className="text-lg text-gray-100">
            Welcome to the future of learning with OneCampus.
          </p>
          <div className="mt-2 flex gap-2">
            {carouselImages.map((_, index) => (
              <div
                key={index}
                className={`h-4 rounded-full bg-white transition-all duration-300 ${
                  index === currentImageIndex ? "w-8" : "w-4"
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="text-left mb-10">
            <h1 className="text-4xl font-bold text-gray-800">
              KIITX ADMIN
            </h1>
            <p className="text-gray-500 mt-2">Welcome back! Please sign in to your account.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                User ID
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Mail
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  required
                  className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  placeholder="Enter User ID"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-500">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                 <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Lock
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="block w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white transition-all duration-300 ease-in-out transform hover:scale-105 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              }`}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Demo Info */}
         
        </div>
      </div>
    </div>
  );
};

export default Login;
