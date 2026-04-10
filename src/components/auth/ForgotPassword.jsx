import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, Mail } from "lucide-react";
import { authService } from "../../services/api";

const EMAIL_REGEX = /^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/i;

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await authService.forgotPassword(normalizedEmail);
      setSubmittedEmail(normalizedEmail);
      setSubmitted(true);
    } catch (err) {
      const message =
        err?.response?.data?.message || "Unable to process your request.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToReset = () => {
    navigate(`/reset-password?email=${encodeURIComponent(submittedEmail)}`);
  };

  const handleTryAgain = () => {
    setSubmitted(false);
    setSubmittedEmail("");
    setEmail("");
    setError("");
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-xl bg-white shadow-sm border border-gray-200 p-8">
        {!submitted ? (
          <>
            <h1 className="text-2xl font-bold text-[#1E293B]">
              Forgot Password
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter your registered email to receive a 6-digit OTP.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg text-white font-medium transition ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>

            <p className="mt-6 text-sm text-gray-600 text-center">
              Remembered your password?{" "}
              <Link
                to="/login"
                className="text-emerald-600 hover:text-emerald-500"
              >
                Back to login
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-[#1E293B]">
                Check Your Email
              </h1>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                If an account exists with{" "}
                <span className="font-medium text-gray-800">
                  {submittedEmail}
                </span>
                , a 6-digit OTP has been sent to that email address.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Please check your inbox and spam folder. The OTP will expire in
                10 minutes.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleContinueToReset}
                className="w-full py-3 rounded-lg text-white font-medium transition bg-emerald-600 hover:bg-emerald-700"
              >
                I received the OTP — Continue
              </button>

              <button
                type="button"
                onClick={handleTryAgain}
                className="w-full py-3 rounded-lg font-medium transition border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Try a different email
              </button>
            </div>

            <p className="mt-6 text-sm text-gray-600 text-center">
              Remembered your password?{" "}
              <Link
                to="/login"
                className="text-emerald-600 hover:text-emerald-500"
              >
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
