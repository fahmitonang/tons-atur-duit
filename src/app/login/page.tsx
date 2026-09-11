"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      username: username.trim(),
      password,
    });

    if (res?.error) {
      toast.error(res.error);
      setLoading(false);
    } else {
      toast.success("Login berhasil!");
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8 transition-colors">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        {/* App Logo & Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-gray-700/50 flex items-center justify-center p-2.5 border border-blue-100 dark:border-gray-700 shadow-sm">
            <Image
              src="/icon.png"
              alt="Logo Atur Duit"
              width={48}
              height={48}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Atur Duit
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Masuk untuk mengelola keuangan dan budget bulanan Anda
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Masukkan username"
                className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-400 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? "Memproses..." : "Masuk ke Akun"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
          Belum memiliki akun?{" "}
          <Link href="/register" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Daftar Sekarang
          </Link>
        </div>
      </div>

      {/* App Version Footer */}
      <footer className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
        <p className="font-semibold tracking-wide">Atur Duit v1.1.0</p>
        <p className="text-[11px] text-gray-400/80 dark:text-gray-600">Financial Intelligence Edition</p>
      </footer>
    </div>
  );
}
