export default function Logo({ compact = false, href, newTab = false }) {
  const content = (
    <>
      <span className="logo-mark"><img src="/pointpoker-logo.png" alt="" /></span>
      {!compact && <span>PointPoker</span>}
    </>
  )

  if (href) {
    return (
      <a className="logo-lockup" href={href} target={newTab ? '_blank' : undefined} rel={newTab ? 'noreferrer' : undefined} aria-label="PointPoker home">
        {content}
      </a>
    )
  }

  return <div className="logo-lockup" aria-label="PointPoker home">{content}</div>
}
