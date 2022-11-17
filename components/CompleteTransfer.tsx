import { Dispatch, SetStateAction, useState } from 'react'
import { Box, Button, FormControl, FormLabel, Input, Link, useToast } from '@chakra-ui/react'
import axios, { AxiosError } from 'axios'

import { State } from '../pages'
import Section from './Section'

interface CompleteTransferProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

export default function CompleteTransfer({ state, setState }: CompleteTransferProps) {
  const [koinosIsCompletingTransfer, setKoinosIsCompletingTransfer] = useState(false)

  const toast = useToast()  
  const handleTransactionIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      transactionId: event.target.value
    })
  }

  const completeTransfer = async () => {
    setKoinosIsCompletingTransfer(true)
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
          {state.transactionId && (
            <Box>
              <Link href={`https://goerli.etherscan.io/tx/${state.transactionId}`} isExternal>See transaction status on Etherscan</Link>
            </Box>
          )}
          <br />
          <Button disabled={koinosIsCompletingTransfer} onClick={completeTransfer}>
            {koinosIsCompletingTransfer ? 'Completing transfer...' : 'Complete transfer'}
          </Button>
        </Section>
  )
}