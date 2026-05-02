"use client";

import Link from "next/link";
import { motion } from "motion/react";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { brand } from "@/lib/brand";
import { GlobalSearch } from "./global-search";

import { LogOut, Settings } from "lucide-react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function TeacherTopBar() {
  const { logout, user } = useAuth();
  
  return (
    <motion.header
      className="sticky top-0 z-40 bg-white/95 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-md"
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
    >
      <div className="mx-auto flex max-w-[1920px] items-center justify-between px-4 py-3 sm:px-6 lg:px-[40px]">
        <Link href="/dashboard/teacher/overview" className="inline-flex items-center">
          <motion.div
            className="flex items-center gap-2 select-none"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <Image
              src={brand.logoSrc}
              alt={brand.fullName}
              width={140}
              height={45}
              className="h-auto w-[120px] object-contain sm:w-[140px]"
              priority
            />
          </motion.div>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex px-8">
          <GlobalSearch />
        </div>

        {user && (
          <div className="flex items-center gap-4">
            {/* Settings Link */}
            <Link 
              href="/dashboard/teacher/settings"
              className="group flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-[#925fe2]"
            >
              <Settings className="h-5 w-5" />
            </Link>

            {/* Name & email */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[14px] font-semibold text-black">{user.name}</span>
              <span className="text-[12px] text-black/50">{user.email}</span>
            </div>
            {/* Avatar with purple ring */}
            <Link href="/dashboard/teacher/profile" className="group relative h-10 w-10 shrink-0">
              <div className="absolute inset-0 rounded-full bg-[#925fe2] p-[2px]">
                <div className="h-full w-full overflow-hidden rounded-full bg-[#38c1ff]">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={user.name ?? "avatar"}
                      src={user.image}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-white">
                      {(user.name ?? "T").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </Link>
            <motion.button
              onClick={() => logout()}
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg 
                className="h-4 w-4" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </motion.button>
          </div>
        )}
      </div>
    </motion.header>
  );
}
