export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">{children}</div>
    </div>
  )
}
