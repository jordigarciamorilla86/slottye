import Link from "next/link";
export function Header(){ return <header className="shell header"><Link className="logo" href="/">Slot<span>ty</span></Link><nav className="nav"><Link className="btn secondary" href="/login">Para negocios</Link><Link className="btn primary" href="/login">Entrar</Link></nav></header> }
