import { Dispatch, SetStateAction, useState } from 'react'
import { Box, Button, Link, useToast } from '@chakra-ui/react'
import { useAccount as useEthereumAccount, useContract, useSigner } from 'wagmi'
import { ethers } from 'ethers'

import { chains, State } from '../pages'
import Section from './Section'
import { useAccount as useKoinosAccount } from '../context/AccountProvider'

import ethereumBridgeAbi from '../contracts/abi/Ethereum-Bridge.json'

interface InitiateTransferProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

export default function InitiateTransfer({ state, setState }: InitiateTransferProps) {
  const { address: ethereumAddress } = useEthereumAccount()
  const { account: koinosAddress } = useKoinosAccount()
  const toast = useToast()

  const [showApproveERC20Button, setShowApproveERC20Button] = useState(false)
  const [approveEthTransferIsLoading, setApproveEthTransferIsLoading] = useState(false)
  const [transferIsLoading, setTransferIsLoading] = useState(false)
  const [transferIsSuccess, setTransferIsSuccess] = useState(false)

  const { data: ethSigner } = useSigner()

  const ethBridgeContract = useContract({
    address: chains['ethereum'].bridgeAddress,
    abi: ethereumBridgeAbi.abi,
    signerOrProvider: ethSigner
  })

  const ethTokenContract = useContract({
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
      },
      {
        'inputs': [
          {
            'internalType': 'address',
            'name': 'owner',
            'type': 'address'
          },
          {
            'internalType': 'address',
            'name': 'spender',
            'type': 'address'
          }
        ],
        'name': 'allowance',
        'outputs': [
          {
            'internalType': 'uint256',
            'name': '',
            'type': 'uint256'
          }
        ],
        'stateMutability': 'view',
        'type': 'function'
      },
    ],
    signerOrProvider: ethSigner
  })

  const initiateTransfer = async () => {
    setTransferIsSuccess(false)
    setShowApproveERC20Button(false)
    setTransferIsLoading(true)
    if (state.chainFrom.id === 'ethereum') {
      try {

        const allowance = await ethTokenContract!.allowance(
          //@ts-ignore ethereumAddress is a valid format
          ethereumAddress,
          chains['ethereum'].bridgeAddress
        )

        if (allowance.isZero() || allowance.lt(state.formattedAmount)) {
          setShowApproveERC20Button(true)
          toast({
            title: 'Failed to initiate transfer',
            description: 'You need to approve the transfer first',
            status: 'error',
            isClosable: true,
          })
        } else {
          const tx = await ethBridgeContract!.transferTokens(
            state.asset.ethereumAddress,
            state.formattedAmount,
            state.recipient
          )

          await tx.wait()
          console.log(tx)
          setState({
            ...state,
            transactionId: tx.hash
          })
          setTransferIsSuccess(true)
        }
      } catch (error) {
        console.error(error)
        toast({
          title: 'An error occured',
          description: (error as Error).message,
          status: 'error',
          isClosable: true,
        })
      }
    } else if (state.chainFrom.id === 'koinos') {
      try {
        const transaction = await new Promise(async (resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Please check that you have Kondor installed in this browser and try again.'))
          }, 15000)

          try {
            const { transaction } = await state.koinosBridgeContract.functions.transfer_tokens({
              from: koinosAddress,
              token: state.asset.koinosAddress,
              amount: state.formattedAmount,
              recipient: state.recipient
            }, {
              sendTransaction: false
            })

            clearTimeout(timeout)
            resolve(transaction)
          } catch (error) {
            clearTimeout(timeout)
            reject(error)
          }
        })

        const { receipt, transaction: finalTransaction } = await state.koinosProvider.sendTransaction(transaction!)
        setState({
          ...state,
          transactionId: finalTransaction.id
        })
        console.log(receipt)
        await finalTransaction.wait()

        setTransferIsSuccess(true)

        toast({
          title: 'Transfer initiated',
          description: 'Your transfer was successfully initiated!',
          status: 'success',
          isClosable: true,
        })
      } catch (error) {
        console.error(error)
        toast({
          title: 'An error occured',
          description: (error as Error).message,
          status: 'error',
          isClosable: true,
        })
      }
    }
    setTransferIsLoading(false)
  }

  const approveTokenTransfer = async () => {
    if (state.chainFrom.id === 'ethereum') {
      setApproveEthTransferIsLoading(true)
      try {
        const tx = await ethTokenContract!.approve(
          // @ts-ignore bridgeAddress is the correct format
          chains['ethereum'].bridgeAddress,
          ethers.constants.MaxUint256
        )

        await tx.wait()
        console.log(tx)
        setShowApproveERC20Button(false)
      } catch (error) {
        console.error(error)
        toast({
          title: 'An error occured',
          description: (error as Error).message,
          status: 'error',
          isClosable: true,
        })
      }
      setApproveEthTransferIsLoading(false)
    }
  }

  let canInitiateTransfer = parseFloat(state.amount) !== 0
  if (canInitiateTransfer && state.chainFrom.id === 'koinos') {
    canInitiateTransfer = parseFloat(state.koinosTokenBalance!) >= parseFloat(state.amount)
  } else if (canInitiateTransfer && state.chainFrom.id === 'ethereum') {
    canInitiateTransfer = parseFloat(state.ethereumTokenBalance!) >= parseFloat(state.amount)
  }

  return (
    <Section heading="6. Initiate the transfer">
      {showApproveERC20Button && (
        <Button disabled={approveEthTransferIsLoading} onClick={approveTokenTransfer}>
          {approveEthTransferIsLoading ? 'Approving token transfer...' : 'Approve token transfer'}
        </Button>
      )}
      <Button disabled={!canInitiateTransfer || transferIsLoading || showApproveERC20Button} onClick={initiateTransfer}>
        {transferIsLoading ? 'Initiating transfer...' : 'Initiate transfer'}
      </Button>
      {transferIsSuccess && state.chainFrom.id === 'ethereum' && (
        <Box>
          Successfully initiated the transfer. It will take at least 15 block confirmations for the validators to process it.
          <Box>
            <Link href={`https://goerli.etherscan.io/tx/${state.transactionId}`} isExternal>See transaction status on Etherscan</Link>
          </Box>
        </Box>
      )}
      {transferIsSuccess && state.chainFrom.id === 'koinos' && (
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