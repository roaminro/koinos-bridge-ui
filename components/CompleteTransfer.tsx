import { Dispatch, SetStateAction } from 'react'
import { Box, Button, FormControl, FormLabel, Input, Link, NumberInput, NumberInputField, Switch, Text, useToast } from '@chakra-ui/react'
import axios, { AxiosError } from 'axios'
import * as kondor from 'kondor-js'

import koinosBridgeAbiJson from '../contracts/abi/Koinos-Bridge.json'

import { useAccount as useKoinosAccount } from '../context/AccountProvider'

import { chains, State } from '../pages'
import Section from './Section'
import { Signer, Contract } from 'koilib'
import { Abi } from 'koilib/lib/interface'

interface CompleteTransferProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

const koinosBridgeAbi: Abi = {
  koilib_types: koinosBridgeAbiJson.types,
  ...koinosBridgeAbiJson
}

export default function CompleteTransfer({ state, setState }: CompleteTransferProps) {

  const toast = useToast()
  const { account: koinosAddress } = useKoinosAccount()


  const koinosSigner = koinosAddress ? kondor.getSigner(koinosAddress) as Signer : undefined

  const koinosBridgeContract = new Contract({
    id: chains['koinos'].bridgeAddress,
    abi: koinosBridgeAbi,
    provider: state.koinosProvider,
    signer: koinosSigner,
  })
  
  const handleTransactionIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      transactionId: event.target.value
    })
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
            })

            const { receipt, transaction: finalTransacaction } = await state.koinosProvider.sendTransaction(transaction!)

            console.log(receipt)
            await finalTransacaction.wait()

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
    setState({ ...state, isCompletingTransfer: false })
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
          <Button disabled={state.isCompletingTransfer} onClick={completeTransfer}>
            {state.isCompletingTransfer ? 'Completing transfer...' : 'Complete transfer'}
          </Button>
        </Section>
  )
}