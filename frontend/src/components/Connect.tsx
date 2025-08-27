import { useAccount, useConnect, useDisconnect, usePublicClient } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Address } from 'viem'
import styles from "../styles/connect.module.css"
import metamask from '../images/metamask.png'
import disconnectLogo from '../images/disconnect.png'



export default function Connect() {
  const { isConnected, address } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [open, setOpen] = useState(false)

  // Fermer le dropdown si clic à l’extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isOutsideContainer = !target.closest(`.${styles.connectContainer}`);
      const isOutsideDropdown = !target.closest(`.${styles.dropMenu}`);
      if (isOutsideContainer && isOutsideDropdown) {
        setOpen(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  

  const btnClass = isConnected
    ? `${styles.btnConnect} ${styles.connected}`
    : styles.btnConnect

if (!isConnected) {
  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className={btnClass}
      style={{
        position: 'relative', // nécessaire pour z-index
        zIndex: 10000,        // supérieur à l’overlay
      }}
    >
      <img src={metamask} alt="Logo" className={styles.metamaskConnectLogo}/>
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}


  return (
    <div className={styles.connectContainer}>
      <button
        onClick={() => setOpen(!open)}
        className={btnClass}
      >
        <img src={metamask} alt="Logo" className={styles.metamaskConnectLogo}/>
        <span className={styles.addressWallet}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
      </button>

      {open && createPortal(
        <>
          {/* Overlay flou pour le reste de la page */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              zIndex: 9998,
            }}
          />
          {/* Dropdown */}
          <div
            className={styles.dropMenu}
            style={{
              position: 'fixed',
              top: '90px',
              right: '33px',
              zIndex: 9999,
              maxWidth: '350px',
            }}
          >
            <div className={styles.dropMenuContainer}>
              {address && <WalletTokens address={address} />}
              <button
                onClick={() => { disconnect(); setOpen(false) }}
                className={styles.disconnectBtn}
              >
                Disconnect
                <img src={disconnectLogo} alt="Logo"  className={styles.logoDisconnect}/>

              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
