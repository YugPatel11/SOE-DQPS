import AdminSidebar from "@/components/shared/AdminSidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full bg-slate-950">
      <AdminSidebar />
      <div className="lg:pl-64 h-full">
        <main className="h-full overflow-y-auto">
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto h-full animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
