import { Dispatch, SetStateAction, useState } from 'react'
import { Box, Button, FormControl, FormLabel, Input, Link, useToast } from '@chakra-ui/react'
import axios, { AxiosError, AxiosResponse } from 'axios'
import { useContract, useSigner } from 'wagmi'

import { chains, State } from '../pages'
import Section from './Section'

import ethereumBridgeAbi from '../contracts/abi/Ethereum-Bridge.json'

interface CompleteTransferProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

interface GetBlocksById {
  block_items: [{
      receipt: {
        transaction_receipts: [{
            id: string,
            events: [{
              sequence: number,
              name: string
            }]
          }]
      }
    }]
}

export default function CompleteTransfer({ state, setState }: CompleteTransferProps) {
  const [koinosIsCompletingTransfer, setKoinosIsCompletingTransfer] = useState(false)

  const toast = useToast()

  const { data: ethSigner } = useSigner()

  const ethBridgeContract = useContract({
    address: chains['ethereum'].bridgeAddress,
    abi: ethereumBridgeAbi.abi,
    signerOrProvider: ethSigner
  })

  const handleTransactionIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      transactionId: event.target.value
    })
  }

  const getKoinosOpId = async () => {
    const { transactions: [transaction] } = await state.koinosProvider.getTransactionsById([state.transactionId!])

    const result = await state.koinosProvider.call<GetBlocksById>('block_store.get_blocks_by_id', {
      block_ids: [transaction.containing_blocks[0]],
      return_block: false,
      return_receipt: true,
    })

    for (const receipt of result.block_items[0].receipt.transaction_receipts) {
      if (receipt.id === state.transactionId) {
        for (const event of receipt.events) {
          if (event.name === 'bridge.tokens_locked_event') {
            return `${event.sequence}`
          }
        }
      }
    }

    return ''
  }

  const checkApi = async (): Promise<AxiosResponse<any, any>> => {
    let url

    if (state.chainFrom.id === 'koinos') {
      const opId = await getKoinosOpId()
      url = `https://roamin-projects.duckdns.org/api/GetKoinosTransaction?TransactionId=${state.transactionId}&OpId=${opId}`
    } else {
      url = `https://roamin-projects.duckdns.org/api/GetEthereumTransaction?TransactionId=${state.transactionId}`
    }

    const result = await axios.get(url)

    return result
  }

  const completeTransfer = async () => {
    setKoinosIsCompletingTransfer(true)
    if (state.transactionId) {

      try {
        const result = await checkApi()
        console.log(result.data)

        if (result.data.status === 'signed') {
          if (state.chainFrom.id === 'ethereum') {
            const { transaction } = await state.koinosBridgeContract.functions.complete_transfer({
              transactionId: result.data.id,
              token: result.data.koinosToken,
              recipient: result.data.recipient,
              value: result.data.amount,
              expiration: result.data.expiration,
              signatures: result.data.signatures
            }, {
              sendTransaction: false
            })

            const { receipt, transaction: finalTransaction } = await state.koinosProvider.sendTransaction(transaction!)

            console.log(receipt)
            await finalTransaction.wait()

            toast({
              title: 'Transfer completed',
              description: 'Your transfer was successfully completed!',
              status: 'success',
              isClosable: true,
            })
          } else if (state.chainFrom.id === 'koinos') {
            const tx = await ethBridgeContract!.completeTransfer(
              result.data.id,
              result.data.opId,
              result.data.ethToken,
              result.data.recipient,
              result.data.amount,
              result.data.signatures,
              result.data.expiration
            )

            await tx.wait()
            console.log(tx)
            toast({
              title: 'Transfer completed',
              description: 'Your transfer was successfully completed!',
              status: 'success',
              isClosable: true,
            })
          }
        } else if (result.data.status === 'completed') {
          toast({
            title: 'Transfer completed',
            description: 'Your transfer has already been successfully completed!',
            status: 'success',
            isClosable: true,
          })
        }
      } catch (error) {
        if ((error as AxiosError).response?.data === 'transaction does not exist') {
          toast({
            title: 'Failed to retrieve the status of the transaction',
            description: 'Transaction has not yet been processed by the validators, please try again in a few minutes',
            status: 'warning',
            isClosable: true,
          })
        } else {
          console.error(error)
        }
      }
    }
    setKoinosIsCompletingTransfer(false)
  }

  return (
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
      {state.transactionId && state.chainFrom.id === 'ethereum' && (
        <Box>
          <Link href={`https://goerli.etherscan.io/tx/${state.transactionId}`} isExternal>See transaction status on Etherscan</Link>
        </Box>
      )}
      {state.transactionId && state.chainFrom.id === 'koinos' && (
        <Box>
          <Link href={`https://koinosblocks.com/tx/${state.transactionId}`} isExternal>See transaction status on Koinosblocks</Link>
        </Box>
      )}
      <br />
      <Button disabled={koinosIsCompletingTransfer} onClick={completeTransfer}>
        {koinosIsCompletingTransfer ? 'Completing transfer...' : 'Complete transfer'}
      </Button>
    </Section>
  )
}