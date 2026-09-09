"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Wallet,
  User,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  ShieldCheck,
  RefreshCw,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Bot Protection States
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [registrationAllowed, setRegistrationAllowed] = useState<boolean | null>(null);

  const router = useRouter();

  // Ambil soal captcha dan status izin pendaftaran saat komponen dimuat
  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch("/api/captcha");
      const data = await res.json();
      if (data.registrationAllowed === false) {
        setRegistrationAllowed(false);
      } else {
        setRegistrationAllowed(true);
        setCaptchaQuestion(data.question || "");
        setCaptchaToken(data.token || "");
        setCaptchaAnswer("");
      }
    } catch {
      toast.error("Gagal memuat verifikasi keamanan");
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("Username wajib diisi");
      return;
    }

    if (password.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }

    if (!captchaAnswer.trim()) {
      toast.error("Silakan jawab pertanyaan keamanan terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          email: email.trim() || undefined,
          password,
          captchaAnswer: captchaAnswer.trim(),
          captchaToken,
          honeypot,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Akun berhasil dibuat! Silakan masuk.");
        router.push("/login");
      } else {
        toast.error(data.message || "Pendaftaran gagal");
        // Segarkan captcha jika gagal agar token tidak kedaluwarsa
        fetchCaptcha();
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // Tampilan jika pendaftaran ditutup oleh admin
  if (registrationAllowed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8 transition-colors">
        <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
              Pendaftaran Ditutup
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Pendaftaran akun baru saat ini dinonaktifkan oleh administrator.
              Silakan hubungi pengelola sistem atau login jika Anda sudah memiliki akun.
            </p>
          </div>
          <Link
            href="/login"
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Halaman Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8 transition-colors">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Daftar Akun Baru
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Buat akun untuk memulai pencatatan keuangan di Atur Duit
            </p>
          </div>
        </div>

        {/* Register Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Honeypot Field (Tersembunyi, jebakan untuk bot) */}
          <input
            type="text"
            name="user_system_website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{
              opacity: 0,
              position: "absolute",
              top: 0,
              left: 0,
              height: 0,
              width: 0,
              zIndex: -1,
              pointerEvents: "none",
            }}
          />

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Nama Anda"
                className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-400 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="pilih_username (untuk login)"
                className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-400 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, ""))
                }
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Digunakan sebagai ID saat login</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Alamat Email <span className="text-xs font-normal text-gray-400">(Opsional)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-400 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Password (minimal 8 karakter) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-400 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Verifikasi Keamanan (Math Challenge Captcha) */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-650 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-4 h-4" />
                Verifikasi Keamanan (Anti-Bot)
              </span>
              <button
                type="button"
                onClick={fetchCaptcha}
                disabled={captchaLoading}
                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                title="Ganti pertanyaan"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${captchaLoading ? "animate-spin" : ""}`} />
                <span>Ganti</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-gray-900 dark:text-white select-none whitespace-nowrap shadow-2xs">
                {captchaQuestion || "Memuat soal..."}
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                placeholder="Jawaban"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-400 text-gray-900 dark:text-white rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name || !username || !password || !captchaAnswer}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? "Mendaftarkan..." : "Daftar Akun"}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
          Sudah memiliki akun?{" "}
          <Link href="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
