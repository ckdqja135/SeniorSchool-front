import "@/styles/globals.css";
import AdminHeader from "@/components/feature/admin/Header";
import React from "react";

export const metadata = {
  title: "Admin",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <AdminHeader />
      <div className='admin-layout relative flex h-screen flex-col'>
        {children}
      </div>
    </div>
  );
}
