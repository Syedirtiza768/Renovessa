"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {}
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    setOpen(false);
    if (n.actionUrl) router.push(n.actionUrl);
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); if (!open) fetchNotifications(); }}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-copper text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-rule bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs text-copper hover:underline"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted">No notifications</li>
            ) : (
              notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`w-full px-4 py-3 text-left hover:bg-cream transition ${!n.read ? "bg-blueprint" : ""}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-copper" />
                      )}
                      <div className={!n.read ? "" : "ml-4"}>
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                        <p className="mt-0.5 text-xs text-muted leading-snug">{n.message}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
