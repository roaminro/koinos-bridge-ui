import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Dispatch, SetStateAction, useEffect } from 'react'
import { useAccount as useEthereumAccount } from 'wagmi'
import * as kondor from 'kondor-js'
import { Abi } from 'koilib/lib/interface'

import koinosBridgeAbiJson from '../contracts/abi/Koinos-Bridge.json'
import Section from './Section'
import WalletConnector from './KondorConnector'
import { useAccount as useKoinosAccount } from '../context/AccountProvider'
import { chains, State } from '../pages'
import { Signer, Contract } from 'koilib'

const koinosBridgeAbi: Abi = {
  koilib_types: koinosBridgeAbiJson.types,
  ...koinosBridgeAbiJson
}

interface WalletsProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

export default function Wallets({ state, setState }: WalletsProps) {

  const { address: ethereumAddress } = useEthereumAccount()
  const { account: koinosAddress } = useKoinosAccount()

  useEffect(() => {
    setState((state) => {
      const koinosSigner = koinosAddress ? kondor.getSigner(koinosAddress) as Signer : undefined

      const koinosBridgeContract = new Contract({
        id: chains['koinos'].bridgeAddress,
        abi: koinosBridgeAbi,
        provider: state.koinosProvider,
        signer: koinosSigner,
      })

      if (state.chainFrom.id === 'koinos') {
        return {
          ...state,
          recipient: ethereumAddress,
          koinosBridgeContract
        }
      } else if (state.chainFrom.id === 'ethereum') {
        return {
          ...state,
          recipient: koinosAddress,
          koinosBridgeContract
        }
      }

      return state
    })
  }, [ethereumAddress, koinosAddress, setState])

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