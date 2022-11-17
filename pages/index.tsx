import { Box, Button, Flex, FormControl, FormLabel, Input, Link, NumberInput, NumberInputField, Select, Switch, Text, useToast } from '@chakra-ui/react'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useContractRead, useAccount as useEthereumAccount, usePrepareContractWrite, useContractWrite, useWaitForTransaction } from 'wagmi';
import { utils, Contract, Provider, Signer } from 'koilib';
import * as kondor from "kondor-js";
import { Abi } from "koilib/lib/interface";
import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { ethers } from 'ethers';
import Nav from '../components/Nav'
import Section from '../components/Section'
import WalletConnector from "../components/KondorConnector";
import { useAccount as useKoinosAccount } from "../context/AccountProvider";

import ethereumBridgeAbi from '../contracts/abi/Ethereum-Bridge.json';
import koinosBridgeAbiJson from '../contracts/abi/Koinos-Bridge.json';

const koinosBridgeAbi: Abi = {
  koilib_types: koinosBridgeAbiJson.types,
  ...koinosBridgeAbiJson
};

import useDebounce from '../hooks/useDebounce';
import { BigNumber } from 'ethers';

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
  ethDecimals: number
  koinosDecimals: number
}

const assets: Record<string, Asset> = {
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

interface State {
  chainFrom: Chain
  chainTo: Chain
  asset: Asset
  amount: string
  formattedAmount: string
  recipient: string | undefined
  ethereumTokenBalance: string | undefined
  koinosTokenBalance: string | undefined
  koinosTokenContract: Contract
  overrideRecipient: boolean
  transactionId: string | undefined
  isCompletingTransfer: boolean,
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
  overrideRecipient: false,
  transactionId: '',
  isCompletingTransfer: false,
}

export default function Home() {
  const [state, setState] = useState(initialState)
  const toast = useToast();

  const { address: ethereumAddress } = useEthereumAccount();
  const { account: koinosAddress } = useKoinosAccount();

  const koinosSigner = koinosAddress ? kondor.getSigner(koinosAddress) as Signer : undefined;

  const koinosBridgeContract = new Contract({
    id: chains['koinos'].bridgeAddress,
    abi: koinosBridgeAbi,
    provider: koinosProvider,
    signer: koinosSigner,
  })


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
      koinosTokenBalance: '0',
      ethereumTokenBalance: '0',
      amount: '0',
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

  const handleTransactionIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      transactionId: event.target.value
    })
  }

  const handleAmountChange = (amount: string, _: number): void => {
    setState({ ...state, amount })
  }

  useEffect(() => {
    setState((state) => {
      let formattedAmount = '0'

      if (state.chainFrom.id === 'koinos') {
        formattedAmount = utils.parseUnits(state.amount, state.asset.koinosDecimals)
      } else if (state.chainFrom.id === 'ethereum') {
        formattedAmount = utils.parseUnits(state.amount, state.asset.ethDecimals)
      }
      console.log('formattedAmount', formattedAmount)

      return {
        ...state,
        formattedAmount
      }
    })
  }, [state.amount])

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
        ethereumTokenBalance: utils.formatUnits(ethTokenBalanceData.toString(), state.asset.ethDecimals)
      }))
    }

  }, [ethTokenBalanceData])

  useEffect(() => {
    if (koinosAddress) {
      const getBalance = async (owner: string) => {
        const { result: balanceOfResult } = await state.koinosTokenContract.functions.balanceOf<{ value: string }>({
          owner
        })

        return utils.formatUnits(balanceOfResult?.value!, state.asset.koinosDecimals)
      }

      getBalance(koinosAddress)
        .then(balance => {
          setState((state) => ({
            ...state,
            koinosTokenBalance: balance
          }))
        })
    }

  }, [koinosAddress, state.koinosTokenContract.functions, state.asset.koinosDecimals])

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

  const debouncedAssetEthereumAddress = useDebounce(state.asset.ethereumAddress, 500)
  const debouncedFormattedAmount = useDebounce(state.formattedAmount, 500)
  const debouncedRecipient = useDebounce(state.recipient, 500)

  const { config: transferTokensConfig, error: prepareTransferTokenError } = usePrepareContractWrite({
    address: chains['ethereum'].bridgeAddress,
    abi: ethereumBridgeAbi.abi,
    functionName: 'transferTokens',
    args: [debouncedAssetEthereumAddress, debouncedFormattedAmount, debouncedRecipient],
    enabled: !!debouncedRecipient && !!debouncedAssetEthereumAddress && Number(debouncedFormattedAmount) > 0,
  })

  let showApproveERC20Button = false
  if (prepareTransferTokenError) {
    // @ts-ignore 'reason' here exists on the error object
    if (prepareTransferTokenError.reason?.includes('execution reverted: ERC20: transfer amount exceeds allowance')) {
      showApproveERC20Button = true
    }
  }

  const { data: transferTokenData, write, error: transferTokensError } = useContractWrite(transferTokensConfig)

  if (transferTokensError) {
    console.error('transferTokensError', transferTokensError)
  }

  const { isLoading, isSuccess, error: ethTansactionError } = useWaitForTransaction({
    hash: transferTokenData?.hash
  })

  if (ethTansactionError) {
    console.error('ethTansactionError', ethTansactionError)
  }

  useEffect(() => {
    if (transferTokenData?.hash) {
      setState((state) => ({
        ...state,
        transactionId: transferTokenData?.hash
      }))
    }
  }, [transferTokenData?.hash])

  const initiateTransfer = () => {
    if (state.chainFrom.id === 'ethereum') {
      write?.()
    }
  }

  const completeTransfer = async () => {
    setState({ ...state, isCompletingTransfer: true })
    if (state.transactionId) {
      const url = state.chainFrom.id === 'koinos' ?
        `https://roamin-projects.duckdns.org/api/GetKoinosTransaction?TransactionId=${state.transactionId}`
        :
        `https://roamin-projects.duckdns.org/api/GetEthereumTransaction?TransactionId=${state.transactionId}`

      try {
        const result = await axios.get(url)
        console.log(result.data)

        if (result.data.status === 'signed') {
          if (state.chainFrom.id === 'ethereum') {
            const { transaction } = await koinosBridgeContract.functions.complete_transfer({
              transactionId: result.data.id,
              token: result.data.koinosToken,
              recipient: result.data.recipient,
              value: result.data.amount,
              expiration: result.data.expiration,
              signatures: result.data.signatures
            }, {
              sendTransaction: false
            });

            const { receipt, transaction: finalTransacaction } = await koinosProvider.sendTransaction(transaction!)

            console.log(receipt)
            await finalTransacaction.wait()

            toast({
              title: 'Transfer completed',
              description: 'Your transfer was successfully completed!',
              status: "success",
              isClosable: true,
            });
          }
        } else if (result.data.status === 'completed') {
          toast({
            title: 'Transfer completed',
            description: 'Your transfer has already been successfully completed!',
            status: "success",
            isClosable: true,
          });
        }
      } catch (error) {
        if ((error as AxiosError).response?.data === 'transaction does not exist') {
          toast({
            title: 'Failed to retrieve the status of the transaction',
            description: 'Transaction has not yet been processed by the validators, please try again in a few minutes',
            status: "warning",
            isClosable: true,
          });
        } else {
          console.error(error)
        }
      }
    }
    setState({ ...state, isCompletingTransfer: false })
  }

  const { config: approveTransferTokensConfig, error: preprateApproveTransferTokensError } = usePrepareContractWrite({
    address: state.asset.ethereumAddress,
    abi: [
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "approve",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ],
    functionName: 'approve',
    //@ts-ignore 'bridgeAddress' is in the correct format
    args: [chains['ethereum'].bridgeAddress, ethers.constants.MaxUint256],
    enabled: showApproveERC20Button,
  })

  if(preprateApproveTransferTokensError) {
    console.error('preprateApproveTransferTokensError', preprateApproveTransferTokensError)
  }

  const { data: approveTransferTokenData, write: approveTransferToken, error: approveTransferTokensError } = useContractWrite(approveTransferTokensConfig)

  if (approveTransferTokensError) {
    console.error('approveTransferTokensError', approveTransferTokensError)
  }

  const { isLoading: approveTransferTokenLoading, isSuccess: isApproveTransferTokenSuccess, error: ethApproveTransferTokensTansactionError } = useWaitForTransaction({
    hash: approveTransferTokenData?.hash
  })

  if (ethApproveTransferTokensTansactionError) {
    console.error('ethApproveTransferTokensTansactionError', ethApproveTransferTokensTansactionError)
  }

  if (showApproveERC20Button && isApproveTransferTokenSuccess) {
    showApproveERC20Button = false
  }

  const approveTokenTransfer = () => {
    if (state.chainFrom.id === 'ethereum') {
      approveTransferToken?.()
    }
  }

  console.log('test')

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
                onChange={handleAmountChange}
                precision={8}
                min={0}
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
        <br />
        <Section heading="6. Initiate transfer">
          {showApproveERC20Button && (
            <Button disabled={approveTransferTokenLoading} onClick={approveTokenTransfer}>
              {approveTransferTokenLoading ? 'Approving token transfer...' : 'Approve token transfer'}
            </Button>
          )}
          <Button disabled={!write || isLoading || showApproveERC20Button} onClick={initiateTransfer}>
            {isLoading ? 'Initiating transfer...' : 'Initiate transfer'}
          </Button>
          {isSuccess && (
            <Box>
              Successfully initiated the transfer. It will take at least 15 block confirmations for the validators to process it.
              <Box>
                <Link href={`https://goerli.etherscan.io/tx/${state.transactionId}`} isExternal>See transaction status on Etherscan</Link>
              </Box>
            </Box>
          )}
        </Section>
        <Section heading="7. Complete transfer">
          <Box>
            <FormControl>
              <FormLabel htmlFor='transaction-id'>Transaction Id:</FormLabel>
              <Input
                id='transaction-id'
                value={state.transactionId}
                size="lg"
                onChange={handleTransactionIdChange}
              />
            </FormControl>
          </Box>
          {state.transactionId && (
            <Box>
              <Link href={`https://goerli.etherscan.io/tx/${state.transactionId}`} isExternal>See transaction status on Etherscan</Link>
            </Box>
          )}
          <Button disabled={state.isCompletingTransfer} onClick={completeTransfer}>
            {state.isCompletingTransfer ? 'Completing transfer...' : 'Complete transfer'}
          </Button>
        </Section>
      </Flex>
    </Box>
  )
}
