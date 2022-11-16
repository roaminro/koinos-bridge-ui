import { Box, Flex, FormControl, FormLabel, Input, NumberInput, NumberInputField, Select, Text } from '@chakra-ui/react'
import Nav from '../components/Nav'
import Section from '../components/Section'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useContractRead, useAccount } from 'wagmi';
import WalletConnector from "../components/KondorConnector";
import { useState } from 'react';
import ethereumBridgeAbi from '../contracts/abi/Ethereum-Bridge.json';

const ETHEREUM_BRIDGE_ADDR = '0x47940D3089Da6DC306678109c834718AEF23A201';

interface Chain {
  id: string;
  bridgeAddress: string;
}

const chains: Record<string, Chain> = {
  'koinos': {
    id: 'koinos',
    bridgeAddress: 'asd'
  },
  'ethereum': {
    id: 'ethereum',
    bridgeAddress: 'asd'
  }
}

interface Asset {
  id: string;
  symbol: string;
  ethereumAddress: string;
  koinosAddress: string;
}

const assets: Record<string, Asset> = {
  'koin': {
    id: 'koin',
    symbol: 'tKOIN',
    ethereumAddress: '0xeA756978B2D8754b0f92CAc325880aa13AF38f88',
    koinosAddress: 'asd'
  },
  'weth': {
    id: 'weth',
    symbol: 'wETH',
    ethereumAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    koinosAddress: 'asd'
  }
}

interface State {
  chainFrom: Chain
  chainTo: Chain
  asset: Asset
  amount: string
}

const initialState: State = {
  chainFrom: chains['koinos'],
  chainTo: chains['ethereum'],
  asset: assets['koin'],
  amount: '0'
}

export default function Home() {
  const [state, setState] = useState(initialState)
  const { address } = useAccount();

  console.log(state)

  const handleChainFromChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    switch (event.target.value) {
      case 'koinos': {
        setState({ ...state, chainFrom: chains['koinos'], chainTo: chains['ethereum'] })
        break;
      }
      case 'ethereum': {
        setState({ ...state, chainFrom: chains['ethereum'], chainTo: chains['koinos'] })
        break;
      }
      default:
        break;
    }
  }

  const handleAssetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setState({ ...state, asset: assets[event.target.value] })
  }

  const { data: ethTokenBalance } = useContractRead({
    address: state.asset.ethereumAddress,
    abi: [
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          }
        ],
        "name": "balanceOf",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
    ],
    args: address ? [address] : undefined,
    functionName: 'balanceOf',
    enabled: !!address
  })

  console.log(ethTokenBalance?.toString())

  const onAmountChange = (amount: string, _: number): void => {
    setState({ ...state, amount })
  }

  return (
    <Box minHeight="100vh">
      <Nav />
      <Flex paddingLeft='100' paddingRight='100' marginTop='10' marginBottom='10' flexDirection='column'>
        <Section heading="1. Connect your wallets">
          Ethereum Wallet: <ConnectButton />
          <br />
          Koinos Wallet: <br /><WalletConnector />
        </Section>
        <br />
        <Section heading="2. Transfer from">
          <FormControl>
            <FormLabel>Chain:</FormLabel>
            <Select
              value={state.chainFrom.id}
              onChange={handleChainFromChange}
            >
              <option value="koinos">Koinos</option>
              <option value="ethereum">Ethereum</option>
            </Select>
          </FormControl>
        </Section>
        <br />
        <Section heading="3. Select the asset to transfer">
          <Box>
            <FormControl>
              <FormLabel>Asset:</FormLabel>
              <Select
                value={state.asset.id}
                onChange={handleAssetChange}
              >
                <option value="koin" >Koin (tKOIN)</option>
                <option value="weth">Wrapped Ether (wETH)</option>
              </Select>
            </FormControl>
          </Box>
        </Section>
        <br />
        <Section heading="4. Enter the amount to transfer">
          <Box>
            <FormControl>
              <FormLabel>Amount:</FormLabel>
              <NumberInput
                value={state.amount}
                onChange={onAmountChange}
                precision={8}
                min={0}
                max={ethTokenBalance ? parseInt(ethTokenBalance.toString()) : 0}
                size="lg"
              >
                <NumberInputField autoFocus />
              </NumberInput>
            </FormControl>
            <br />
            <Text>Ethereum Balance: {ethTokenBalance?.toString()} {state.asset.symbol}</Text>
            <Text>Koinos Balance: { } {state.asset.symbol}</Text>
          </Box>
        </Section>
      </Flex>
    </Box>
  )
}
