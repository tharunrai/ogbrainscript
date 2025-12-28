"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navLinkClass = (path) =>
    `hover:text-blue-600 transition ${
      pathname === path ? "text-blue-600 font-semibold" : "text-gray-700"
    }`;

  return (
    <nav className="bg-linear-to-br from-blue-200 via-indigo-200 to-purple-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-12 overflow-x-auto no-scrollbar">
          <div className="flex gap-6 font-medium whitespace-nowrap mx-auto md:mx-0">
            <Link href="/home" className={navLinkClass("/home")}>
              Home
            </Link>
            <Link href="/feed" className={navLinkClass("/feed")}>
              Feed
            </Link>
            <Link href="/playlist" className={navLinkClass("/playlist")}>
              Playlist
            </Link>
            <Link href="/learning" className={navLinkClass("/learning")}>
              My Learning
            </Link>
            <Link href="/dashboard" className={navLinkClass("/dashboard")}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
