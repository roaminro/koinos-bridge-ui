import { Box, Flex, FormControl, FormLabel, Input, NumberInput, NumberInputField, Select, Switch, Text } from '@chakra-ui/react'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useContractRead, useAccount as useEthereumAccount } from 'wagmi';
import { utils, Contract, Provider } from 'koilib';
import { useState, useEffect } from 'react';
import Nav from '../components/Nav'
import Section from '../components/Section'
import WalletConnector from "../components/KondorConnector";
import { useAccount as useKoinosAccount } from "../context/AccountProvider";

import ethereumBridgeAbi from '../contracts/abi/Ethereum-Bridge.json';

const koinosProvider = new Provider('https://harbinger-api.koinos.io');

interface Chain {
  id: string;
  bridgeAddress: string;
}

const chains: Record<string, Chain> = {
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
}

const assets: Record<string, Asset> = {
  'koin': {
    id: 'koin',
    symbol: 'tKOIN',
    name: 'Koin',
    ethereumAddress: '0xeA756978B2D8754b0f92CAc325880aa13AF38f88',
    koinosAddress: '19JntSm8pSNETT9aHTwAUHC5RMoaSmgZPJ'
  },
  'weth': {
    id: 'weth',
    symbol: 'wETH',
    name: 'Wrapped Ether',
    ethereumAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    koinosAddress: '1KazZFUnZSLjeXq2QrifdnYqiBvA7RVF3G'
  }
}

interface State {
  chainFrom: Chain
  chainTo: Chain
  asset: Asset
  amount: string
  recipient: string | undefined
  ethereumTokenBalance: string | undefined
  koinosTokenBalance: string | undefined
  koinosTokenContract: Contract
  overrideRecipient: boolean
}

const initialState: State = {
  chainFrom: chains['koinos'],
  chainTo: chains['ethereum'],
  asset: assets['koin'],
  amount: '0',
  recipient: '',
  ethereumTokenBalance: undefined,
  koinosTokenBalance: undefined,
  koinosTokenContract: new Contract({
    id: assets['koin'].koinosAddress,
    abi: utils.tokenAbi,
    provider: koinosProvider,
  }),
  overrideRecipient: false
}

export default function Home() {
  const [state, setState] = useState(initialState)
  const { address: ethereumAddress } = useEthereumAccount();
  const { account: koinosAddress } = useKoinosAccount();

  const handleChainFromChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    switch (event.target.value) {
      case 'koinos': {
        setState({
          ...state,
          chainFrom: chains['koinos'],
          chainTo: chains['ethereum'],
          recipient: ethereumAddress
        })
        break;
      }
      case 'ethereum': {
        setState({
          ...state,
          chainFrom: chains['ethereum'],
          chainTo: chains['koinos'],
          recipient: koinosAddress
        })
        break;
      }
      default:
        break;
    }
  }

  const handleAssetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setState({
      ...state,
      asset: assets[event.target.value],
      koinosTokenBalance: '',
      ethereumTokenBalance: '',
      koinosTokenContract: new Contract({
        id: assets[event.target.value].koinosAddress,
        abi: utils.tokenAbi,
        provider: koinosProvider,
      })
    })
  }

  const handleOverrideRecipientChange = (_: React.ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      overrideRecipient: !state.overrideRecipient
    })
  }

  const handleRecipientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      recipient: event.target.value
    })
  }

  const { data: ethTokenBalanceData } = useContractRead({
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
    args: ethereumAddress ? [ethereumAddress] : undefined,
    functionName: 'balanceOf',
    enabled: !!ethereumAddress
  })

  useEffect(() => {
    if (ethTokenBalanceData) {
      setState((state) => ({
        ...state,
        ethereumTokenBalance: utils.formatUnits(ethTokenBalanceData.toString(), 8)
      }))
    }

  }, [ethTokenBalanceData])

  useEffect(() => {
    if (koinosAddress) {
      const getBalance = async (owner: string) => {
        const { result: balanceOfResult } = await state.koinosTokenContract.functions.balanceOf<{ value: string }>({
          owner
        })
    
        return utils.formatUnits(balanceOfResult?.value!, 8)
      }

      getBalance(koinosAddress)
        .then(balance => {
          setState((state) => ({
            ...state,
            koinosTokenBalance: balance
          }))
        })
    }

  }, [koinosAddress, state.koinosTokenContract.functions])

  useEffect(() => {
    setState((state) => {
      if (state.chainFrom.id === 'koinos') {
        return {
          ...state,
          recipient: ethereumAddress
        }
      } else if (state.chainFrom.id === 'ethereum') {
        return {
          ...state,
          recipient: koinosAddress
        }
      }

      return state
    })
  }, [ethereumAddress, koinosAddress])

  const onAmountChange = (amount: string, _: number): void => {
    setState({ ...state, amount })
  }

  console.log('test')

  let maxAmount = 0;

  if (state.chainFrom.id === 'koinos') {
    maxAmount = state.koinosTokenBalance ? parseInt(state.koinosTokenBalance) : 0
  } else if (state.chainFrom.id === 'ethereum') {
    maxAmount = state.ethereumTokenBalance ? parseInt(state.ethereumTokenBalance) : 0
  }

  return (
    <Box minHeight="100vh">
      <Nav />
      <Flex paddingLeft='100' paddingRight='100' marginTop='10' marginBottom='10' flexDirection='column'>
        <Section heading="1. Connect your wallets">
          Ethereum Wallet:
          <ConnectButton />
          <br />
          Koinos Wallet:
          <br />
          <WalletConnector />
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
                {
                  Object.keys(assets).map((key) => (
                    <option key={key} value={key} >{assets[key].name} ({assets[key].symbol})</option>
                  ))
                }
              </Select>
            </FormControl>
          </Box>
        </Section>
        <br />
        <Section heading="4. Enter the amount to transfer">
          <Box>
            <FormControl>
              <FormLabel htmlFor='amount'>Amount:</FormLabel>
              <NumberInput
                id='amount'
                value={state.amount}
                onChange={onAmountChange}
                precision={8}
                min={0}
                max={maxAmount}
                size="lg"
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <br />
            <Text>Ethereum Balance: {state.ethereumTokenBalance} {state.asset.symbol}</Text>
            <Text>Koinos Balance: {state.koinosTokenBalance} {state.asset.symbol}</Text>
          </Box>
        </Section>
        <br />
        <Section heading="5. Enter the recipient">
          <Box>
            <FormControl>
              <FormLabel htmlFor='recipient'>Recipient:</FormLabel>
              <Input
                id='recipient'
                value={state.recipient}
                size="lg"
                disabled={!state.overrideRecipient}
                onChange={handleRecipientChange}
              />
            </FormControl>
            <FormControl display='flex' alignItems='center'>
              <FormLabel htmlFor='override-recipient' mb='0'>
                Override recipient
              </FormLabel>
              <Switch
                id='override-recipient'
                checked={state.overrideRecipient}
                onChange={handleOverrideRecipientChange}
              />
            </FormControl>
          </Box>
        </Section>
      </Flex>
    </Box>
  )
}
