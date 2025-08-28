import { ConnectButton } from '@rainbow-me/rainbowkit';
import styles from "../styles/connect.module.css";
import wallet from '../images/wallet.png'

function RainbowConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
        return (
          <button
            onClick={() => {
              if (!mounted) return;
              if (!account) return openConnectModal();
              return openAccountModal();
            }}
            className={styles.btnConnect}
          >
             <img
              src={wallet}
              alt="Swap Icon"
              className={styles.walletLogo}
            />
            {account ? `${account.displayName}` : 'Connect Wallet'}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

export default RainbowConnectButton;
