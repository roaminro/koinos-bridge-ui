import { Dispatch, SetStateAction, useEffect } from 'react'
import { Box, Button, Link } from '@chakra-ui/react'
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from 'wagmi'
import { ethers } from 'ethers'

import { chains, State } from '../pages'
import Section from './Section'
import useDebounce from '../hooks/useDebounce'

import ethereumBridgeAbi from '../contracts/abi/Ethereum-Bridge.json'


interface InitiateTransferProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

export default function InitiateTransfer({ state, setState }: InitiateTransferProps) {

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

  useEffect(() => {
    if (transferTokenData?.hash) {
      setState((state) => ({
        ...state,
        transactionId: transferTokenData?.hash
      }))
    }
  }, [transferTokenData?.hash, setState])

  const { isLoading, isSuccess, error: ethTansactionError } = useWaitForTransaction({
    hash: transferTokenData?.hash
  })

  if (ethTansactionError) {
    console.error('ethTansactionError', ethTansactionError)
  }

  const initiateTransfer = () => {
    if (state.chainFrom.id === 'ethereum') {
      write?.()
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

  return (
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
  )
}