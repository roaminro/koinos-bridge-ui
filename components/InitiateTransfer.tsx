import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { Box, Button, Link } from '@chakra-ui/react'
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from 'wagmi'
import { ethers } from 'ethers'

import { chains, State } from '../pages'
import Section from './Section'
import useDebounce from '../hooks/useDebounce'
import { useAccount as useKoinosAccount } from '../context/AccountProvider'

import ethereumBridgeAbi from '../contracts/abi/Ethereum-Bridge.json'

interface InitiateTransferProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

export default function InitiateTransfer({ state, setState }: InitiateTransferProps) {
  const { account: koinosAddress } = useKoinosAccount()

  const [koinosTransferIsLoading, setKoinosTransferIsLoading] = useState(false)
  const [koinosTransferIsSuccess, setKoinosTransferIsSuccess] = useState(false)

  const debouncedEthereumAddress = useDebounce(state.asset.ethereumAddress, 500)
  const debouncedFormattedAmount = useDebounce(state.formattedAmount, 500)
  const debouncedRecipient = useDebounce(state.recipient, 500)

  const { config: ethTransferTokensConfig, error: ethPrepareTransferTokensError } = usePrepareContractWrite({
    address: chains['ethereum'].bridgeAddress,
    abi: ethereumBridgeAbi.abi,
    functionName: 'transferTokens',
    args: [debouncedEthereumAddress, debouncedFormattedAmount, debouncedRecipient],
    enabled: state.chainFrom.id === 'ethereum' && !!debouncedRecipient && !!debouncedEthereumAddress && Number(debouncedFormattedAmount) > 0,
  })

  let showApproveERC20Button = false
  if (ethPrepareTransferTokensError) {
    // @ts-ignore 'reason' here exists on the error object
    if (ethPrepareTransferTokensError.reason?.includes('execution reverted: ERC20: transfer amount exceeds allowance')) {
      showApproveERC20Button = true
    }
  }

  const { data: ethTransferTokensData, write: ethTransferTokens, error: ethTransferTokensError } = useContractWrite(ethTransferTokensConfig)

  if (ethTransferTokensError) {
    console.error('transferTokensError', ethTransferTokensError)
  }

  useEffect(() => {
    if (ethTransferTokensData?.hash) {
      setState((state) => ({
        ...state,
        transactionId: ethTransferTokensData?.hash
      }))
    }
  }, [ethTransferTokensData?.hash, setState])

  const { isLoading: ethTransferIsLoading, isSuccess: ethTransferIsSuccess, error: ethTansactionError } = useWaitForTransaction({
    hash: ethTransferTokensData?.hash
  })

  if (ethTansactionError) {
    console.error('ethTansactionError', ethTansactionError)
  }

  const initiateTransfer = async () => {
    setKoinosTransferIsSuccess(false)
    if (state.chainFrom.id === 'ethereum') {
      ethTransferTokens?.()
    } else if (state.chainFrom.id === 'koinos') {
      setKoinosTransferIsLoading(true)
      try {
        const { transaction } = await state.koinosBridgeContract.functions.transfer_tokens({
          from: koinosAddress,
          token: state.asset.koinosAddress,
          amount: state.formattedAmount,
          recipient: state.recipient
        }, {
          sendTransaction: false
        })
  
        const { receipt, transaction: finalTransaction } = await state.koinosProvider.sendTransaction(transaction!)
        setState({
          ...state,
          transactionId: finalTransaction.id
        })
        console.log(receipt)
        await finalTransaction.wait()

        setKoinosTransferIsSuccess(true)
      } catch (error) {
        console.error(error)
      }
      setKoinosTransferIsLoading(false)
    }
  }

  const { config: approveTransferTokensConfig, error: preprateApproveTransferTokensError } = usePrepareContractWrite({
    address: state.asset.ethereumAddress,
    abi: [
      {
        'inputs': [
          {
            'internalType': 'address',
            'name': 'spender',
            'type': 'address'
          },
          {
            'internalType': 'uint256',
            'name': 'amount',
            'type': 'uint256'
          }
        ],
        'name': 'approve',
        'outputs': [
          {
            'internalType': 'bool',
            'name': '',
            'type': 'bool'
          }
        ],
        'stateMutability': 'nonpayable',
        'type': 'function'
      }
    ],
    functionName: 'approve',
    //@ts-ignore 'bridgeAddress' is in the correct format
    args: [chains['ethereum'].bridgeAddress, ethers.constants.MaxUint256],
    enabled: state.chainFrom.id === 'ethereum' && showApproveERC20Button,
  })

  if (preprateApproveTransferTokensError) {
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

  const approveTokenTransferClick = () => {
    if (state.chainFrom.id === 'ethereum') {
      approveTransferToken?.()
    }
  }

  return (
    <Section heading="6. Initiate transfer">
      {showApproveERC20Button && (
        <Button disabled={approveTransferTokenLoading} onClick={approveTokenTransferClick}>
          {approveTransferTokenLoading ? 'Approving token transfer...' : 'Approve token transfer'}
        </Button>
      )}
      <Button disabled={!!ethPrepareTransferTokensError || ethTransferIsLoading || showApproveERC20Button || koinosTransferIsLoading} onClick={initiateTransfer}>
        {ethTransferIsLoading || koinosTransferIsLoading ? 'Initiating transfer...' : 'Initiate transfer'}
      </Button>
      {ethTransferIsSuccess && (
        <Box>
          Successfully initiated the transfer. It will take at least 15 block confirmations for the validators to process it.
          <Box>
            <Link href={`https://goerli.etherscan.io/tx/${state.transactionId}`} isExternal>See transaction status on Etherscan</Link>
          </Box>
        </Box>
      )}
      {koinosTransferIsSuccess && (
        <Box>
          Successfully initiated the transfer. It will take at least 60 blocks for the validators to process it.
          <Box>
            <Link href={`https://koinosblocks.com/tx/${state.transactionId}`} isExternal>See transaction status on Koinosblocks</Link>
          </Box>
        </Box>
      )}
    </Section>
  )
}