export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Settings sub-navigation lives in the main sidebar (nested under Settings);
  // this layout just passes content through.
  return <div className="w-full">{children}</div>;
}
