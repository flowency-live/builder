export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout replaces the root layout's main wrapper and footer
  // The Navbar from root layout is still inherited
  return <>{children}</>;
}
