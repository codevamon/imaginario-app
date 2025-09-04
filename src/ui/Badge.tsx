export function Badge({ children, color='primary' }:{children:React.ReactNode;color?:'primary'|'success'|'warning'|'danger'|'medium'}) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-${color}`}>{children}</span>;
}