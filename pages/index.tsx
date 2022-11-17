import { Box, Flex } from '@chakra-ui/react'
import { utils, Contract, Provider } from 'koilib'
import { Abi } from 'koilib/lib/interface'
import { useState } from 'react'

import Nav from '../components/Nav'
import Chains from '../components/Chains'
import Wallets from '../components/Wallets'
import Assets from '../components/Assets'
import Amount from '../components/Amount'
import Recipient from '../components/Recipient'
import InitiateTransfer from '../components/InitiateTransfer'
import CompleteTransfer from '../components/CompleteTransfer'
import koinosBridgeAbiJson from '../contracts/abi/Koinos-Bridge.json'

const koinosBridgeAbi: Abi = {
  koilib_types: koinosBridgeAbiJson.types,
  ...koinosBridgeAbiJson
}

const koinosProvider = new Provider('https://harbinger-api.koinos.io')

interface Chain {
  id: string;
  bridgeAddress: string;
}

export const chains: Record<string, Chain> = {
  'koinos': {
    id: 'koinos',
    bridgeAddress: '17XHjr7n2E4auykiHkfJMLGGovvaCadtQS'
  },
  'ethereum': {
    id: 'ethereum',
    bridgeAddress: '0x47940D3089Da6DC306678109c834718AEF23A201'
  }
}

interface Asset {
  id: string;
  symbol: string;
  name: string;
  ethereumAddress: string;
  koinosAddress: string;
  ethDecimals: number
  koinosDecimals: number
}

export const assets: Record<string, Asset> = {
  'koin': {
    id: 'koin',
    symbol: 'tKOIN',
    name: 'Koin',
    koinosDecimals: 8,
    ethDecimals: 8,
    ethereumAddress: '0xeA756978B2D8754b0f92CAc325880aa13AF38f88',
    koinosAddress: '19JntSm8pSNETT9aHTwAUHC5RMoaSmgZPJ'
  },
  'weth': {
    id: 'weth',
    symbol: 'wETH',
    name: 'Wrapped Ether',
    ethDecimals: 18,
    koinosDecimals: 8,
    ethereumAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    koinosAddress: '1KazZFUnZSLjeXq2QrifdnYqiBvA7RVF3G'
  }
}

export interface State {
  chainFrom: Chain
  chainTo: Chain
  asset: Asset
  amount: string
  formattedAmount: string
  recipient?: string
  ethereumTokenBalance?: string
  koinosTokenBalance?: string
  koinosTokenContract: Contract
  koinosBridgeContract: Contract
  transactionId: string | undefined
  koinosProvider: Provider
}

const initialState: State = {
  chainFrom: chains['koinos'],
  chainTo: chains['ethereum'],
  asset: assets['koin'],
  amount: '0',
  formattedAmount: '0',
  recipient: '',
  ethereumTokenBalance: '0',
  koinosTokenBalance: '0',
  koinosTokenContract: new Contract({
    id: assets['koin'].koinosAddress,
    abi: utils.tokenAbi,
    provider: koinosProvider,
  }),
  koinosBridgeContract: new Contract({
    id: assets['koin'].koinosAddress,
    abi: koinosBridgeAbi,
    provider: koinosProvider,
  }),
  transactionId: '',
  koinosProvider: koinosProvider
}

export default function Home() {
  const [state, setState] = useState(initialState)

  console.log('test')

  return (
    <Box minHeight="100vh">
      <Nav />
      <Flex paddingLeft='100' paddingRight='100' marginTop='10' marginBottom='10' flexDirection='column'>
        <Wallets state={state} setState={setState} />
        <br />
        <Chains state={state} setState={setState} />
        <br />
        <Assets state={state} setState={setState} />
        <br />
        <Amount state={state} setState={setState} />
        <br />
        <Recipient state={state} setState={setState} />
        <br />
        <InitiateTransfer state={state} setState={setState} />
        <br />
        <CompleteTransfer state={state} setState={setState} />
      </Flex>
    </Box>
  )
}
