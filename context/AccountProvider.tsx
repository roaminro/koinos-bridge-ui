import React, { useContext, useState, createContext, useEffect, useRef } from 'react'
import * as kondor from 'kondor-js'
import KoinosWallet from '@roamin/koinos-wallet-sdk'
import { Signer } from 'koilib'

const LOCAL_STORAGE_KEY = 'ACCOUNT'

type AccountContextType = {
  account?: string;
  isLoading: boolean;
  isConnecting: boolean;
  connectedWithKondor: boolean;
  connectWithKondor: () => Promise<boolean>;
  connectWithKoinosWallet: () => Promise<boolean>;
  getSigner: (signerAddress: string) => Signer | undefined
};

export const AccountContext = createContext<AccountContextType>({
  isConnecting: false,
  isLoading: true,
  connectedWithKondor: false,
  connectWithKondor: async () => false,
  connectWithKoinosWallet: async () => false,
  getSigner: () => undefined,
})

export const useAccount = () => useContext(AccountContext)

export const AccountProvider = ({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [connectedWithKondor, setConnectedWithKondor] = useState(false)

  const [account, setAccount] = useState<string | undefined>(undefined)
  const koinosWallet = useRef<KoinosWallet>()

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      let parsed = JSON.parse(saved)
      setAccount(parsed.account)
      setConnectedWithKondor(parsed.connectedWithKondor)
    }
  }, [])

  useEffect(() => {
    const kw = new KoinosWallet('https://koinos-wallet.vercel.app/embed/wallet-connector')
    koinosWallet.current = kw

    const setup = async () => {
      await koinosWallet.current?.connect()
      setIsLoading(false)
    }

    setup()

    return (() => {
      kw.close()
    })
  }, [])

  useEffect(() => {
    if (!account) return
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      account,
      connectedWithKondor
    }))
  }, [account, connectedWithKondor])

  const connectWithKondor = async () => {
    setIsConnecting(true)
    // @ts-ignore getAccounts returns objects, not strings
    const [{ address }] = await Promise.race([
      kondor.getAccounts(),
      new Promise<{ address: string }[]>((resolve) => setTimeout(() => resolve([{ address: '' }]), 10000))
    ])
    if (address) {
      setAccount(address)
      setConnectedWithKondor(true)
    }
    setIsConnecting(false)

    return !!address
  }

  const connectWithKoinosWallet = async () => {
    setIsConnecting(true)

    let result = false
    try {
      const accounts = await koinosWallet.current!.getAccounts()
      if (accounts.length) {
        result = true
        setAccount(accounts[0].address)
      } 
    } catch (error) {

    }
      
    setIsConnecting(false)

    return result
  }

  const getSigner = (signerAddress: string) => {
    if (connectedWithKondor) {
      return kondor.getSigner(signerAddress) as Signer
    } else {
      return koinosWallet.current?.getSigner(signerAddress) as Signer
    }
  }

  return (
    <AccountContext.Provider value={{
      account,
      isConnecting,
      isLoading,
      connectedWithKondor,
      connectWithKondor,
      connectWithKoinosWallet,
      getSigner
    }}>
      {children}
    </AccountContext.Provider>
  )
}