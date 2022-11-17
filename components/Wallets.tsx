import { ConnectButton } from '@rainbow-me/rainbowkit'
import Section from './Section'
import WalletConnector from './KondorConnector'

export default function Wallets() {

  return (
    <Section heading="1. Connect your wallets">
      Ethereum Wallet:
      <ConnectButton />
      <br />
      Koinos Wallet:
      <br />
      <WalletConnector />
    </Section>
  )
}